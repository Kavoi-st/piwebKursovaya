/**
 * Модуль для работы с сообщениями
 * Загрузка диалогов, переписки и отправка сообщений
 */

let currentConversationId = null;
let currentInterlocutor = null;
let messagesInterval = null;
let loadConversationsTimeout = null; // Для debounce
let lastMessageId = null; // ID последнего загруженного сообщения
let lastConversationsUpdate = 0; // Время последнего обновления списка диалогов

/**
 * Вспомогательные функции для форматирования времени
 */
function getMinutesText(minutes) {
    if (minutes === 1 || (minutes > 20 && minutes % 10 === 1)) return 'минуту';
    if ((minutes >= 2 && minutes <= 4) || (minutes > 20 && minutes % 10 >= 2 && minutes % 10 <= 4)) return 'минуты';
    return 'минут';
}

function getHoursText(hours) {
    if (hours === 1 || (hours > 20 && hours % 10 === 1)) return 'час';
    if ((hours >= 2 && hours <= 4) || (hours > 20 && hours % 10 >= 2 && hours % 10 <= 4)) return 'часа';
    return 'часов';
}

function getDaysText(days) {
    if (days === 1 || (days > 20 && days % 10 === 1)) return 'день';
    if ((days >= 2 && days <= 4) || (days > 20 && days % 10 >= 2 && days % 10 <= 4)) return 'дня';
    return 'дней';
}

/**
 * Обновление заголовка чата с информацией о собеседнике
 */
function updateChatHeader(interlocutor) {
    const headerAvatar = document.getElementById('chatHeaderAvatar');
    const headerName = document.getElementById('chatHeaderName');
    const headerSubtitle = document.getElementById('chatHeaderSubtitle');

    if (headerAvatar) {
        const placeholderAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'14\'%3E?%3C/text%3E%3C/svg%3E';
        headerAvatar.src = interlocutor.avatarUrl || placeholderAvatar;
        headerAvatar.onerror = function() {
            this.src = placeholderAvatar;
        };
    }

    if (headerName) {
        headerName.textContent = interlocutor.displayName || interlocutor.username || 'Пользователь';
    }

    if (headerSubtitle) {
        // Определяем статус на основе данных собеседника
        if (interlocutor.isOnline) {
            headerSubtitle.textContent = 'Онлайн';
        } else if (interlocutor.lastLogin) {
            // Форматируем время последнего входа
            const lastLogin = new Date(interlocutor.lastLogin);
            const now = new Date();
            const diffMs = now - lastLogin;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) {
                headerSubtitle.textContent = 'Был(а) только что';
            } else if (diffMins < 60) {
                headerSubtitle.textContent = `Был(а) ${diffMins} ${getMinutesText(diffMins)} назад`;
            } else if (diffHours < 24) {
                headerSubtitle.textContent = `Был(a) ${diffHours} ${getHoursText(diffHours)} назад`;
            } else if (diffDays < 7) {
                headerSubtitle.textContent = `Был(а) ${diffDays} ${getDaysText(diffDays)} назад`;
            } else {
                const formattedDate = lastLogin.toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long' 
                });
                headerSubtitle.textContent = `Был(а) ${formattedDate}`;
            }
        } else {
            headerSubtitle.textContent = 'Оффлайн';
        }
    }
}

/**
 * Инициализация страницы сообщений
 */
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('conversationsContainer')) {
        loadConversations();
        setupChatForm();
    }
});

/**
 * Загрузка списка диалогов
 */
