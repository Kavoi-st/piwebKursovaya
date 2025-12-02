/**
 * Модуль для работы со списком объявлений
 * Загрузка, фильтрация, отображение объявлений
 */

import { CAR_MAKES_AND_MODELS, CAR_COLORS, BELARUS_REGIONS_AND_CITIES, getYearOptions } from './carData.js';

// Функция проверки авторизации (использует глобальную функцию из api.js)
function isAuthenticated() {
    if (typeof window !== 'undefined' && window.isAuthenticated) {
        return window.isAuthenticated();
    }
    const token = localStorage.getItem('authToken');
    return !!token;
}

// Состояние приложения
let currentPage = 1;
let currentFilters = {};
let listingsData = null;

// Choices.js instances
let makeChoice = null;
let modelChoice = null;
let yearFromChoice = null;
let yearToChoice = null;
let colorChoice = null;
let regionChoice = null;
let cityChoice = null;

// Счетчик попыток инициализации Choices.js
let initChoicesAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('listingsContainer')) {
        initListings();
    }
});

/**
 * Инициализация страницы списка объявлений
 */
async function initListings() {
    // Инициализация фильтров с Choices.js (с ожиданием загрузки)
    await initFilters();

    // Загрузка объявлений при первой загрузке
    await loadListings();

    // Настройка обработчиков событий
    setupEventHandlers();
    
    // Инициализация переключения вида отображения
    initViewToggle();

    // Обновление UI авторизации (если функция доступна)
    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
    }
}

/**
 * Инициализация переключения вида отображения (плитки/список)
 */
function initViewToggle() {
    const viewGridBtn = document.getElementById('viewGridBtn');
    const viewListBtn = document.getElementById('viewListBtn');
    const container = document.getElementById('listingsContainer');
    
    if (!viewGridBtn || !viewListBtn || !container) return;
    
    // Восстанавливаем сохраненный вид
    const savedView = localStorage.getItem('listingsViewMode') || 'grid';
    setViewMode(savedView);
    
    // Обработчики кнопок (оптимизировано для минимального INP)
    viewGridBtn.addEventListener('click', () => {
        // Синхронно меняем режим (быстро)
        setViewMode('grid');
        // Откладываем тяжелую операцию рендеринга
        if (listingsData && listingsData.listings) {
            if ('scheduler' in window && 'postTask' in window.scheduler) {
                scheduler.postTask(() => displayListings(listingsData.listings), { priority: 'user-visible' });
            } else {
                setTimeout(() => displayListings(listingsData.listings), 0);
            }
        }
    }, { passive: true });
    
    viewListBtn.addEventListener('click', () => {
        // Синхронно меняем режим (быстро)
        setViewMode('list');
        // Откладываем тяжелую операцию рендеринга
        if (listingsData && listingsData.listings) {
            if ('scheduler' in window && 'postTask' in window.scheduler) {
                scheduler.postTask(() => displayListings(listingsData.listings), { priority: 'user-visible' });
            } else {
                setTimeout(() => displayListings(listingsData.listings), 0);
            }
        }
    }, { passive: true });
}

/**
 * Установка вида отображения
 */
function setViewMode(mode) {
    const viewGridBtn = document.getElementById('viewGridBtn');
    const viewListBtn = document.getElementById('viewListBtn');
    const container = document.getElementById('listingsContainer');
    
    if (!container) return;
    
    // Сохраняем в localStorage
    localStorage.setItem('listingsViewMode', mode);
    
    // Обновляем классы контейнера
    if (mode === 'list') {
        container.classList.remove('listings-grid');
        container.classList.add('listings-list');
        if (viewGridBtn) viewGridBtn.classList.remove('active');
        if (viewListBtn) viewListBtn.classList.add('active');
    } else {
        container.classList.remove('listings-list');
        container.classList.add('listings-grid');
        if (viewGridBtn) viewGridBtn.classList.add('active');
        if (viewListBtn) viewListBtn.classList.remove('active');
    }
}

/**
 * Инициализация фильтров с Choices.js
 */
