/**
 * Модуль для работы со страницей детального просмотра объявления
 * Загрузка и отображение информации об объявлении
 */

let currentListing = null;
let currentImageIndex = 0;

/**
 * Инициализация страницы объявления
 */
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, находимся ли на странице объявления
    if (document.getElementById('listingSection')) {
        loadListingDetail();
    }
});

/**
 * Загрузка объявления по ID из URL
 */
async function loadListingDetail() {
    const loadingEl = document.getElementById('loading');
    const listingSection = document.getElementById('listingSection');
    
    // Получаем ID из URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');
    
    if (!listingId) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (listingSection) {
            listingSection.innerHTML = `
                <div class="error-message">
                    Объявление не найдено. ID объявления не указан.
                    <br><br>
                    <a href="index.html" class="btn btn-primary">Вернуться на главную</a>
                </div>
            `;
            listingSection.style.display = 'block';
        }
        return;
    }

    try {
        // Загрузка объявления
        const response = await apiGet(`/listings/${listingId}`);
        currentListing = response.listing || response;
        
        if (!currentListing) {
            throw new Error('Объявление не найдено');
        }

        // Отображение объявления
        displayListing(currentListing);
        
        // Увеличение счетчика просмотров
        incrementViews(listingId);
        
    } catch (error) {
        console.error('Ошибка при загрузке объявления:', error);
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (listingSection) {
            listingSection.innerHTML = `
                <div class="error-message">
                    <h2>Ошибка загрузки объявления</h2>
                    <p>${error.data?.error || error.message || 'Не удалось загрузить объявление'}</p>
                    <br><br>
                    <a href="index.html" class="btn btn-primary">Вернуться на главную</a>
                </div>
            `;
            listingSection.style.display = 'block';
        }
    }
}

/**
 * Отображение объявления на странице
 */