async function loadConversations() {
    const container = document.getElementById('conversationsContainer');
    
    if (!container) return;

    try {
        if (!isAuthenticated()) {
            container.innerHTML = `
                <div class="empty-conversations">
                    <p>Для просмотра сообщений необходимо войти в систему</p>
                    <a href="login.html" class="btn btn-primary" style="margin-top: 1rem;">Войти</a>
                </div>
            `;
            return;
        }

        container.innerHTML = '<div class="loading">Загрузка диалогов...</div>';

        const response = await apiGet('/messages/conversations', {
            page: 1,
            limit: 100
        });

        const conversations = response.conversations || [];

        if (conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-conversations">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
                    <h3>Нет диалогов</h3>
                    <p>У вас пока нет сообщений. Начните переписку с продавцом на странице объявления.</p>
                </div>
            `;
            return;
        }

        displayConversations(conversations);

    } catch (error) {
        console.error('Ошибка при загрузке диалогов:', error);
        container.innerHTML = `
            <div class="error-message">
                Не удалось загрузить диалоги: ${error.data?.error || error.message}
                <button class="btn btn-primary" onclick="loadConversations()" style="margin-top: 1rem;">
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

/**
 * Отображение списка диалогов
 */
function displayConversations(conversations) {
    const container = document.getElementById('conversationsContainer');
    
    if (!container) return;

    container.innerHTML = conversations.map(conv => createConversationHTML(conv)).join('');

    // Добавление обработчиков клика
    conversations.forEach(conv => {
        const item = document.querySelector(`[data-conversation-id="${conv.interlocutor.userId}"]`);
        if (item) {
            item.addEventListener('click', () => {
                openConversation(conv.interlocutor);
            });
        }
    });
}

/**
 * Создание HTML для диалога
 */
function createConversationHTML(conversation) {
    const interlocutor = conversation.interlocutor || {};
    const lastMessage = conversation.lastMessage;
    const unreadCount = conversation.unreadCount || 0;

    const avatarUrl = interlocutor.avatarUrl || 'images/placeholder-avatar.jpg';
    const displayName = interlocutor.displayName || interlocutor.username || 'Пользователь';
    
    let preview = 'Нет сообщений';
    let time = '';
    
    if (lastMessage) {
        preview = lastMessage.content || '';
        if (preview.length > 50) {
            preview = preview.substring(0, 50) + '...';
        }
        if (lastMessage.sentAt) {
            const date = new Date(lastMessage.sentAt);
            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) {
                time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            } else if (days === 1) {
                time = 'Вчера';
            } else if (days < 7) {
                time = date.toLocaleDateString('ru-RU', { weekday: 'short' });
            } else {
                time = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            }
        }
    }

    return `
        <div class="conversation-item" data-conversation-id="${interlocutor.userId}">
            <img src="${avatarUrl}" alt="${escapeHtml(displayName)}" class="conversation-avatar" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'14\'%3E?%3C/text%3E%3C/svg%3E'">
            <div class="conversation-info">
                <div class="conversation-name">${escapeHtml(displayName)}</div>
                <div class="conversation-preview">${escapeHtml(preview)}</div>
            </div>
            <div class="conversation-meta">
                ${time ? `<div class="conversation-time">${time}</div>` : ''}
                ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Открытие переписки с пользователем
 */
async function openConversation(interlocutor) {
    currentInterlocutor = interlocutor;
    currentConversationId = interlocutor.userId;

    // Обновление активного диалога
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.getAttribute('data-conversation-id')) === interlocutor.userId) {
            item.classList.add('active');
        }
    });

    // Показываем окно чата
    document.getElementById('emptyChat').style.display = 'none';
    document.getElementById('chatWindow').style.display = 'flex';

    // Обновляем заголовок чата
    updateChatHeader(interlocutor);

    // Сбрасываем ID последнего сообщения при смене диалога
    lastMessageId = null;
    
    // Загружаем сообщения (первая загрузка)
    await loadMessages(interlocutor.userId, true);

    // Начинаем периодическое обновление сообщений
    if (messagesInterval) {
        clearInterval(messagesInterval);
    }
    messagesInterval = setInterval(() => {
        if (currentConversationId) {
            loadMessages(currentConversationId, false); // Обновление без перерисовки
        }
    }, 8000); // Обновление каждые 8 секунд (увеличено для снижения нагрузки)
}

/**
 * Загрузка сообщений переписки
 * @param {number} userId - ID собеседника
 * @param {boolean} isInitialLoad - Первая загрузка или обновление
 */
async function loadMessages(userId, isInitialLoad = false) {
    const messagesContainer = document.getElementById('chatMessages');
    
    if (!messagesContainer) return;

    try {
        const response = await apiGet(`/messages/conversation/${userId}`);
        const messages = response.messages || [];
        
        // Обновляем информацию о собеседнике и статус, если она изменилась
        if (response.interlocutor && currentInterlocutor && currentInterlocutor.userId === response.interlocutor.userId) {
            // Обновляем данные собеседника
            currentInterlocutor = response.interlocutor;
            // Обновляем заголовок чата с актуальным статусом
            updateChatHeader(currentInterlocutor);
        }

        if (isInitialLoad || !lastMessageId) {
            // Первая загрузка - отображаем все сообщения
            displayMessages(messages);
            if (messages.length > 0) {
                lastMessageId = messages[messages.length - 1].messageId;
            }
        } else {
            // Обновление - добавляем только новые сообщения
            const newMessages = messages.filter(msg => msg.messageId > lastMessageId);
            if (newMessages.length > 0) {
                appendNewMessages(newMessages);
                lastMessageId = messages[messages.length - 1].messageId;
                
                // Прокрутка вниз только если пользователь уже внизу
                const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop < messagesContainer.clientHeight + 100;
                if (isNearBottom) {
                    setTimeout(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }, 100);
                }
            }
        }

        // Отмечаем сообщения как прочитанные (только новые)
        const unreadMessages = messages.filter(msg => 
            !msg.isRead && 
            msg.senderId !== getCurrentUser().userId &&
            (!lastMessageId || msg.messageId > lastMessageId)
        );
        for (const msg of unreadMessages) {
            try {
                await apiPut(`/messages/${msg.messageId}/read`);
            } catch (error) {
                console.error('Ошибка при отметке сообщения как прочитанного:', error);
            }
        }

        // Обновляем список диалогов только раз в 30 секунд или при новых сообщениях
        const now = Date.now();
        if (isInitialLoad || (now - lastConversationsUpdate > 30000) || unreadMessages.length > 0) {
            lastConversationsUpdate = now;
            // Используем умное обновление счетчиков вместо полной перерисовки
            if (unreadMessages.length > 0) {
                updateConversationsCounters();
            } else {
                debounceLoadConversations();
            }
        }

    } catch (error) {
        // Игнорируем ошибку 429 при обновлении (не первая загрузка)
        if (error.status === 429 && !isInitialLoad) {
            console.warn('Rate limit при обновлении сообщений, пропускаем');
            return;
        }
        console.error('Ошибка при загрузке сообщений:', error);
        if (isInitialLoad) {
            messagesContainer.innerHTML = `
                <div class="error-message">
                    Не удалось загрузить сообщения: ${error.data?.error || error.message}
                </div>
            `;
        }
    }
}

/**
 * Отображение сообщений (полная перерисовка)
 */
function displayMessages(messages) {
    const container = document.getElementById('chatMessages');
    
    if (!container) return;

    const currentUser = getCurrentUser();
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-chat">
                <p>Начните переписку</p>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => createMessageHTML(msg, currentUser)).join('');
    
    // Прокрутка вниз после загрузки
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

/**
 * Добавление новых сообщений без перерисовки всего списка
 */
function appendNewMessages(newMessages) {
    const container = document.getElementById('chatMessages');
    
    if (!container || newMessages.length === 0) return;

    const currentUser = getCurrentUser();
    const fragment = document.createDocumentFragment();
    
    newMessages.forEach(msg => {
        const messageHTML = createMessageHTML(msg, currentUser);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = messageHTML;
        fragment.appendChild(tempDiv.firstElementChild);
    });
    
    container.appendChild(fragment);
}

/**
 * Создание HTML для сообщения
 */
function createMessageHTML(message, currentUser) {
    const isSent = message.senderId === currentUser.userId;
    const sender = message.sender || {};
    const avatarUrl = sender.avatarUrl || 'images/placeholder-avatar.jpg';
    const displayName = sender.displayName || sender.username || 'Пользователь';

    const date = new Date(message.sentAt);
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    return `
        <div class="message ${isSent ? 'sent' : 'received'}">
            <img src="${avatarUrl}" alt="${escapeHtml(displayName)}" class="message-avatar" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'14\'%3E?%3C/text%3E%3C/svg%3E'">
            <div class="message-content">
                <p class="message-text">${escapeHtml(message.content)}</p>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
}

/**
 * Настройка формы отправки сообщения
 */
function setupChatForm() {
    const form = document.getElementById('chatInputForm');
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');

    if (!form || !input) return;

    // Автоматическое изменение высоты textarea
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentConversationId) {
            alert('Выберите диалог для отправки сообщения');
            return;
        }

        const content = input.value.trim();
        if (!content) return;

        // Блокируем кнопку
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = 'Отправка...';
        }

        try {
            await apiPost('/messages', {
                receiverId: currentConversationId,
                content: content
            });

            // Очищаем поле ввода
            input.value = '';
            input.style.height = 'auto';

            // Перезагружаем сообщения (после отправки - полная перезагрузка для синхронизации)
            lastMessageId = null;
            await loadMessages(currentConversationId, true);

            // Обновляем список диалогов (с debounce)
            lastConversationsUpdate = Date.now();
            debounceLoadConversations();

        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
            alert(error.data?.error || error.message || 'Не удалось отправить сообщение');
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Отправить';
            }
        }
    });
}