async function initFilters() {
    // Проверяем, что Choices.js загружен
    let ChoicesClass = null;
    
    if (typeof window !== 'undefined') {
        ChoicesClass = window.Choices || (typeof Choices !== 'undefined' ? Choices : null);
    }
    
    // Если Choices не найден, ждем загрузки
    if (!ChoicesClass) {
        if (window.choicesLoaded === false) {
            initChoicesAttempts++;
            if (initChoicesAttempts < MAX_INIT_ATTEMPTS) {
                console.warn(`Choices.js еще не загружен, попытка ${initChoicesAttempts}/${MAX_INIT_ATTEMPTS}...`);
                await new Promise(resolve => setTimeout(resolve, 200));
                return await initFilters();
            } else {
                console.error('Choices.js не удалось загрузить после нескольких попыток. Проверьте, что скрипт Choices.js загружен на странице.');
                return;
            }
        } else {
            // Script loaded, but Choices class not available
            ChoicesClass = window.Choices || (typeof Choices !== 'undefined' ? Choices : null);
            if (!ChoicesClass) {
                console.error('Choices.js загружен, но класс Choices недоступен');
                return;
            }
        }
    }
    
    initChoicesAttempts = 0; // Reset on success
    
    // Марки
    const makeSelect = document.getElementById('makeFilter');
    if (makeSelect) {
        const makes = Object.keys(CAR_MAKES_AND_MODELS).sort();
        makes.forEach(make => {
            const option = document.createElement('option');
            option.value = make;
            option.textContent = make;
            makeSelect.appendChild(option);
        });
        
        makeChoice = new ChoicesClass(makeSelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Все марки',
            searchPlaceholderValue: 'Поиск марки...',
            itemSelectText: '',
            shouldSort: true,
            allowHTML: false
        });
        
        makeSelect.addEventListener('change', () => {
            updateModelFilter();
        });
    }

    // Модели (будет обновляться при выборе марки)
    const modelSelect = document.getElementById('modelFilter');
    if (modelSelect) {
        modelChoice = new ChoicesClass(modelSelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Сначала выберите марку',
            searchPlaceholderValue: 'Поиск модели...',
            itemSelectText: '',
            shouldSort: true,
            allowHTML: false
        });
    }

    // Годы от
    const yearFromSelect = document.getElementById('yearFromFilter');
    if (yearFromSelect) {
        const years = getYearOptions();
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFromSelect.appendChild(option);
        });
        
        yearFromChoice = new ChoicesClass(yearFromSelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Любой',
            searchPlaceholderValue: 'Поиск года...',
            itemSelectText: '',
            shouldSort: false,
            allowHTML: false
        });
    }

    // Годы до
    const yearToSelect = document.getElementById('yearToFilter');
    if (yearToSelect) {
        const years = getYearOptions();
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearToSelect.appendChild(option);
        });
        
        yearToChoice = new ChoicesClass(yearToSelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Любой',
            searchPlaceholderValue: 'Поиск года...',
            itemSelectText: '',
            shouldSort: false,
            allowHTML: false
        });
    }

    // Цвета
    const colorSelect = document.getElementById('colorFilter');
    if (colorSelect) {
        CAR_COLORS.forEach(color => {
            const option = document.createElement('option');
            option.value = color.value;
            option.textContent = color.label;
            colorSelect.appendChild(option);
        });
        
        colorChoice = new ChoicesClass(colorSelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Любой цвет',
            searchPlaceholderValue: 'Поиск цвета...',
            itemSelectText: '',
            shouldSort: true,
            allowHTML: false
        });
    }

    // Области
    const regionSelect = document.getElementById('regionFilter');
    if (regionSelect) {
        const regions = Object.keys(BELARUS_REGIONS_AND_CITIES).sort();
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });
        
        regionChoice = new ChoicesClass(regionSelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Все области',
            searchPlaceholderValue: 'Поиск области...',
            itemSelectText: '',
            shouldSort: true,
            allowHTML: false
        });
        
        regionSelect.addEventListener('change', () => {
            updateCityFilter();
        });
    }

    // Города (будет обновляться при выборе области)
    const citySelect = document.getElementById('cityFilter');
    if (citySelect) {
        cityChoice = new ChoicesClass(citySelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Сначала выберите область',
            searchPlaceholderValue: 'Поиск города...',
            itemSelectText: '',
            shouldSort: true,
            allowHTML: false
        });
    }
}

/**
 * Обновление списка моделей при выборе марки
 */
