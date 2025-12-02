/**
 * Модуль для работы со страницей профиля
 * Загрузка данных пользователя и его объявлений
 */

/**
 * Инициализация страницы профиля
 */
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('userDisplayName')) {
        loadUserProfile();
        loadMyListings();
    }
});

/**
 * Загрузка данных профиля пользователя
 */
async function loadUserProfile() {
    try {
        const currentUser = getCurrentUser();
        
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Заполнение информации о пользователе
        const displayNameEl = document.getElementById('userDisplayName');
        if (displayNameEl) {
            displayNameEl.textContent = currentUser.displayName || currentUser.username || 'Пользователь';
        }

        const usernameEl = document.getElementById('userUsername');
        if (usernameEl) {
            usernameEl.textContent = `@${currentUser.username}`;
        }

        const emailEl = document.getElementById('userEmail');
        if (emailEl) {
            emailEl.textContent = currentUser.email || '';
        }

        const roleEl = document.getElementById('userRole');
        if (roleEl) {
            const roleNames = {
                'user': 'Пользователь',
                'moderator': 'Модератор',
                'admin': 'Администратор'
            };
            roleEl.textContent = roleNames[currentUser.role] || currentUser.role;
        }

        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl) {
            const placeholderAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'150\' height=\'150\'%3E%3Ccircle cx=\'75\' cy=\'75\' r=\'75\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'48\'%3E?%3C/text%3E%3C/svg%3E';
            avatarEl.src = currentUser.avatarUrl || placeholderAvatar;
            avatarEl.onerror = function() {
                this.src = placeholderAvatar;
            };
        }
        
        // Настройка загрузки аватарки
        setupAvatarUpload();

        // Заполнение формы редактирования
        const displayNameInput = document.getElementById('displayName');
        if (displayNameInput) {
            displayNameInput.value = currentUser.displayName || '';
        }

        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.value = currentUser.phone || '';
        }

        const avatarUrlInput = document.getElementById('avatarUrl');
        if (avatarUrlInput) {
            avatarUrlInput.value = currentUser.avatarUrl || '';
        }

        // Загрузка статистики
        loadProfileStats();

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
    }
}

/**
 * Загрузка объявлений пользователя
 */
async function loadMyListings() {
    const container = document.getElementById('myListingsContainer');
    
    if (!container) return;

    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        container.innerHTML = '<div class="loading">Загрузка объявлений...</div>';

        // Загрузка всех объявлений пользователя (всех статусов)
        // Убеждаемся, что userId - это число
        const userId = parseInt(currentUser.userId);
        if (isNaN(userId)) {
            console.error('Некорректный userId:', currentUser.userId);
            container.innerHTML = '<div class="error-message">Ошибка: некорректный ID пользователя</div>';
            return;
        }
        
        console.log('Запрос объявлений пользователя:', userId);
        const response = await apiGet('/listings', {
            userId: userId,
            page: 1,
            limit: 100 // Загружаем все объявления пользователя
        });

        const listings = response.listings || [];
        
        if (listings.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #7f8c8d;">
                    <p style="font-size: 1.2rem; margin-bottom: 1rem;">У вас пока нет объявлений</p>
                    <p>Создайте первое объявление, нажав кнопку "Создать объявление"</p>
                </div>
            `;
            return;
        }

        // Отображение объявлений
        displayMyListings(listings);

    } catch (error) {
        console.error('Ошибка при загрузке объявлений:', error);
        container.innerHTML = `
            <div class="error-message">
                Не удалось загрузить объявления: ${error.data?.error || error.message}
                <button class="btn btn-primary" onclick="loadMyListings()" style="margin-top: 1rem;">
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

/**
 * Отображение объявлений пользователя
 */
function displayMyListings(listings) {
    const container = document.getElementById('myListingsContainer');
    
    if (!container) return;

    container.innerHTML = listings.map(listing => createMyListingCard(listing)).join('');

    // Добавление обработчиков
    listings.forEach(listing => {
        const card = document.querySelector(`[data-listing-id="${listing.listingId}"]`);
        if (card) {
            // Клик по карточке - переход к объявлению
            const titleLink = card.querySelector('.listing-title-link');
            if (titleLink) {
                titleLink.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `listing.html?id=${listing.listingId}`;
                });
            }

            // Кнопка редактирования
            const editBtn = card.querySelector('.edit-listing-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    editListing(listing.listingId);
                });
            }

            // Кнопка удаления
            const deleteBtn = card.querySelector('.delete-listing-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteListing(listing.listingId);
                });
            }
        }
    });
}