/**
 * Открытие переписки с продавцом по объявлению
 * Используется со страницы объявления
 */
async function openConversationWithSeller(sellerId, listingId = null) {
    if (!isAuthenticated()) {
        alert('Для отправки сообщения необходимо войти в систему');
        window.location.href = 'login.html';
        return;
    }

    // Переходим на страницу сообщений
    window.location.href = `messages.html?userId=${sellerId}${listingId ? `&listingId=${listingId}` : ''}`;
}

/**
 * Debounce для loadConversations - предотвращает слишком частые вызовы
 */
function debounceLoadConversations() {
    if (loadConversationsTimeout) {
        clearTimeout(loadConversationsTimeout);
    }
    // Вызываем loadConversations только через 5 секунд после последнего вызова
    loadConversationsTimeout = setTimeout(() => {
        loadConversations();
    }, 5000);
}

/**
 * Умное обновление списка диалогов - обновляет только счетчики непрочитанных
 */
async function updateConversationsCounters() {
    try {
        const response = await apiGet('/messages/conversations', {
            page: 1,
            limit: 100
        });
        const conversations = response.conversations || [];
        
        // Обновляем только счетчики непрочитанных, не перерисовывая весь список
        conversations.forEach(conv => {
            const item = document.querySelector(`[data-conversation-id="${conv.interlocutor.userId}"]`);
            if (item) {
                const unreadBadge = item.querySelector('.unread-badge');
                const unreadCount = conv.unreadCount || 0;
                
                if (unreadCount > 0) {
                    if (!unreadBadge) {
                        const badge = document.createElement('div');
                        badge.className = 'unread-badge';
                        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                        const meta = item.querySelector('.conversation-meta');
                        if (meta) {
                            meta.appendChild(badge);
                        }
                    } else {
                        unreadBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    }
                } else if (unreadBadge) {
                    unreadBadge.remove();
                }
                
                // Обновляем превью последнего сообщения
                const previewEl = item.querySelector('.conversation-preview');
                if (previewEl && conv.lastMessage) {
                    let preview = conv.lastMessage.content || '';
                    if (preview.length > 50) {
                        preview = preview.substring(0, 50) + '...';
                    }
                    previewEl.textContent = preview;
                }
                
                // Обновляем время последнего сообщения
                const timeEl = item.querySelector('.conversation-time');
                if (timeEl && conv.lastMessage && conv.lastMessage.sentAt) {
                    const date = new Date(conv.lastMessage.sentAt);
                    const now = new Date();
                    const diff = now - date;
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    
                    let time = '';
                    if (days === 0) {
                        time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    } else if (days === 1) {
                        time = 'Вчера';
                    } else if (days < 7) {
                        time = date.toLocaleDateString('ru-RU', { weekday: 'short' });
                    } else {
                        time = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                    }
                    timeEl.textContent = time;
                }
            }
        });
    } catch (error) {
        // Игнорируем ошибки при обновлении счетчиков
        if (error.status !== 429) {
            console.error('Ошибка при обновлении счетчиков:', error);
        }
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

// Делаем функции доступными глобально
if (typeof window !== 'undefined') {
    window.openConversationWithSeller = openConversationWithSeller;
    window.loadConversations = loadConversations;
}

// Обработка параметров URL при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    if (userId) {
        // Загружаем информацию о пользователе и открываем переписку
        loadConversations().then(() => {
            // Находим собеседника в списке диалогов
            setTimeout(() => {
                const conversationItem = document.querySelector(`[data-conversation-id="${userId}"]`);
                if (conversationItem) {
                    conversationItem.click();
                } else {
                    // Если диалога нет, получаем информацию о пользователе и открываем переписку
                    apiGet(`/auth/user/${userId}`).then(user => {
                        openConversation({
                            userId: user.userId,
                            username: user.username,
                            displayName: user.displayName,
                            avatarUrl: user.avatarUrl
                        });
                    }).catch(() => {
                        // Если не удалось получить информацию, просто открываем пустую переписку
                        openConversation({ 
                            userId: parseInt(userId), 
                            username: 'Пользователь',
                            displayName: 'Пользователь'
                        });
                    });
                }
            }, 500);
        });
    }
});

// Очистка интервала при уходе со страницы
window.addEventListener('beforeunload', () => {
    if (messagesInterval) {
        clearInterval(messagesInterval);
    }
});