function displayListing(listing) {
    const loadingEl = document.getElementById('loading');
    const listingSection = document.getElementById('listingSection');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (listingSection) listingSection.style.display = 'block';

    const car = listing.car || {};
    const user = listing.user || {};

    // Заголовок
    const titleEl = document.getElementById('listingTitle');
    if (titleEl) titleEl.textContent = listing.title || 'Без названия';

    // Цена (с конвертацией в другие валюты)
    const priceEl = document.getElementById('listingPrice');
    if (priceEl) {
        const currency = listing.currency || 'EUR';
        const price = listing.price || 0;
        
        // Используем функцию отображения цен в разных валютах
        if (typeof displayPriceInMultipleCurrencies === 'function') {
            displayPriceInMultipleCurrencies(price, currency, 'listingPrice');
        } else {
            // Fallback на обычное отображение
            priceEl.textContent = `${formatPrice(price)} ${currency}`;
        }
    }

    // Просмотры и дата
    const viewsEl = document.getElementById('listingViews');
    if (viewsEl) viewsEl.textContent = listing.views || 0;

    const dateEl = document.getElementById('listingDate');
    if (dateEl) {
        const date = listing.createdAt ? new Date(listing.createdAt) : new Date();
        dateEl.textContent = date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Информация об автомобиле
    if (document.getElementById('carMake')) {
        document.getElementById('carMake').textContent = car.make || 'Не указано';
        document.getElementById('carModel').textContent = car.model || 'Не указано';
        document.getElementById('carYear').textContent = car.year || 'Не указано';
        document.getElementById('carMileage').textContent = car.mileage 
            ? `${formatMileage(car.mileage)} км` 
            : 'Не указано';
        document.getElementById('carBodyType').textContent = car.bodyType || 'Не указано';
        document.getElementById('carEngineType').textContent = car.engineType || 'Не указано';
        document.getElementById('carTransmission').textContent = car.transmission || 'Не указано';
        document.getElementById('carColor').textContent = car.color || 'Не указано';
        document.getElementById('carVin').textContent = car.vin || 'Не указано';
    }

    // Описание
    const descEl = document.getElementById('listingDescription');
    if (descEl) {
        descEl.textContent = listing.description || 'Описание не указано';
    }

    // Местоположение
    const locationEl = document.getElementById('listingLocation');
    if (locationEl) {
        const locationParts = [];
        if (listing.city) locationParts.push(listing.city);
        if (listing.region) locationParts.push(listing.region);
        locationEl.textContent = locationParts.length > 0 
            ? locationParts.join(', ') 
            : 'Не указано';
    }

    // Информация о продавце
    const sellerAvatarEl = document.getElementById('sellerAvatar');
    if (sellerAvatarEl) {
        const placeholderAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\'%3E%3Ccircle cx=\'40\' cy=\'40\' r=\'40\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'24\'%3E?%3C/text%3E%3C/svg%3E';
        sellerAvatarEl.src = user.avatarUrl || placeholderAvatar;
        sellerAvatarEl.onerror = function() {
            this.src = placeholderAvatar;
        };
    }

    const sellerNameEl = document.getElementById('sellerName');
    if (sellerNameEl) {
        sellerNameEl.textContent = user.displayName || user.username || 'Продавец';
    }

    const sellerRegEl = document.getElementById('sellerRegistration');
    if (sellerRegEl && user.createdAt) {
        const regDate = new Date(user.createdAt);
        sellerRegEl.textContent = `На сайте с ${regDate.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long'
        })}`;
    }


    // Кнопка проверки av.by (только для физ.лиц с белорусским номером)
    // Теперь объявления отображаются прямо в секции продавца, кнопка не нужна
    const checkAvByBtn = document.getElementById('checkAvByBtn');
    if (checkAvByBtn) {
        // Скрываем кнопку, так как объявления теперь показываются автоматически
        checkAvByBtn.style.display = 'none';
    }

    // Изображения
    displayImages(listing.images || []);

    // Настройка кнопок (с небольшой задержкой, чтобы убедиться, что DOM готов)
    setTimeout(() => {
        setupListingButtons(listing, user);
    }, 100);
}

/**
 * Отображение изображений
 */
function displayImages(images) {
    const mainImageEl = document.getElementById('mainImage');
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    const prevBtn = document.getElementById('prevImageBtn');
    const nextBtn = document.getElementById('nextImageBtn');

    if (!mainImageEl || !thumbnailContainer) return;

    // Если нет изображений, показываем placeholder
    if (!images || images.length === 0) {
        const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'600\'%3E%3Crect fill=\'%23f0f0f0\' width=\'800\' height=\'600\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'24\'%3EФото отсутствует%3C/text%3E%3C/svg%3E';
        mainImageEl.src = placeholderImage;
        mainImageEl.onerror = function() {
            this.src = placeholderImage;
        };
        thumbnailContainer.innerHTML = '';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }

    // Основное изображение
    currentImageIndex = 0;
    updateMainImage(images[0].imageUrl || images[0]);

    // Миниатюры
    const placeholderThumb = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'75\'%3E%3Crect fill=\'%23f0f0f0\' width=\'100\' height=\'75\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'10\'%3E?%3C/text%3E%3C/svg%3E';
    thumbnailContainer.innerHTML = images.map((img, index) => {
        const imageUrl = img.imageUrl || img;
        return `
            <div class="thumbnail ${index === 0 ? 'active' : ''}" 
                 data-index="${index}"
                 onclick="selectImage(${index})">
                <img src="${imageUrl}" alt="Фото ${index + 1}" 
                     onerror="this.src='${placeholderThumb}'">
            </div>
        `;
    }).join('');

    // Кнопки навигации
    if (images.length > 1) {
        if (prevBtn) {
            prevBtn.style.display = 'block';
            prevBtn.onclick = () => {
                currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
                selectImage(currentImageIndex);
            };
        }
        if (nextBtn) {
            nextBtn.style.display = 'block';
            nextBtn.onclick = () => {
                currentImageIndex = (currentImageIndex + 1) % images.length;
                selectImage(currentImageIndex);
            };
        }
    } else {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }
}

/**
 * Обновление основного изображения
 */
function updateMainImage(imageUrl) {
    const mainImageEl = document.getElementById('mainImage');
    if (mainImageEl) {
        const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'600\'%3E%3Crect fill=\'%23f0f0f0\' width=\'800\' height=\'600\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'24\'%3EФото отсутствует%3C/text%3E%3C/svg%3E';
        mainImageEl.src = imageUrl;
        mainImageEl.onerror = function() {
            this.src = placeholderImage;
        };
        
        // Добавляем обработчик клика для открытия в полноэкранном режиме
        mainImageEl.style.cursor = 'pointer';
        mainImageEl.onclick = () => {
            openImageViewer(currentImageIndex);
        };
    }
}

/**
 * Выбор изображения
 */
function selectImage(index) {
    if (!currentListing || !currentListing.images) return;
    
    const images = currentListing.images;
    if (index < 0 || index >= images.length) return;

    currentImageIndex = index;
    const imageUrl = images[index].imageUrl || images[index];
    updateMainImage(imageUrl);

    // Обновление активной миниатюры
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

/**
 * Открытие модального окна для просмотра изображения на весь экран
 */
function openImageViewer(index) {
    if (!currentListing || !currentListing.images || currentListing.images.length === 0) return;
    
    const images = currentListing.images;
    if (index < 0 || index >= images.length) return;
    
    currentImageIndex = index;
    const modal = document.getElementById('imageViewerModal');
    const viewerImage = document.getElementById('viewerImage');
    const counter = document.getElementById('viewerImageCounter');
    
    if (!modal || !viewerImage) return;
    
    const imageUrl = images[index].imageUrl || images[index];
    viewerImage.src = imageUrl;
    
    if (counter) {
        counter.textContent = `${index + 1} / ${images.length}`;
    }
    
    // Показываем/скрываем кнопки навигации
    const prevBtn = document.querySelector('.image-viewer-prev');
    const nextBtn = document.querySelector('.image-viewer-next');
    
    if (prevBtn) prevBtn.style.display = images.length > 1 ? 'block' : 'none';
    if (nextBtn) nextBtn.style.display = images.length > 1 ? 'block' : 'none';
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Блокируем прокрутку фона
}

/**
 * Закрытие модального окна просмотра изображения
 */
function closeImageViewer() {
    const modal = document.getElementById('imageViewerModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Разблокируем прокрутку
    }
}

/**
 * Навигация по изображениям в модальном окне
 */
function navigateImageViewer(direction) {
    if (!currentListing || !currentListing.images) return;
    
    const images = currentListing.images;
    const newIndex = (currentImageIndex + direction + images.length) % images.length;
    openImageViewer(newIndex);
}

// Обработчик закрытия по Escape и навигации стрелками
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('imageViewerModal');
    if (modal && modal.style.display !== 'none') {
        if (e.key === 'Escape') {
            closeImageViewer();
        } else if (e.key === 'ArrowLeft') {
            navigateImageViewer(-1);
        } else if (e.key === 'ArrowRight') {
            navigateImageViewer(1);
        }
    }
});