/**
 * Создание карточки объявления для страницы "Мои объявления"
 */
function createMyListingCard(listing) {
    const car = listing.car || {};
    const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\'%3E%3Crect fill=\'%23f0f0f0\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'18\'%3EФото отсутствует%3C/text%3E%3C/svg%3E';
    const mainImage = listing.images && listing.images.length > 0
        ? listing.images[0].imageUrl || listing.images[0]
        : placeholderImage;

    const statusInfo = getStatusInfo(listing.status);
    const formattedDate = listing.createdAt 
        ? new Date(listing.createdAt).toLocaleDateString('ru-RU')
        : '';

    return `
        <div class="listing-card my-listing-card" data-listing-id="${listing.listingId}">
            <div class="listing-status-badge ${statusInfo.class}">
                ${statusInfo.icon} ${statusInfo.text}
            </div>
            <div class="listing-image-wrapper">
                <img src="${mainImage}" alt="${escapeHtml(listing.title)}" class="listing-image" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\'%3E%3Crect fill=\'%23f0f0f0\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'18\'%3EФото отсутствует%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="listing-content">
                <h3 class="listing-title">
                    <a href="listing.html?id=${listing.listingId}" class="listing-title-link">
                        ${escapeHtml(listing.title)}
                    </a>
                </h3>
                <div class="listing-price">${formatPrice(listing.price)} ${listing.currency || 'EUR'}</div>
                <div class="listing-info">
                    <span>${escapeHtml(car.make || '')} ${escapeHtml(car.model || '')} ${car.year || ''}</span>
                    ${car.mileage ? `<span>${formatMileage(car.mileage)} км</span>` : ''}
                </div>
                <div class="listing-meta">
                    <span>📅 ${formattedDate}</span>
                    <span>👁 ${listing.views || 0} просмотров</span>
                </div>
                <div class="listing-actions">
                    <a href="listing.html?id=${listing.listingId}" class="btn btn-outline btn-small">Просмотр</a>
                    ${listing.status === 'pending' || listing.status === 'rejected' || listing.status === 'published' 
                        ? `<button class="btn btn-outline btn-small edit-listing-btn">Редактировать</button>` 
                        : ''}
                    <button class="btn btn-outline btn-small delete-listing-btn" style="color: #e74c3c;">Удалить</button>
                </div>
                ${listing.rejectionReason ? `
                    <div class="rejection-reason" style="margin-top: 0.5rem; padding: 0.5rem; background: #fee; border-left: 3px solid #e74c3c; border-radius: 4px;">
                        <strong>Причина отклонения:</strong> ${escapeHtml(listing.rejectionReason)}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Настройка загрузки аватарки
 */
function setupAvatarUpload() {
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarInput = document.createElement('input');
    avatarInput.type = 'file';
    avatarInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
    avatarInput.style.display = 'none';
    document.body.appendChild(avatarInput);
    
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => {
            avatarInput.click();
        });
    }
    
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Проверка размера файла (максимум 5 МБ)
        if (file.size > 5 * 1024 * 1024) {
            alert('Размер файла не должен превышать 5 МБ');
            return;
        }
        
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }
        
        try {
            changeAvatarBtn.disabled = true;
            changeAvatarBtn.textContent = 'Загрузка...';
            
            const uploadFunc = typeof window !== 'undefined' ? window.uploadAvatar : null;
            if (!uploadFunc) {
                throw new Error('Функция загрузки аватара не найдена');
            }
            
            const response = await uploadFunc(file);
            
            // Обновляем аватар на странице
            const avatarEl = document.getElementById('userAvatar');
            if (avatarEl && response.user && response.user.avatarUrl) {
                avatarEl.src = response.user.avatarUrl;
            }
            
            // Обновляем поле URL аватара в форме
            const avatarUrlInput = document.getElementById('avatarUrl');
            if (avatarUrlInput && response.user && response.user.avatarUrl) {
                avatarUrlInput.value = response.user.avatarUrl;
            }
            
            alert('Аватар успешно обновлен!');
            
        } catch (error) {
            console.error('Ошибка при загрузке аватара:', error);
            alert('Ошибка при загрузке аватара: ' + (error.message || 'Неизвестная ошибка'));
        } finally {
            changeAvatarBtn.disabled = false;
            changeAvatarBtn.textContent = 'Изменить фото';
            avatarInput.value = ''; // Сбрасываем значение input
        }
    });
}