function updateModelFilter() {
    const makeSelect = document.getElementById('makeFilter');
    const modelSelect = document.getElementById('modelFilter');
    
    if (!makeSelect || !modelSelect || !modelChoice) return;
    
    const selectedMake = makeSelect.value;
    
    if (selectedMake && CAR_MAKES_AND_MODELS[selectedMake]) {
        // Добавляем новые опции
        const models = CAR_MAKES_AND_MODELS[selectedMake].sort();
        const choices = models.map(model => ({
            value: model,
            label: model
        }));
        
        modelChoice.setChoices(choices, 'value', 'label', true);
        modelSelect.disabled = false;
        modelChoice.enable();
    } else {
        modelChoice.setChoices([{ value: '', label: 'Сначала выберите марку' }], 'value', 'label', true);
        modelSelect.disabled = true;
        modelChoice.disable();
    }
}

/**
 * Обновление списка городов при выборе области
 */
function updateCityFilter() {
    const regionSelect = document.getElementById('regionFilter');
    const citySelect = document.getElementById('cityFilter');
    
    if (!regionSelect || !citySelect || !cityChoice) return;
    
    const selectedRegion = regionSelect.value;
    
    if (selectedRegion && BELARUS_REGIONS_AND_CITIES[selectedRegion]) {
        // Добавляем новые опции
        const cities = BELARUS_REGIONS_AND_CITIES[selectedRegion].sort();
        const choices = cities.map(city => ({
            value: city,
            label: city
        }));
        
        cityChoice.setChoices(choices, 'value', 'label', true);
        citySelect.disabled = false;
        cityChoice.enable();
    } else {
        cityChoice.setChoices([{ value: '', label: 'Сначала выберите область' }], 'value', 'label', true);
        citySelect.disabled = true;
        cityChoice.disable();
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventHandlers() {
    // Поиск
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch, { passive: true });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        }, { passive: false });
    }

    // Фильтры
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', handleApplyFilters, { passive: true });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', handleResetFilters, { passive: true });
    }

    // Пагинация
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                // Откладываем тяжелую операцию загрузки
                if ('scheduler' in window && 'postTask' in window.scheduler) {
                    scheduler.postTask(() => loadListings(), { priority: 'user-visible' });
                } else {
                    setTimeout(() => loadListings(), 0);
                }
            }
        }, { passive: true });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (listingsData && currentPage < listingsData.pagination.totalPages) {
                currentPage++;
                // Откладываем тяжелую операцию загрузки
                if ('scheduler' in window && 'postTask' in window.scheduler) {
                    scheduler.postTask(() => loadListings(), { priority: 'user-visible' });
                } else {
                    setTimeout(() => loadListings(), 0);
                }
            }
        }, { passive: true });
    }
}

/**
 * Загрузка списка объявлений
 */
async function loadListings() {
    const container = document.getElementById('listingsContainer');
    const pagination = document.getElementById('pagination');
    
    // Показываем загрузку
    if (container) {
        container.innerHTML = '<div class="loading">Загрузка объявлений...</div>';
    }

    try {
        // Проверяем, есть ли companyId в URL параметрах
        const urlParams = new URLSearchParams(window.location.search);
        const companyId = urlParams.get('companyId');
        
        // Формирование параметров запроса
        const params = {
            page: currentPage,
            limit: 20,
            status: 'published',
            ...currentFilters
        };

        // Добавляем companyId, если он есть в URL
        if (companyId) {
            params.companyId = companyId;
            // Показываем информацию о компании
            if (typeof displayCompanyInfo === 'function') {
                displayCompanyInfo(companyId);
            }
        } else {
            // Скрываем информацию о компании, если она была показана
            if (typeof hideCompanyInfo === 'function') {
                hideCompanyInfo();
            }
        }

        // Удаляем пустые параметры
        Object.keys(params).forEach(key => {
            if (params[key] === '' || params[key] === null || params[key] === undefined) {
                delete params[key];
            }
        });

        // Запрос к API
        // Используем window.apiGet, так как api.js загружается как обычный скрипт
        if (typeof window === 'undefined' || !window.apiGet) {
            throw new Error('Функция apiGet не найдена. Убедитесь, что api.js загружен.');
        }
        listingsData = await window.apiGet('/listings', params);

        // Отображение объявлений
        if (container) {
            displayListings(listingsData.listings);
        }

        // Обновление пагинации
        updatePagination(listingsData.pagination);

        // Обновление счетчика
        updateListingsCount(listingsData.pagination.total);

    } catch (error) {
        console.error('Ошибка при загрузке объявлений:', error);
        
        if (container) {
            let errorText = 'Не удалось загрузить объявления';
            
            if (error.message) {
                errorText = error.message;
            } else if (error.data && error.data.error) {
                errorText = error.data.error;
            } else if (typeof error === 'string') {
                errorText = error;
            }
            
            container.innerHTML = `
                <div class="error-message" style="padding: 2rem; text-align: center;">
                    <h3 style="color: #d32f2f; margin-bottom: 1rem;">Ошибка загрузки</h3>
                    <p style="color: #666; margin-bottom: 1.5rem;">${errorText}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top: 1rem;">
                        Обновить страницу
                    </button>
                </div>
            `;
        }
    }
}