// Делаем функции доступными глобально
if (typeof window !== 'undefined') {
    window.selectImage = selectImage;
    window.openImageViewer = openImageViewer;
    window.closeImageViewer = closeImageViewer;
    window.navigateImageViewer = navigateImageViewer;
}

/**
 * Настройка кнопок (избранное, пожаловаться, написать продавцу)
 */
function setupListingButtons(listing, seller) {
    const favoriteBtn = document.getElementById('favoriteBtn');
    const reportBtn = document.getElementById('reportBtn');
    const contactSellerBtn = document.getElementById('contactSellerBtn');
    const currentUser = getCurrentUser();

    // Удаляем все старые обработчики
    if (contactSellerBtn) {
        contactSellerBtn.replaceWith(contactSellerBtn.cloneNode(true));
    }
    const newContactSellerBtn = document.getElementById('contactSellerBtn');

    // Кнопка избранного
    if (favoriteBtn && isAuthenticated() && currentUser && seller && currentUser.userId !== seller.userId) {
        favoriteBtn.style.display = 'inline-block';
        
        // Проверяем, добавлено ли в избранное
        checkFavoriteStatus(listing.listingId, favoriteBtn);
        
        // Удаляем старый обработчик
        favoriteBtn.replaceWith(favoriteBtn.cloneNode(true));
        const newFavoriteBtn = document.getElementById('favoriteBtn');
        const favoriteIcon = document.getElementById('favoriteIcon');
        
        newFavoriteBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await toggleFavorite(listing.listingId, newFavoriteBtn, favoriteIcon);
        };
    }

    // Кнопка жалобы
    if (reportBtn && isAuthenticated() && currentUser && seller && currentUser.userId !== seller.userId) {
        reportBtn.style.display = 'inline-block';
        
        // Удаляем старый обработчик
        reportBtn.replaceWith(reportBtn.cloneNode(true));
        const newReportBtn = document.getElementById('reportBtn');
        
        newReportBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openReportModal(listing.listingId);
        };
    }

    // Кнопка связи с продавцом
    if (newContactSellerBtn && isAuthenticated() && currentUser && seller && seller.userId && currentUser.userId !== seller.userId) {
        newContactSellerBtn.style.display = 'block';
        
        // Удаляем все возможные старые обработчики
        newContactSellerBtn.onclick = null;
        
        // Устанавливаем новый обработчик
        newContactSellerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Открытие переписки с продавцом:', seller.userId, 'Объявление:', listing.listingId);
            // Переходим на страницу сообщений с автоматическим открытием переписки
            if (seller.userId) {
                window.location.href = `messages.html?userId=${seller.userId}${listing.listingId ? `&listingId=${listing.listingId}` : ''}`;
            } else {
                console.error('ID продавца не определен');
                alert('Ошибка: не удалось определить продавца');
            }
            return false;
        });
    } else {
        console.log('Кнопка "Написать продавцу" не настроена:', {
            buttonExists: !!newContactSellerBtn,
            isAuthenticated: isAuthenticated(),
            currentUser: !!currentUser,
            seller: !!seller,
            sellerUserId: seller?.userId,
            currentUserId: currentUser?.userId,
            isDifferent: currentUser?.userId !== seller?.userId
        });
    }
}

