/**
 * Модуль модерации объявлений
 * Проверка ролей, утверждение/отклонение объявлений
 */

let currentModerationPage = 1;
let selectedListings = [];

// Состояние для управления пользователями (только для админа)
let currentUsersPage = 1;
let currentUsersFilters = {};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, находимся ли на странице модерации
    if (document.getElementById('moderationListingsContainer')) {
        // Проверка прав доступа
        if (!checkModerationAccess()) {
            return;
        }
        
        initModeration();
        
        // Инициализация управления модераторами (только для админа)
        if (isAdmin()) {
            initModeratorsManagement();
        }
    }
});

/**
 * Проверка прав доступа к модерации
 */
function checkModerationAccess() {
    if (!isAuthenticated()) {
        alert('Необходима авторизация');
        window.location.href = 'login.html';
        return false;
    }

    if (!isModerator()) {
        alert('У вас нет прав для доступа к модерации');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

/**
 * Инициализация страницы модерации
 */
async function initModeration() {
    await loadModerationStats();
    await loadPendingListings();
    setupModerationHandlers();
    updateAuthUI();
}

/**
 * Загрузка статистики модерации
 */
async function loadModerationStats() {
    try {
        const stats = await apiGet('/moderation/stats', { period: 'today' });

        // Обновление счетчиков
        const pendingCount = document.getElementById('pendingCount');
        const approvedCount = document.getElementById('approvedCount');
        const rejectedCount = document.getElementById('rejectedCount');

        if (pendingCount) {
            pendingCount.textContent = stats.listings?.pending || 0;
        }
        if (approvedCount) {
            approvedCount.textContent = stats.listings?.published || 0;
        }
        if (rejectedCount) {
            rejectedCount.textContent = stats.listings?.rejected || 0;
        }

    } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
    }
}

/**
 * Загрузка списка непроверенных объявлений
 */
async function loadPendingListings() {
    const container = document.getElementById('moderationListingsContainer');
    
    if (!container) return;

    try {
        container.innerHTML = '<div class="loading">Загрузка объявлений...</div>';

        const sortBy = document.getElementById('sortFilter')?.value || 'createdAt';
        const sortOrder = document.getElementById('orderFilter')?.value || 'ASC';

        const listings = await apiGet('/moderation/pending', {
            page: currentModerationPage,
            limit: 20,
            sortBy,
            sortOrder
        });

        displayModerationListings(listings.listings || []);
        updateModerationPagination(listings.pagination);

    } catch (error) {
        console.error('Ошибка при загрузке объявлений:', error);
        container.innerHTML = `
            <div class="error-message">
                Не удалось загрузить объявления: ${error.data?.error || error.message}
                <button class="btn btn-primary" onclick="loadPendingListings()" style="margin-top: 1rem;">
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

/**
 * Отображение списка объявлений в таблице модерации
 */
function displayModerationListings(listings) {
    const container = document.getElementById('moderationListingsContainer');
    
    if (!container) return;

    if (!listings || listings.length === 0) {
        container.innerHTML = '<div class="loading">Нет объявлений на модерации</div>';
        return;
    }

    // Создание таблицы
    let tableHTML = `
        <table class="moderation-table">
            <thead>
                <tr>
                    <th class="checkbox-cell">
                        <input type="checkbox" id="selectAllCheckbox">
                    </th>
                    <th>Объявление</th>
                    <th>Продавец</th>
                    <th>Автомобиль</th>
                    <th>Цена</th>
                    <th>Дата создания</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;

    listings.forEach(listing => {
        const car = listing.car || {};
        const user = listing.user || {};
        const formattedDate = listing.createdAt 
            ? new Date(listing.createdAt).toLocaleString('ru-RU')
            : '';

        tableHTML += `
            <tr>
                <td class="checkbox-cell">
                    <input type="checkbox" class="listing-checkbox" 
                           value="${listing.listingId}" 
                           data-listing-id="${listing.listingId}">
                </td>
                <td>
                    <span class="moderation-listing-title" 
                          onclick="openModerationModal(${listing.listingId})">
                        ${escapeHtml(listing.title)}
                    </span>
                </td>
                <td>${escapeHtml(user.displayName || user.username || 'Неизвестно')}</td>
                <td>${escapeHtml(`${car.make || ''} ${car.model || ''} ${car.year || ''}`.trim())}</td>
                <td>${formatPrice(listing.price)} ${listing.currency || 'EUR'}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="btn btn-primary btn-small" 
                            onclick="openModerationModal(${listing.listingId})">
                        Просмотр
                    </button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;

    // Настройка обработчиков чекбоксов
    setupCheckboxHandlers();
}

/**
 * Настройка обработчиков чекбоксов
 */
function setupCheckboxHandlers() {
    // Чекбокс "Выбрать все"
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const listingCheckboxes = document.querySelectorAll('.listing-checkbox');

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            listingCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            updateSelectedListings();
        });
    }

    // Обработчики для отдельных чекбоксов
    listingCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedListings();
            
            // Обновление состояния "Выбрать все"
            if (selectAllCheckbox) {
                const allChecked = Array.from(listingCheckboxes).every(cb => cb.checked);
                selectAllCheckbox.checked = allChecked;
            }
        });
    });
}

/**
 * Обновление списка выбранных объявлений
 */
function updateSelectedListings() {
    selectedListings = Array.from(document.querySelectorAll('.listing-checkbox:checked'))
        .map(checkbox => parseInt(checkbox.value));

    // Показ/скрытие кнопки массового одобрения
    const batchApproveBtn = document.getElementById('batchApproveBtn');
    if (batchApproveBtn) {
        batchApproveBtn.style.display = selectedListings.length > 0 ? 'block' : 'none';
    }
}

/**
 * Настройка обработчиков событий модерации
 */
function setupModerationHandlers() {
    // Обновление списка
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadModerationStats();
            loadPendingListings();
        });
    }

    // Массовое одобрение
    const batchApproveBtn = document.getElementById('batchApproveBtn');
    if (batchApproveBtn) {
        batchApproveBtn.addEventListener('click', handleBatchApprove);
    }

    // Фильтры сортировки
    const sortFilter = document.getElementById('sortFilter');
    const orderFilter = document.getElementById('orderFilter');

    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            currentModerationPage = 1;
            loadPendingListings();
        });
    }

    if (orderFilter) {
        orderFilter.addEventListener('change', () => {
            currentModerationPage = 1;
            loadPendingListings();
        });
    }

    // Пагинация
    const prevPageBtn = document.getElementById('moderationPrevPage');
    const nextPageBtn = document.getElementById('moderationNextPage');

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentModerationPage > 1) {
                currentModerationPage--;
                loadPendingListings();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            currentModerationPage++;
            loadPendingListings();
        });
    }

    // Модальные окна
    setupModalHandlers();
}

/**
 * Настройка обработчиков модальных окон
 */
function setupModalHandlers() {
    // Закрытие модального окна просмотра
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModerationModal);
    }

    // Закрытие модального окна отклонения
    const closeRejectModalBtn = document.getElementById('closeRejectModalBtn');
    const cancelRejectBtn = document.getElementById('cancelRejectBtn');
    
    if (closeRejectModalBtn) {
        closeRejectModalBtn.addEventListener('click', closeRejectModal);
    }
    if (cancelRejectBtn) {
        cancelRejectBtn.addEventListener('click', closeRejectModal);
    }

    // Форма отклонения
    const rejectForm = document.getElementById('rejectForm');
    if (rejectForm) {
        rejectForm.addEventListener('submit', handleRejectListing);
    }
}

/**
 * Открытие модального окна для просмотра объявления
 */
async function openModerationModal(listingId) {
    const modal = document.getElementById('moderationModal');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody) return;

    try {
        modalBody.innerHTML = '<div class="loading">Загрузка...</div>';
        modal.style.display = 'flex';

        const listing = await apiGet(`/moderation/listing/${listingId}`);

        // Отображение информации об объявлении
        displayListingInModal(listing.listing, listingId);

    } catch (error) {
        console.error('Ошибка при загрузке объявления:', error);
        modalBody.innerHTML = `
            <div class="error-message">
                Не удалось загрузить объявление: ${error.data?.error || error.message}
            </div>
        `;
    }

    // Настройка обработчиков кнопок в модальном окне
    const approveBtn = document.getElementById('modalApproveBtn');
    const rejectBtn = document.getElementById('modalRejectBtn');

    if (approveBtn) {
        approveBtn.onclick = () => handleApproveListing(listingId);
    }

    if (rejectBtn) {
        rejectBtn.onclick = () => openRejectModal(listingId);
    }
}

/**
 * Отображение объявления в модальном окне
 */
function displayListingInModal(listing, listingId) {
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;

    const car = listing.car || {};
    const user = listing.user || {};
    const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\'%3E%3Crect fill=\'%23f0f0f0\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'18\'%3EФото отсутствует%3C/text%3E%3C/svg%3E';
    
    // Получаем все изображения
    const images = listing.images && listing.images.length > 0 ? listing.images : [];
    const mainImage = images.length > 0 ? images[0].imageUrl : placeholderImage;
    
    // Формируем HTML для всех изображений
    let imagesHTML = '';
    if (images.length > 0) {
        // Сохраняем изображения для навигации
        window.currentModerationImages = images.map(img => img.imageUrl);
        
        imagesHTML = `
            <div class="moderation-images-gallery">
                <div class="moderation-main-image">
                    <img id="moderationMainImage" src="${mainImage}" alt="${escapeHtml(listing.title)}" 
                         onerror="this.src='${placeholderImage}'" style="cursor: pointer; width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px;">
                </div>
                ${images.length > 1 ? `
                    <div class="moderation-images-thumbnails">
                        ${images.map((img, index) => `
                            <div class="moderation-thumbnail ${index === 0 ? 'active' : ''}" 
                                 data-image-index="${index}">
                                <img src="${img.imageUrl}" alt="Фото ${index + 1}" 
                                     onerror="this.src='${placeholderImage}'">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        imagesHTML = `
            <div class="moderation-images-gallery">
                <div class="moderation-main-image">
                    <img src="${placeholderImage}" alt="Фото отсутствует" style="width: 100%; max-height: 400px; object-fit: contain;">
                </div>
            </div>
        `;
        window.currentModerationImages = [];
    }

    modalBody.innerHTML = `
        <div class="modal-listing-content">
            <div class="modal-listing-images">
                ${imagesHTML}
            </div>
            <div class="modal-listing-info">
                <h3>${escapeHtml(listing.title)}</h3>
                <div class="modal-price">${formatPrice(listing.price)} ${listing.currency || 'EUR'}</div>
                
                <div class="modal-car-details">
                    <h4>Автомобиль:</h4>
                    <p><strong>Марка:</strong> ${escapeHtml(car.make || 'Не указано')}</p>
                    <p><strong>Модель:</strong> ${escapeHtml(car.model || 'Не указано')}</p>
                    <p><strong>Год:</strong> ${car.year || 'Не указано'}</p>
                    <p><strong>Пробег:</strong> ${car.mileage ? formatMileage(car.mileage) + ' км' : 'Не указано'}</p>
                    ${car.bodyType ? `<p><strong>Тип кузова:</strong> ${escapeHtml(car.bodyType)}</p>` : ''}
                    ${car.engineType ? `<p><strong>Двигатель:</strong> ${escapeHtml(car.engineType)}</p>` : ''}
                    ${car.transmission ? `<p><strong>КПП:</strong> ${escapeHtml(car.transmission)}</p>` : ''}
                </div>

                <div class="modal-description">
                    <h4>Описание:</h4>
                    <p>${escapeHtml(listing.description || 'Описание отсутствует')}</p>
                </div>

                <div class="modal-seller-info">
                    <h4>Продавец:</h4>
                    <p>${escapeHtml(user.displayName || user.username || 'Неизвестно')}</p>
                    <p>${escapeHtml(user.email || '')}</p>
                </div>
            </div>
        </div>
    `;
    
    // Настраиваем обработчики для миниатюр
    setupModerationImageHandlers();
}

/**
 * Выбор изображения в модальном окне модерации
 */
function selectModerationImage(index) {
    if (!window.currentModerationImages || window.currentModerationImages.length === 0) return;
    
    const mainImageEl = document.getElementById('moderationMainImage');
    if (mainImageEl && window.currentModerationImages[index]) {
        mainImageEl.src = window.currentModerationImages[index];
    }
    
    // Обновляем активную миниатюру
    document.querySelectorAll('.moderation-thumbnail').forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

// Настройка обработчиков для миниатюр после отображения модального окна
function setupModerationImageHandlers() {
    document.querySelectorAll('.moderation-thumbnail').forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            selectModerationImage(index);
        });
    });
}

// Делаем функции доступными глобально
if (typeof window !== 'undefined') {
    window.selectModerationImage = selectModerationImage;
}

/**
 * Закрытие модального окна просмотра
 */
function closeModerationModal() {
    const modal = document.getElementById('moderationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Открытие модального окна отклонения
 */
function openRejectModal(listingId) {
    const rejectModal = document.getElementById('rejectModal');
    if (rejectModal) {
        rejectModal.setAttribute('data-listing-id', listingId);
        rejectModal.style.display = 'flex';
        
        // Закрытие модального окна просмотра
        closeModerationModal();
    }
}

/**
 * Закрытие модального окна отклонения
 */
function closeRejectModal() {
    const rejectModal = document.getElementById('rejectModal');
    if (rejectModal) {
        rejectModal.style.display = 'none';
        const form = document.getElementById('rejectForm');
        if (form) {
            form.reset();
        }
    }
}

/**
 * Обработка одобрения объявления
 */
async function handleApproveListing(listingId) {
    if (!confirm('Вы уверены, что хотите одобрить это объявление?')) {
        return;
    }

    try {
        await apiPost(`/moderation/listing/${listingId}/approve`);
        
        alert('Объявление успешно одобрено');
        
        closeModerationModal();
        loadModerationStats();
        loadPendingListings();

    } catch (error) {
        console.error('Ошибка при одобрении объявления:', error);
        alert(error.data?.error || error.message || 'Не удалось одобрить объявление');
    }
}

/**
 * Обработка отклонения объявления
 */
async function handleRejectListing(e) {
    e.preventDefault();

    const rejectModal = document.getElementById('rejectModal');
    const listingId = rejectModal?.getAttribute('data-listing-id');
    const reasonInput = document.getElementById('rejectReason');

    if (!listingId || !reasonInput) return;

    const reason = reasonInput.value.trim();

    if (!reason) {
        alert('Необходимо указать причину отклонения');
        return;
    }

    try {
        await apiPost(`/moderation/listing/${listingId}/reject`, { reason });
        
        alert('Объявление отклонено');
        
        closeRejectModal();
        loadModerationStats();
        loadPendingListings();

    } catch (error) {
        console.error('Ошибка при отклонении объявления:', error);
        alert(error.data?.error || error.message || 'Не удалось отклонить объявление');
    }
}

/**
 * Обработка массового одобрения
 */
async function handleBatchApprove() {
    if (selectedListings.length === 0) {
        alert('Выберите объявления для одобрения');
        return;
    }

    if (!confirm(`Вы уверены, что хотите одобрить ${selectedListings.length} объявлений?`)) {
        return;
    }

    try {
        await apiPost('/moderation/batch/approve', {
            listingIds: selectedListings
        });

        alert(`Успешно одобрено ${selectedListings.length} объявлений`);

        selectedListings = [];
        loadModerationStats();
        loadPendingListings();

    } catch (error) {
        console.error('Ошибка при массовом одобрении:', error);
        alert(error.data?.error || error.message || 'Не удалось одобрить объявления');
    }
}

/**
 * Обновление пагинации модерации
 */
function updateModerationPagination(pagination) {
    const paginationEl = document.getElementById('moderationPagination');
    const pageInfo = document.getElementById('moderationPageInfo');
    const prevBtn = document.getElementById('moderationPrevPage');
    const nextBtn = document.getElementById('moderationNextPage');

    if (!pagination) return;

    if (paginationEl) {
        paginationEl.style.display = pagination.totalPages > 1 ? 'flex' : 'none';
    }

    if (pageInfo) {
        pageInfo.textContent = `Страница ${pagination.page} из ${pagination.totalPages}`;
    }

    if (prevBtn) {
        prevBtn.disabled = pagination.page <= 1;
    }

    if (nextBtn) {
        nextBtn.disabled = pagination.page >= pagination.totalPages;
    }
}

/**
 * Вспомогательные функции
 */
function formatPrice(price) {
    if (!price) return '0';
    return new Intl.NumberFormat('ru-RU').format(price);
}

function formatMileage(mileage) {
    if (!mileage) return '0';
    return new Intl.NumberFormat('ru-RU').format(mileage);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Инициализация управления модераторами (только для админа)
 */
function initModeratorsManagement() {
    // Показываем секцию управления модераторами
    const moderatorsSection = document.getElementById('moderatorsManagementSection');
    if (moderatorsSection) {
        moderatorsSection.style.display = 'block';
    }

    // Загрузка пользователей
    loadUsers();

    // Настройка обработчиков событий
    setupModeratorsManagementHandlers();
}

/**
 * Настройка обработчиков событий для управления модераторами
 */
function setupModeratorsManagementHandlers() {
    // Кнопка обновления
    const refreshUsersBtn = document.getElementById('refreshUsersBtn');
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', () => {
            loadUsers();
        });
    }

    // Кнопка поиска
    const searchUsersBtn = document.getElementById('searchUsersBtn');
    if (searchUsersBtn) {
        searchUsersBtn.addEventListener('click', () => {
            currentUsersPage = 1;
            loadUsers();
        });
    }

    // Поиск по Enter
    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentUsersPage = 1;
                loadUsers();
            }
        });
    }

    // Фильтр по роли
    const userRoleFilter = document.getElementById('userRoleFilter');
    if (userRoleFilter) {
        userRoleFilter.addEventListener('change', () => {
            currentUsersPage = 1;
            loadUsers();
        });
    }

    // Пагинация
    const usersPrevPage = document.getElementById('usersPrevPage');
    const usersNextPage = document.getElementById('usersNextPage');

    if (usersPrevPage) {
        usersPrevPage.addEventListener('click', () => {
            if (currentUsersPage > 1) {
                currentUsersPage--;
                loadUsers();
            }
        });
    }

    if (usersNextPage) {
        usersNextPage.addEventListener('click', () => {
            currentUsersPage++;
            loadUsers();
        });
    }
}