/**
 * Отображение списка объявлений
 */
function displayListings(listings) {
    const container = document.getElementById('listingsContainer');

    if (!container) return;

    if (!listings || listings.length === 0) {
        container.innerHTML = '<div class="loading">Объявлений не найдено</div>';
        // Удаляем старый обработчик если есть
        container.removeEventListener('click', handleCardClick);
        return;
    }

    // Получаем текущий вид отображения
    const viewMode = localStorage.getItem('listingsViewMode') || 'grid';
    
    // Устанавливаем класс контейнера в зависимости от вида
    setViewMode(viewMode);

    // Создаем карточки в зависимости от вида
    container.innerHTML = listings.map(listing => 
        viewMode === 'list' ? createListingCardList(listing) : createListingCard(listing)
    ).join('');

    // Используем делегирование событий для оптимизации производительности
    // Один обработчик на контейнере вместо множества на каждой карточке
    // Удаляем старый обработчик перед добавлением нового (если есть)
    container.removeEventListener('click', handleCardClick);
    // Не используем passive: true, так как нам нужно вызывать preventDefault() для кнопки избранного
    container.addEventListener('click', handleCardClick, { passive: false });
    
    // Отложенная проверка статуса избранного (не блокирует рендеринг)
    if (isAuthenticated() && listings.length > 0) {
        // Используем requestIdleCallback для проверки в свободное время
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                checkFavoritesBatch(listings.map(l => l.listingId));
            }, { timeout: 2000 });
        } else {
            // Fallback для браузеров без requestIdleCallback
            setTimeout(() => {
                checkFavoritesBatch(listings.map(l => l.listingId));
            }, 100);
        }
    }
}

/**
 * Обработчик кликов на карточках (делегирование событий, максимально оптимизировано для INP)
 */
function handleCardClick(e) {
    // Минимальная синхронная обработка - только определение цели клика
    const favoriteBtn = e.target.closest('.favorite-btn');
    const card = favoriteBtn ? favoriteBtn.closest('.listing-card, .listing-card-list') : e.target.closest('.listing-card, .listing-card-list');
    
    if (!card) return;
    
    const listingId = card.getAttribute('data-listing-id');
    if (!listingId) return;
    
    // Если клик по кнопке избранного - обрабатываем отдельно (неблокирующе)
    if (favoriteBtn) {
        e.stopPropagation();
        e.preventDefault();
        // Используем scheduler.postTask для приоритетной, но неблокирующей обработки
        if ('scheduler' in window && 'postTask' in window.scheduler) {
            scheduler.postTask(() => toggleFavoriteFromCard(parseInt(listingId), e), { priority: 'user-blocking' });
        } else {
            setTimeout(() => toggleFavoriteFromCard(parseInt(listingId), e), 0);
        }
        return false; // Дополнительная защита от всплытия
    }
    
    // Переход к объявлению - максимально быстрый, без задержек
    window.location.href = `listing.html?id=${listingId}`;
}

/**
 * Батчевая проверка статуса избранного для всех карточек
 */