/**
 * Увеличение счетчика просмотров
 */
async function incrementViews(listingId) {
    try {
        // TODO: Реализовать API endpoint для увеличения просмотров
        // await apiPost(`/listings/${listingId}/view`);
    } catch (error) {
        console.error('Ошибка при увеличении просмотров:', error);
        // Не показываем ошибку пользователю, это некритично
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
 * Проверка статуса избранного для объявления
 */
async function checkFavoriteStatus(listingId, favoriteBtn) {
    if (!isAuthenticated() || !favoriteBtn) return;
    
    try {
        const response = await apiGet(`/favorites/${listingId}/check`);
        const favoriteIcon = document.getElementById('favoriteIcon');
        
        if (response.isFavorite) {
            favoriteBtn.classList.add('favorite-active');
            if (favoriteIcon) favoriteIcon.textContent = '❤️';
            favoriteBtn.innerHTML = '<span id="favoriteIcon">❤️</span> В избранном';
        } else {
            favoriteBtn.classList.remove('favorite-active');
            if (favoriteIcon) favoriteIcon.textContent = '♡';
            favoriteBtn.innerHTML = '<span id="favoriteIcon">♡</span> В избранное';
        }
    } catch (error) {
        console.error('Ошибка при проверке статуса избранного:', error);
    }
}

/**
 * Переключение статуса избранного
 */
async function toggleFavorite(listingId, favoriteBtn, favoriteIcon) {
    if (!isAuthenticated()) {
        alert('Необходимо войти в систему');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await apiPost(`/favorites/${listingId}/toggle`);
        
        if (response.isFavorite) {
            favoriteBtn.classList.add('favorite-active');
            if (favoriteIcon) favoriteIcon.textContent = '❤️';
            favoriteBtn.innerHTML = '<span id="favoriteIcon">❤️</span> В избранном';
            showNotification('Объявление добавлено в избранное', 'success');
        } else {
            favoriteBtn.classList.remove('favorite-active');
            if (favoriteIcon) favoriteIcon.textContent = '♡';
            favoriteBtn.innerHTML = '<span id="favoriteIcon">♡</span> В избранное';
            showNotification('Объявление удалено из избранного', 'info');
        }
    } catch (error) {
        console.error('Ошибка при переключении избранного:', error);
        if (error.message && error.message.includes('401')) {
            alert('Необходимо войти в систему');
            window.location.href = 'login.html';
        } else {
            alert('Ошибка: ' + (error.message || 'Не удалось изменить статус избранного'));
        }
    }
}

/**
 * Показ уведомления
 */
function showNotification(message, type = 'info') {
    // Простое уведомление (можно заменить на более красивое)
    console.log(`${type.toUpperCase()}:`, message);
}

/**
 * Открытие модального окна для жалобы
 */
function openReportModal(listingId) {
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    
    // Сохраняем ID объявления в data-атрибут
    modal.setAttribute('data-listing-id', listingId);
    
    // Сбрасываем форму
    const form = document.getElementById('reportForm');
    if (form) {
        form.reset();
        document.getElementById('otherReasonGroup').style.display = 'none';
    }
    
    // Скрываем сообщения
    const errorMsg = document.getElementById('reportErrorMessage');
    const successMsg = document.getElementById('reportSuccessMessage');
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';
    
    modal.style.display = 'flex';
    
    // Обработчик для чекбокса "Другая причина"
    const otherReasonCheckbox = document.getElementById('otherReasonCheckbox');
    const otherReasonGroup = document.getElementById('otherReasonGroup');
    if (otherReasonCheckbox && otherReasonGroup) {
        otherReasonCheckbox.onchange = function() {
            otherReasonGroup.style.display = this.checked ? 'block' : 'none';
            if (this.checked) {
                document.getElementById('otherReason').required = true;
            } else {
                document.getElementById('otherReason').required = false;
            }
        };
    }
    
    // Обработчик отправки формы
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await submitReport(listingId);
        };
    }
}