/**
 * Получение информации о статусе объявления
 */
function getStatusInfo(status) {
    const statusMap = {
        'pending': {
            text: 'На модерации',
            icon: '⏳',
            class: 'status-pending'
        },
        'published': {
            text: 'Опубликовано',
            icon: '✅',
            class: 'status-published'
        },
        'rejected': {
            text: 'Отклонено',
            icon: '❌',
            class: 'status-rejected'
        },
        'sold': {
            text: 'Продано',
            icon: '💰',
            class: 'status-sold'
        },
        'archived': {
            text: 'Архивировано',
            icon: '📦',
            class: 'status-archived'
        }
    };

    return statusMap[status] || {
        text: status,
        icon: '❓',
        class: 'status-unknown'
    };
}

/**
 * Редактирование объявления
 */
async function editListing(listingId) {
    try {
        // Загружаем данные объявления
        const response = await apiGet(`/listings/${listingId}`);
        const listing = response.listing || response;
        
        if (!listing) {
            alert('Объявление не найдено');
            return;
        }
        
        // Проверяем, что пользователь является владельцем
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.userId !== listing.userId) {
            alert('У вас нет прав на редактирование этого объявления');
            return;
        }
        
        // Открываем модальное окно редактирования
        openEditListingModal(listing);
        
    } catch (error) {
        console.error('Ошибка при загрузке объявления для редактирования:', error);
        alert('Не удалось загрузить данные объявления: ' + (error.message || 'Неизвестная ошибка'));
    }
}

/**
 * Открытие модального окна для редактирования объявления
 */
function openEditListingModal(listing) {
    const modal = document.getElementById('createListingModal');
    if (!modal) {
        alert('Модальное окно не найдено');
        return;
    }
    
    // Меняем заголовок
    const modalHeader = modal.querySelector('.modal-header h2');
    if (modalHeader) {
        modalHeader.textContent = 'Редактировать объявление';
    }
    
    // Меняем текст кнопки
    const submitBtn = document.getElementById('submitListingBtn');
    if (submitBtn) {
        submitBtn.textContent = 'Сохранить изменения';
        submitBtn.setAttribute('data-listing-id', listing.listingId);
    }
    
    // Показываем модальное окно СНАЧАЛА, чтобы DOM был готов
    modal.style.display = 'flex';
    
    // Устанавливаем режим редактирования
    modal.setAttribute('data-edit-mode', 'true');
    modal.setAttribute('data-listing-id', listing.listingId);
    
    // Заполняем простые поля (не Choices.js)
    const car = listing.car || {};
    
    if (document.getElementById('createMileage')) {
        document.getElementById('createMileage').value = car.mileage || '';
    }
    if (document.getElementById('createBodyType')) {
        document.getElementById('createBodyType').value = car.bodyType || '';
    }
    if (document.getElementById('createEngineType')) {
        document.getElementById('createEngineType').value = car.engineType || '';
    }
    if (document.getElementById('createTransmission')) {
        document.getElementById('createTransmission').value = car.transmission || '';
    }
    if (document.getElementById('createVin')) {
        document.getElementById('createVin').value = car.vin || '';
    }
    
    // Данные объявления
    if (document.getElementById('createTitle')) {
        document.getElementById('createTitle').value = listing.title || '';
    }
    if (document.getElementById('createPrice')) {
        document.getElementById('createPrice').value = listing.price || '';
    }
    if (document.getElementById('createCurrency')) {
        document.getElementById('createCurrency').value = listing.currency || 'EUR';
    }
    if (document.getElementById('createDescription')) {
        document.getElementById('createDescription').value = listing.description || '';
    }
    
    // Инициализируем Choices.js СНАЧАЛА, чтобы загрузить опции
    // Используем функцию из createListing.js, если она доступна
    if (typeof window !== 'undefined' && window.initCreateListingChoices) {
        // Сбрасываем счетчик попыток
        if (window.initChoicesAttempts !== undefined) {
            window.initChoicesAttempts = 0;
        }
        
        // Ждем, чтобы модальное окно полностью отобразилось
        setTimeout(() => {
            window.initCreateListingChoices();
            // Ждем, пока Choices.js полностью инициализируется и загрузит опции
            // Увеличиваем задержку, чтобы все опции успели загрузиться
            setTimeout(() => {
                // Проверяем, что опции загружены, и устанавливаем значения
                const checkAndSetValues = () => {
                    const makeSelect = document.getElementById('createMake');
                    const yearSelect = document.getElementById('createYear');
                    const colorSelect = document.getElementById('createColor');
                    const regionSelect = document.getElementById('createRegion');
                    
                    // Проверяем, что опции загружены (больше 1 опции = есть данные)
                    const allLoaded = makeSelect && makeSelect.options.length > 1 &&
                                    yearSelect && yearSelect.options.length > 1 &&
                                    colorSelect && colorSelect.options.length > 1 &&
                                    regionSelect && regionSelect.options.length > 1;
                    
                    if (allLoaded) {
                        updateChoicesValues(listing, car);
                    } else {
                        // Если опции еще не загружены, повторяем попытку
                        console.log('Ожидание загрузки опций...');
                        setTimeout(checkAndSetValues, 200);
                    }
                };
                
                checkAndSetValues();
            }, 800);
        }, 300);
    } else {
        // Если функция недоступна, пробуем через большую задержку
        setTimeout(() => {
            updateChoicesValues(listing, car);
        }, 1500);
    }
}