async function checkFavoritesBatch(listingIds) {
    if (!listingIds || listingIds.length === 0) return;
    if (typeof window === 'undefined' || !window.apiGet) return;
    
    try {
        // Проверяем статус для всех объявлений параллельно
        const promises = listingIds.map(async (listingId) => {
            try {
                const response = await window.apiGet(`/favorites/${listingId}/check`);
                const favoriteBtn = document.querySelector(`.favorite-btn[data-listing-id="${listingId}"]`);
                if (favoriteBtn && response.isFavorite) {
                    // Используем requestAnimationFrame для обновления DOM
                    requestAnimationFrame(() => {
                        favoriteBtn.classList.add('active');
                        favoriteBtn.innerHTML = '❤️';
                        favoriteBtn.title = 'Удалить из избранного';
                    });
                }
            } catch (error) {
                // Игнорируем ошибки для отдельных карточек
            }
        });
        
        // Ждем все проверки, но не блокируем основной поток
        await Promise.allSettled(promises);
    } catch (error) {
        // Игнорируем общие ошибки
        console.log('Не удалось проверить статус избранного:', error);
    }
}


/**
 * Переключение избранного с карточки объявления (оптимизировано для INP)
 */
async function toggleFavoriteFromCard(listingId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (!isAuthenticated()) {
        // Используем setTimeout для неблокирующего alert
        setTimeout(() => alert('Войдите, чтобы добавлять объявления в избранное'), 0);
        return;
    }
    
    const favoriteBtn = document.querySelector(`.favorite-btn[data-listing-id="${listingId}"]`);
    if (!favoriteBtn) return;
    
    const isFavorite = favoriteBtn.classList.contains('active');
    
    // Оптимистичное обновление UI СРАЗУ синхронно (для минимального INP)
    const wasActive = isFavorite;
    if (wasActive) {
        favoriteBtn.classList.remove('active');
        favoriteBtn.innerHTML = '🤍';
        favoriteBtn.title = 'Добавить в избранное';
    } else {
        favoriteBtn.classList.add('active');
        favoriteBtn.innerHTML = '❤️';
        favoriteBtn.title = 'Удалить из избранного';
    }
    
    // Выполняем запрос асинхронно, не блокируя UI
    const performRequest = async () => {
        try {
            if (typeof window === 'undefined' || !window.apiPost || !window.apiDelete) {
                throw new Error('API функции не доступны');
            }
            
            if (wasActive) {
                await window.apiDelete(`/favorites/${listingId}`);
            } else {
                await window.apiPost(`/favorites/${listingId}`, {});
            }
        } catch (error) {
            console.error('Ошибка при переключении избранного:', error);
            // Откатываем оптимистичное обновление при ошибке
            if (wasActive) {
                favoriteBtn.classList.add('active');
                favoriteBtn.innerHTML = '❤️';
                favoriteBtn.title = 'Удалить из избранного';
            } else {
                favoriteBtn.classList.remove('active');
                favoriteBtn.innerHTML = '🤍';
                favoriteBtn.title = 'Добавить в избранное';
            }
        }
    };
    
    // Используем scheduler.postTask если доступен, иначе setTimeout
    if ('scheduler' in window && 'postTask' in window.scheduler) {
        scheduler.postTask(performRequest, { priority: 'background' });
    } else {
        setTimeout(performRequest, 0);
    }
}

// Экспорт функции
if (typeof window !== 'undefined') {
    window.toggleFavoriteFromCard = toggleFavoriteFromCard;
}

/**
 * Создание HTML карточки объявления
 */