/**
 * Закрытие модального окна для жалобы
 */
function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Отправка жалобы
 */
async function submitReport(listingId) {
    const errorMsg = document.getElementById('reportErrorMessage');
    const successMsg = document.getElementById('reportSuccessMessage');
    const form = document.getElementById('reportForm');
    
    if (!form) return;
    
    // Собираем выбранные причины
    const checkboxes = form.querySelectorAll('input[name="reason"]:checked');
    const reasons = Array.from(checkboxes).map(cb => cb.value);
    
    // Если выбрана "Другая причина", добавляем текст из поля
    const otherReasonCheckbox = document.getElementById('otherReasonCheckbox');
    const otherReasonText = document.getElementById('otherReason')?.value.trim();
    
    if (otherReasonCheckbox && otherReasonCheckbox.checked && otherReasonText) {
        reasons.push(otherReasonText);
    }
    
    if (reasons.length === 0) {
        if (errorMsg) {
            errorMsg.textContent = 'Пожалуйста, выберите хотя бы одну причину жалобы';
            errorMsg.style.display = 'block';
        }
        return;
    }
    
    // Объединяем причины в одну строку
    const reason = reasons.join('; ');
    const details = document.getElementById('reportDetails')?.value.trim() || null;
    
    try {
        const response = await apiPost('/reports', {
            listingId: listingId,
            reason: reason,
            details: details
        });
        
        if (errorMsg) errorMsg.style.display = 'none';
        if (successMsg) {
            successMsg.textContent = response.message || 'Жалоба успешно отправлена на рассмотрение';
            successMsg.style.display = 'block';
        }
        
        // Закрываем модальное окно через 2 секунды
        setTimeout(() => {
            closeReportModal();
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка при отправке жалобы:', error);
        if (errorMsg) {
            errorMsg.textContent = error.message || 'Ошибка при отправке жалобы. Попробуйте позже.';
            errorMsg.style.display = 'block';
        }
        if (successMsg) successMsg.style.display = 'none';
    }
}

// Делаем функции доступными глобально
if (typeof window !== 'undefined') {
    window.openReportModal = openReportModal;
    window.closeReportModal = closeReportModal;
}