/**
 * Загрузка списка пользователей
 */
async function loadUsers() {
    const container = document.getElementById('usersContainer');
    
    if (!container) return;

    try {
        container.innerHTML = '<div class="loading">Загрузка пользователей...</div>';

        // Получение фильтров
        const searchInput = document.getElementById('userSearchInput');
        const roleFilter = document.getElementById('userRoleFilter');
        
        const search = searchInput?.value.trim() || '';
        const role = roleFilter?.value || '';

        const params = {
            page: currentUsersPage,
            limit: 20
        };

        if (search) {
            params.search = search;
        }

        if (role) {
            params.role = role;
        }

        const response = await apiGet('/moderation/users', params);

        displayUsers(response.users || []);
        updateUsersPagination(response.pagination);

    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        container.innerHTML = `
            <div class="error-message">
                Не удалось загрузить пользователей: ${error.data?.error || error.message}
                <button class="btn btn-primary" onclick="loadUsers()" style="margin-top: 1rem;">
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

/**
 * Отображение списка пользователей
 */
function displayUsers(users) {
    const container = document.getElementById('usersContainer');
    
    if (!container) return;

    if (!users || users.length === 0) {
        container.innerHTML = '<div class="loading">Пользователи не найдены</div>';
        return;
    }

    // Создание таблицы
    let tableHTML = `
        <table class="moderation-table">
            <thead>
                <tr>
                    <th>Имя пользователя</th>
                    <th>Email</th>
                    <th>Отображаемое имя</th>
                    <th>Роль</th>
                    <th>Дата регистрации</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(user => {
        const formattedDate = user.registrationDate 
            ? new Date(user.registrationDate).toLocaleDateString('ru-RU')
            : '';
        
        const roleLabel = {
            'user': 'Пользователь',
            'moderator': 'Модератор',
            'admin': 'Администратор'
        }[user.role] || user.role;

        const roleClass = {
            'user': '',
            'moderator': 'role-moderator',
            'admin': 'role-admin'
        }[user.role] || '';

        tableHTML += `
            <tr>
                <td>${escapeHtml(user.username || '')}</td>
                <td>${escapeHtml(user.email || '')}</td>
                <td>${escapeHtml(user.displayName || '')}</td>
                <td class="${roleClass}">${escapeHtml(roleLabel)}</td>
                <td>${formattedDate}</td>
                <td>
                    ${user.role === 'user' 
                        ? `<button class="btn btn-primary btn-small" onclick="promoteToModerator(${user.userId})">Назначить модератором</button>`
                        : user.role === 'moderator'
                        ? `<button class="btn btn-secondary btn-small" onclick="demoteFromModerator(${user.userId})">Снять с модератора</button>`
                        : '<span class="text-muted">-</span>'
                    }
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

/**
 * Обновление пагинации пользователей
 */
function updateUsersPagination(pagination) {
    const paginationEl = document.getElementById('usersPagination');
    const pageInfo = document.getElementById('usersPageInfo');
    const prevBtn = document.getElementById('usersPrevPage');
    const nextBtn = document.getElementById('usersNextPage');

    if (!pagination) return;

    if (paginationEl) {
        paginationEl.style.display = pagination.totalPages > 1 ? 'flex' : 'none';
    }

    if (pageInfo) {
        pageInfo.textContent = `Страница ${pagination.page} из ${pagination.totalPages}`;
    }

    if (prevBtn) {
        prevBtn.disabled = pagination.page <= 1;
    }

    if (nextBtn) {
        nextBtn.disabled = pagination.page >= pagination.totalPages;
    }
}

/**
 * Назначение пользователя модератором
 */
async function promoteToModerator(userId) {
    if (!confirm('Вы уверены, что хотите назначить этого пользователя модератором?')) {
        return;
    }

    try {
        await apiPost(`/moderation/users/${userId}/promote`);
        
        alert('Пользователь успешно назначен модератором');
        
        loadUsers();

    } catch (error) {
        console.error('Ошибка при назначении модератора:', error);
        alert(error.data?.error || error.message || 'Не удалось назначить модератора');
    }
}

/**
 * Снятие роли модератора
 */
async function demoteFromModerator(userId) {
    if (!confirm('Вы уверены, что хотите снять этого пользователя с роли модератора?')) {
        return;
    }

    try {
        await apiPost(`/moderation/users/${userId}/demote`);
        
        alert('Пользователь успешно снят с роли модератора');
        
        loadUsers();

    } catch (error) {
        console.error('Ошибка при снятии роли модератора:', error);
        alert(error.data?.error || error.message || 'Не удалось снять с роли модератора');
    }
}