/**
 * Обновление значений в Choices.js для формы редактирования
 */
function updateChoicesValues(listing, car) {
    // Получаем доступ к Choices.js instances из createListing.js
    if (typeof window !== 'undefined') {
        const makeChoice = window.createMakeChoice;
        const modelChoice = window.createModelChoice;
        const yearChoice = window.createYearChoice;
        const colorChoice = window.createColorChoice;
        const regionChoice = window.createRegionChoice;
        const cityChoice = window.createCityChoice;
        
        // Обновляем марку
        if (makeChoice && car.make) {
            try {
                // Убеждаемся, что опции загружены
                const makeSelect = document.getElementById('createMake');
                if (makeSelect && makeSelect.options.length > 1) {
                    makeChoice.setChoiceByValue(car.make);
                    // Обновляем модели после выбора марки (нужно время для обновления списка моделей)
                    setTimeout(() => {
                        if (modelChoice && car.model) {
                            try {
                                const modelSelect = document.getElementById('createModel');
                                // Проверяем, что модели загружены (больше 1 опции, так как первая - placeholder)
                                if (modelSelect && modelSelect.options.length > 1 && !modelSelect.disabled) {
                                    modelChoice.setChoiceByValue(car.model);
                                } else {
                                    // Модели еще не загружены, повторяем попытку
                                    setTimeout(() => {
                                        if (modelChoice && car.model) {
                                            const retryModelSelect = document.getElementById('createModel');
                                            if (retryModelSelect && retryModelSelect.options.length > 1 && !retryModelSelect.disabled) {
                                                modelChoice.setChoiceByValue(car.model);
                                            }
                                        }
                                    }, 400);
                                }
                            } catch (e) {
                                console.warn('Не удалось установить модель:', e);
                            }
                        }
                    }, 400);
                } else {
                    // Марки еще не загружены, повторяем попытку
                    setTimeout(() => updateChoicesValues(listing, car), 300);
                    return;
                }
            } catch (e) {
                console.warn('Не удалось установить марку:', e);
            }
        }
        
        // Обновляем год
        if (yearChoice && car.year) {
            try {
                const yearSelect = document.getElementById('createYear');
                if (yearSelect && yearSelect.options.length > 1) {
                    yearChoice.setChoiceByValue(car.year.toString());
                }
            } catch (e) {
                console.warn('Не удалось установить год:', e);
            }
        }
        
        // Обновляем цвет
        if (colorChoice && car.color) {
            try {
                const colorSelect = document.getElementById('createColor');
                if (colorSelect && colorSelect.options.length > 1) {
                    colorChoice.setChoiceByValue(car.color);
                }
            } catch (e) {
                console.warn('Не удалось установить цвет:', e);
            }
        }
        
        // Обновляем область и город
        if (regionChoice && listing.region) {
            try {
                const regionSelect = document.getElementById('createRegion');
                if (regionSelect && regionSelect.options.length > 1) {
                    regionChoice.setChoiceByValue(listing.region);
                    setTimeout(() => {
                        if (cityChoice && listing.city) {
                            try {
                                const citySelect = document.getElementById('createCity');
                                if (citySelect && citySelect.options.length > 1) {
                                    cityChoice.setChoiceByValue(listing.city);
                                } else {
                                    console.warn('Города еще не загружены, повторная попытка...');
                                    setTimeout(() => {
                                        if (cityChoice && listing.city) {
                                            cityChoice.setChoiceByValue(listing.city);
                                        }
                                    }, 300);
                                }
                            } catch (e) {
                                console.warn('Не удалось установить город:', e);
                            }
                        }
                    }, 300);
                }
            } catch (e) {
                console.warn('Не удалось установить область:', e);
            }
        }
    }
}

