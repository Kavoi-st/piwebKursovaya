/**
 * Модуль для работы с комментариями к объявлениям
 * Загрузка, добавление, удаление комментариев
 */

let currentListingId = null;
let comments = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, находимся ли на странице объявления
    if (document.getElementById('commentsContainer')) {
        // Получаем ID объявления из URL
        const urlParams = new URLSearchParams(window.location.search);
        currentListingId = urlParams.get('id');
        
        if (currentListingId) {
            initComments();
        }
    }
});

/**
 * Инициализация комментариев
 */
async function initComments() {
    await loadComments();
    setupCommentHandlers();
}

/**
 * Загрузка комментариев к объявлению
 */
async function loadComments() {
    const container = document.getElementById('commentsContainer');
    const section = document.getElementById('commentsSection');
    
    if (!container || !currentListingId) return;

    try {
        // Показываем секцию комментариев
        if (section) {
            section.style.display = 'block';
        }

        // Загрузка комментариев
        const response = await apiGet(`/comments/listing/${currentListingId}`);
        
        comments = response.comments || [];
        
        // Отображение комментариев
        displayComments(comments);
        
        // Показ формы добавления комментария (только для авторизованных)
        const commentFormContainer = document.getElementById('commentFormContainer');
        if (commentFormContainer && isAuthenticated()) {
            commentFormContainer.style.display = 'block';
        }

    } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    Не удалось загрузить комментарии: ${error.data?.error || error.message}
                </div>
            `;
        }
    }
}

/**
 * Отображение комментариев
 */
function displayComments(commentsData) {
    const container = document.getElementById('commentsContainer');
    
    if (!container) return;

    if (!commentsData || commentsData.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d; text-align: center; padding: 2rem;">Пока нет комментариев. Будьте первым!</p>';
        return;
    }

    container.innerHTML = commentsData.map(comment => createCommentHTML(comment)).join('');

    // Добавление обработчиков для ответов
    setupReplyHandlers();
}

/**
 * Создание HTML для комментария
 */
function createCommentHTML(comment) {
    const user = comment.user || {};
    const formattedDate = comment.postedAt 
        ? new Date(comment.postedAt).toLocaleString('ru-RU')
        : '';

    const repliesHTML = comment.replies && comment.replies.length > 0
        ? `<div class="comment-replies">
            ${comment.replies.map(reply => createCommentHTML(reply)).join('')}
           </div>`
        : '';

    const currentUser = getCurrentUser();
    const canDelete = currentUser && 
        (currentUser.userId === user.userId || isModerator());

    return `
        <div class="comment-item" data-comment-id="${comment.commentId}">
            <div class="comment-header">
                <div class="comment-author-info">
                    <span class="comment-author">${escapeHtml(user.displayName || user.username || 'Пользователь')}</span>
                    <span class="comment-date">${formattedDate}</span>
                </div>
                ${canDelete ? `
                    <button class="btn btn-small btn-outline delete-comment-btn" 
                            data-comment-id="${comment.commentId}">
                        Удалить
                    </button>
                ` : ''}
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            ${isAuthenticated() && !comment.parentCommentId ? `
                <button class="reply-btn btn btn-small btn-outline" 
                        data-comment-id="${comment.commentId}">
                    Ответить
                </button>
                <div class="reply-form-container" id="replyForm_${comment.commentId}" style="display: none;">
                    <textarea class="reply-input comment-input" 
                              placeholder="Ваш ответ..." 
                              rows="3"></textarea>
                    <div class="reply-form-actions">
                        <button class="btn btn-primary submit-reply-btn" 
                                data-comment-id="${comment.commentId}">
                            Отправить
                        </button>
                        <button class="btn btn-outline cancel-reply-btn">
                            Отмена
                        </button>
                    </div>
                </div>
            ` : ''}
            ${repliesHTML}
        </div>
    `;
}

/**
 * Настройка обработчиков событий
 */
function setupCommentHandlers() {
    // Форма добавления комментария
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', handleAddComment);
    }
}

/**
 * Настройка обработчиков для ответов и удаления
 */
function setupReplyHandlers() {
    // Кнопки "Ответить"
    document.querySelectorAll('.reply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const commentId = e.target.getAttribute('data-comment-id');
            const replyForm = document.getElementById(`replyForm_${commentId}`);
            if (replyForm) {
                replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
            }
        });
    });

    // Кнопки отправки ответа
    document.querySelectorAll('.submit-reply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const commentId = e.target.getAttribute('data-comment-id');
            const replyForm = document.getElementById(`replyForm_${commentId}`);
            const textarea = replyForm.querySelector('.reply-input');
            
            if (textarea && textarea.value.trim()) {
                handleAddComment(e, commentId, textarea.value.trim());
            }
        });
    });

    // Кнопки отмены ответа
    document.querySelectorAll('.cancel-reply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const replyForm = e.target.closest('.reply-form-container');
            if (replyForm) {
                replyForm.style.display = 'none';
                const textarea = replyForm.querySelector('.reply-input');
                if (textarea) textarea.value = '';
            }
        });
    });

    // Кнопки удаления комментария
    document.querySelectorAll('.delete-comment-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const commentId = e.target.getAttribute('data-comment-id');
            if (confirm('Вы уверены, что хотите удалить этот комментарий?')) {
                await handleDeleteComment(commentId);
            }
        });
    });
}

/**
 * Обработка добавления комментария
 */
async function handleAddComment(e, parentCommentId = null, replyText = null) {
    e.preventDefault();

    if (!isAuthenticated()) {
        alert('Для добавления комментария необходимо войти в систему');
        window.location.href = 'login.html';
        return;
    }

    const commentForm = document.getElementById('commentForm');
    let content = replyText;

    // Если это не ответ, получаем из формы
    if (!content && commentForm) {
        const contentInput = document.getElementById('commentContent');
        content = contentInput ? contentInput.value.trim() : '';
    }

    if (!content || content.length === 0) {
        alert('Введите текст комментария');
        return;
    }

    try {
        // Отправка комментария
        await apiPost('/comments', {
            listingId: currentListingId,
            content,
            parentCommentId: parentCommentId || null
        });

        // Очистка формы
        if (commentForm) {
            commentForm.reset();
        }

        // Если это был ответ, скрываем форму ответа
        if (parentCommentId) {
            const replyForm = document.getElementById(`replyForm_${parentCommentId}`);
            if (replyForm) {
                replyForm.style.display = 'none';
                const textarea = replyForm.querySelector('.reply-input');
                if (textarea) textarea.value = '';
            }
        }

        // Перезагрузка комментариев
        await loadComments();

    } catch (error) {
        console.error('Ошибка при добавлении комментария:', error);
        alert(error.data?.error || error.message || 'Не удалось добавить комментарий');
    }
}

/**
 * Обработка удаления комментария
 */
async function handleDeleteComment(commentId) {
    try {
        await apiDelete(`/comments/${commentId}`);
        
        // Перезагрузка комментариев
        await loadComments();

    } catch (error) {
        console.error('Ошибка при удалении комментария:', error);
        alert(error.data?.error || error.message || 'Не удалось удалить комментарий');
    }
}

/**
 * Экранирование HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