function createListingCard(listing) {
    // Получаем главное изображение или первое доступное
    let mainImage = null;
    if (listing.images && listing.images.length > 0) {
        const mainImg = listing.images.find(img => img.isMain) || listing.images[0];
        mainImage = mainImg.imageUrl;
    }
    
    // Если изображения нет, используем заглушку (data URI для SVG)
    const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\'%3E%3Crect fill=\'%23f0f0f0\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'18\'%3EФото отсутствует%3C/text%3E%3C/svg%3E';
    
    const car = listing.car || {};
    const user = listing.user || {};
    
    // Получаем информацию о компании
    
    // Получаем аватар пользователя или заглушку
    const userAvatar = user.avatarUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'14\'%3E?%3C/text%3E%3C/svg%3E';
    
    const carInfo = [];
    if (car.make) carInfo.push(car.make);
    if (car.model) carInfo.push(car.model);
    if (car.year) carInfo.push(car.year);
    
    const location = [];
    if (listing.city) location.push(listing.city);
    if (listing.region) location.push(listing.region);

    const formattedDate = listing.createdAt 
        ? new Date(listing.createdAt).toLocaleDateString('ru-RU')
        : '';

    return `
        <div class="listing-card" data-listing-id="${listing.listingId}">
            <div class="listing-image-wrapper">
                <img src="${mainImage || placeholderImage}" alt="${escapeHtml(listing.title)}" class="listing-image" 
                     onerror="this.src='${placeholderImage}'">
                ${isAuthenticated() ? `
                    <button class="favorite-btn" data-listing-id="${listing.listingId}" 
                            title="Добавить в избранное">
                        🤍
                    </button>
                ` : ''}
            </div>
            <div class="listing-content">
                <h3 class="listing-title">${escapeHtml(listing.title)}</h3>
                <div class="listing-price">${formatPrice(listing.price)} ${listing.currency || 'EUR'}</div>
                <div class="listing-info">
                    ${carInfo.length > 0 ? `<span>${escapeHtml(carInfo.join(' '))}</span>` : ''}
                    ${car.mileage ? `<span>${formatMileage(car.mileage)} км</span>` : ''}
                    ${location.length > 0 ? `<span>📍 ${escapeHtml(location.join(', '))}</span>` : ''}
                </div>
                <div class="listing-meta">
                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${userAvatar}" alt="${escapeHtml(user.displayName || user.username || 'Продавец')}" 
                             style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;"
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'10\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'10\'%3E?%3C/text%3E%3C/svg%3E'">
                        ${escapeHtml(user.displayName || user.username || 'Продавец')}
                    </span>
                    <span>${formattedDate}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Создание карточки объявления в виде строки (список)
 */
function createListingCardList(listing) {
    const car = listing.car || {};
    const user = listing.user || {};
    const images = listing.images || [];
    const mainImage = images.find(img => img.isMain)?.imageUrl || images[0]?.imageUrl;
    const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'200\'%3E%3Crect width=\'300\' height=\'200\' fill=\'%23ecf0f1\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'16\'%3EНет фото%3C/text%3E%3C/svg%3E';
    
    const userAvatar = user.avatarUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'14\'%3E?%3C/text%3E%3C/svg%3E';
    
    const carInfo = [];
    if (car.make) carInfo.push(car.make);
    if (car.model) carInfo.push(car.model);
    if (car.year) carInfo.push(car.year);
    
    const location = [];
    if (listing.city) location.push(listing.city);
    if (listing.region) location.push(listing.region);

    const formattedDate = listing.createdAt 
        ? new Date(listing.createdAt).toLocaleDateString('ru-RU')
        : '';

    return `
        <div class="listing-card-list" data-listing-id="${listing.listingId}">
            <div class="listing-image-list-wrapper">
                <div class="listing-image-list">
                    <img src="${mainImage || placeholderImage}" alt="${escapeHtml(listing.title)}" 
                         onerror="this.src='${placeholderImage}'">
                </div>
                ${isAuthenticated() ? `
                    <button class="favorite-btn favorite-btn-list" data-listing-id="${listing.listingId}" 
                            title="Добавить в избранное">
                        🤍
                    </button>
                ` : ''}
            </div>
            <div class="listing-content-list">
                <div class="listing-header-list">
                    <h3 class="listing-title-list">${escapeHtml(listing.title)}</h3>
                    <div class="listing-price-list">${formatPrice(listing.price)} ${listing.currency || 'EUR'}</div>
                </div>
                <div class="listing-info-list">
                    ${carInfo.length > 0 ? `<span class="info-item">${escapeHtml(carInfo.join(' '))}</span>` : ''}
                    ${car.mileage ? `<span class="info-item">${formatMileage(car.mileage)} км</span>` : ''}
                    ${car.bodyType ? `<span class="info-item">${escapeHtml(car.bodyType)}</span>` : ''}
                    ${car.transmission ? `<span class="info-item">${escapeHtml(car.transmission)}</span>` : ''}
                    ${car.engineType ? `<span class="info-item">${escapeHtml(car.engineType)}</span>` : ''}
                    ${location.length > 0 ? `<span class="info-item">📍 ${escapeHtml(location.join(', '))}</span>` : ''}
                </div>
                <div class="listing-meta-list">
                    <span class="seller-info-list" style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${userAvatar}" alt="${escapeHtml(user.displayName || user.username || 'Продавец')}" 
                             style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;"
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'12\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'12\'%3E?%3C/text%3E%3C/svg%3E'">
                        ${escapeHtml(user.displayName || user.username || 'Продавец')}
                    </span>
                    <span class="listing-date-list">${formattedDate}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Обновление пагинации
 */
function updatePagination(pagination) {
    const paginationEl = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

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
 * Обновление счетчика объявлений
 */
function updateListingsCount(count) {
    const countEl = document.getElementById('listingsCount');
    if (countEl) {
        const text = count === 1 ? 'объявление' : count < 5 ? 'объявления' : 'объявлений';
        countEl.textContent = `Найдено: ${count} ${text}`;
    }
}

/**
 * Обработка поиска
 */
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentFilters.search = searchInput.value.trim();
        currentPage = 1;
        loadListings();
    }
}