// Делаем функции доступными глобально
if (typeof window !== 'undefined') {
    window.editListing = editListing;
    window.openEditListingModal = openEditListingModal;
    window.updateChoicesValues = updateChoicesValues;
}

/**
 * Удаление объявления
 */
async function deleteListing(listingId) {
    if (!confirm('Вы уверены, что хотите удалить это объявление?')) {
        return;
    }

    try {
        await apiDelete(`/listings/${listingId}`);
        alert('Объявление успешно удалено');
        loadMyListings(); // Перезагрузка списка
    } catch (error) {
        console.error('Ошибка при удалении объявления:', error);
        alert(error.data?.error || error.message || 'Не удалось удалить объявление');
    }
}

/**
 * Загрузка статистики профиля
 */
async function loadProfileStats() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        // Загрузка объявлений для статистики
        const response = await apiGet('/listings', {
            userId: currentUser.userId,
            page: 1,
            limit: 1000
        });

        const listings = response.listings || [];
        
        // Подсчет статистики
        const myListingsCount = listings.length;
        const publishedCount = listings.filter(l => l.status === 'published').length;
        const pendingCount = listings.filter(l => l.status === 'pending').length;

        // Обновление счетчиков
        const myListingsCountEl = document.getElementById('myListingsCount');
        if (myListingsCountEl) {
            myListingsCountEl.textContent = myListingsCount;
        }

        // Загружаем количество избранного
        loadFavoritesCount();

        const messagesCountEl = document.getElementById('messagesCount');
        if (messagesCountEl) {
            messagesCountEl.textContent = '0'; // TODO: Реализовать
        }

        const registrationDateEl = document.getElementById('registrationDate');
        if (registrationDateEl && currentUser.createdAt) {
            const regDate = new Date(currentUser.createdAt);
            registrationDateEl.textContent = regDate.toLocaleDateString('ru-RU');
        }

    } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
    }
}

/**
 * Форматирование цены
 */
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

/**
 * Форматирование пробега
 */
function formatMileage(mileage) {
    return new Intl.NumberFormat('ru-RU').format(mileage);
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

/**
 * Загрузка количества избранных объявлений
 */
async function loadFavoritesCount() {
    const favoritesCountEl = document.getElementById('favoritesCount');
    if (!favoritesCountEl) return;
    
    try {
        const response = await apiGet('/favorites?page=1&limit=1');
        const total = response.pagination?.total || 0;
        favoritesCountEl.textContent = total;
    } catch (error) {
        console.error('Ошибка при загрузке количества избранного:', error);
        favoritesCountEl.textContent = '0';
    }
}

// Делаем функции доступными глобально
if (typeof window !== 'undefined') {
    window.loadMyListings = loadMyListings;
}