/**
 * Применение фильтров
 */
function handleApplyFilters() {
    currentFilters = {};

    // Сбор значений фильтров
    const makeFilter = document.getElementById('makeFilter');
    const modelFilter = document.getElementById('modelFilter');
    const yearFromFilter = document.getElementById('yearFromFilter');
    const yearToFilter = document.getElementById('yearToFilter');
    const colorFilter = document.getElementById('colorFilter');
    const regionFilter = document.getElementById('regionFilter');
    const cityFilter = document.getElementById('cityFilter');
    const minPriceFilter = document.getElementById('minPriceFilter');
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    const searchInput = document.getElementById('searchInput');

    if (makeFilter && makeFilter.value) {
        currentFilters.make = makeFilter.value;
    }
    if (modelFilter && modelFilter.value) {
        currentFilters.model = modelFilter.value;
    }
    if (yearFromFilter && yearFromFilter.value) {
        currentFilters.yearFrom = yearFromFilter.value;
    }
    if (yearToFilter && yearToFilter.value) {
        currentFilters.yearTo = yearToFilter.value;
    }
    if (colorFilter && colorFilter.value) {
        currentFilters.color = colorFilter.value;
    }
    if (regionFilter && regionFilter.value) {
        currentFilters.region = regionFilter.value;
    }
    if (cityFilter && cityFilter.value) {
        currentFilters.city = cityFilter.value;
    }
    if (minPriceFilter && minPriceFilter.value) {
        currentFilters.minPrice = minPriceFilter.value;
    }
    if (maxPriceFilter && maxPriceFilter.value) {
        currentFilters.maxPrice = maxPriceFilter.value;
    }
    if (searchInput && searchInput.value.trim()) {
        currentFilters.search = searchInput.value.trim();
    }

    currentPage = 1;
    loadListings();
}

/**
 * Сброс фильтров
 */
function handleResetFilters() {
    // Сброс Choices.js к начальному состоянию
    if (makeChoice) {
        makeChoice.setChoiceByValue('');
    }
    if (modelChoice) {
        modelChoice.setChoices([{ value: '', label: 'Сначала выберите марку' }], 'value', 'label', true);
        document.getElementById('modelFilter').disabled = true;
        modelChoice.disable();
    }
    if (yearFromChoice) {
        yearFromChoice.setChoiceByValue('');
    }
    if (yearToChoice) {
        yearToChoice.setChoiceByValue('');
    }
    if (colorChoice) {
        colorChoice.setChoiceByValue('');
    }
    if (regionChoice) {
        regionChoice.setChoiceByValue('');
    }
    if (cityChoice) {
        cityChoice.setChoices([{ value: '', label: 'Сначала выберите область' }], 'value', 'label', true);
        document.getElementById('cityFilter').disabled = true;
        cityChoice.disable();
    }

    // Очистка полей фильтров
    const minPriceFilter = document.getElementById('minPriceFilter');
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    const searchInput = document.getElementById('searchInput');

    if (minPriceFilter) minPriceFilter.value = '';
    if (maxPriceFilter) maxPriceFilter.value = '';
    if (searchInput) searchInput.value = '';

    currentFilters = {};
    currentPage = 1;
    loadListings();
}

/**
 * Форматирование цены
 */
function formatPrice(price) {
    if (!price) return '0';
    return new Intl.NumberFormat('ru-RU').format(price);
}

/**
 * Форматирование пробега
 */
function formatMileage(mileage) {
    if (!mileage) return '0';
    return new Intl.NumberFormat('ru-RU').format(mileage);
}

/**
 * Экранирование HTML для безопасности
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

