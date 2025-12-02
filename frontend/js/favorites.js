/**
 * Модуль для работы со страницей избранного
 * Загрузка и отображение избранных объявлений
 */

let currentPage = 1;
let currentSortBy = 'addedAt';
let currentSortOrder = 'DESC';
const limitPerPage = 20;

/**
 * Инициализация страницы избранного
 */
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('favoritesContainer')) {
        // Проверяем авторизацию
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        loadFavorites();
        setupEventHandlers();
    }
});

/**
 * Настройка обработчиков событий
 */
function setupEventHandlers() {
    // Сортировка
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');
    
    if (sortBy) {
        sortBy.addEventListener('change', (e) => {
            currentSortBy = e.target.value;
            currentPage = 1;
            loadFavorites();
        });
    }
    
    if (sortOrder) {
        sortOrder.addEventListener('change', (e) => {
            currentSortOrder = e.target.value;
            currentPage = 1;
            loadFavorites();
        });
    }
    
    // Пагинация
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadFavorites();
            }
        });
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            currentPage++;
            loadFavorites();
        });
    }
}

/**
 * Загрузка избранных объявлений
 */
async function loadFavorites() {
    const container = document.getElementById('favoritesContainer');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');
    const favoritesCount = document.getElementById('favoritesCount');
    
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка избранных объявлений...</div>';
    
    try {
        const response = await apiGet(`/favorites?page=${currentPage}&limit=${limitPerPage}&sortBy=${currentSortBy}&sortOrder=${currentSortOrder}`);
        
        const favorites = response.favorites || [];
        const paginationData = response.pagination || {};
        
        // Обновляем счетчик
        if (favoritesCount) {
            const total = paginationData.total || 0;
            favoritesCount.textContent = total > 0 ? `Найдено: ${total}` : '';
        }
        
        if (favorites.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (pagination) pagination.style.display = 'none';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (pagination) pagination.style.display = 'flex';
        
        // Отображаем объявления
        displayFavorites(favorites);
        
        // Обновляем пагинацию
        updatePagination(paginationData);
        
    } catch (error) {
        console.error('Ошибка при загрузке избранных объявлений:', error);
        container.innerHTML = `
            <div class="error-message">
                Ошибка при загрузке избранных объявлений. 
                ${error.message || 'Попробуйте обновить страницу.'}
            </div>
        `;
    }
}

/**
 * Отображение списка избранных объявлений
 */
function displayFavorites(favorites) {
    const container = document.getElementById('favoritesContainer');
    if (!container) return;
    
    if (favorites.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет избранных объявлений</div>';
        return;
    }
    
    container.innerHTML = favorites.map(favorite => {
        const listing = favorite.listing;
        if (!listing) return '';
        
        const car = listing.car || {};
        const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\'%3E%3Crect fill=\'%23f0f0f0\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'18\'%3EФото отсутствует%3C/text%3E%3C/svg%3E';
        const mainImage = listing.images && listing.images.length > 0 
            ? listing.images[0].imageUrl 
            : placeholderImage;
        
        const price = formatPrice(listing.price, listing.currency);
        const date = new Date(listing.createdAt).toLocaleDateString('ru-RU');
        const addedDate = new Date(favorite.addedAt).toLocaleDateString('ru-RU');
        
        const carInfo = [];
        if (car.make) carInfo.push(car.make);
        if (car.model) carInfo.push(car.model);
        if (car.year) carInfo.push(car.year);
        
        const location = [];
        if (listing.city) location.push(listing.city);
        if (listing.region) location.push(listing.region);
        
        const user = listing.user || {};
        const userAvatar = user.avatarUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'Arial\' font-size=\'14\'%3E?%3C/text%3E%3C/svg%3E';
        
        return `
            <div class="listing-card favorite-card" data-listing-id="${listing.listingId}">
                <div class="listing-image-wrapper">
                    <img src="${mainImage}" alt="${escapeHtml(listing.title)}" class="listing-image" 
                         onerror="this.src='${placeholderImage}'">
                    <button class="favorite-btn active" onclick="removeFromFavorites(${listing.listingId}, event)" 
                            title="Удалить из избранного">
                        ❤️
                    </button>
                </div>
                <div class="listing-content">
                    <h3 class="listing-title">
                        <a href="listing.html?id=${listing.listingId}" class="listing-title-link">${escapeHtml(listing.title)}</a>
                    </h3>
                    <div class="listing-price">${price}</div>
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
                        <span>📅 ${date}</span>
                    </div>
                    <div class="favorite-added-date">
                        Добавлено в избранное: ${addedDate}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Удаление объявления из избранного
 */
async function removeFromFavorites(listingId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (!confirm('Удалить объявление из избранного?')) {
        return;
    }
    
    try {
        await apiDelete(`/favorites/${listingId}`);
        
        // Удаляем карточку из DOM
        const card = document.querySelector(`[data-listing-id="${listingId}"]`);
        if (card) {
            card.style.transition = 'opacity 0.3s';
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
                // Перезагружаем список, если нужно
                loadFavorites();
            }, 300);
        }
        
        // Показываем уведомление
        showNotification('Объявление удалено из избранного', 'success');
        
    } catch (error) {
        console.error('Ошибка при удалении из избранного:', error);
        showNotification('Ошибка при удалении из избранного', 'error');
    }
}

/**
 * Обновление пагинации
 */
function updatePagination(paginationData) {
    const pageInfo = document.getElementById('pageInfo');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (pageInfo) {
        pageInfo.textContent = `Страница ${paginationData.page || 1} из ${paginationData.totalPages || 1}`;
    }
    
    if (prevPage) {
        prevPage.disabled = (paginationData.page || 1) <= 1;
    }
    
    if (nextPage) {
        nextPage.disabled = (paginationData.page || 1) >= (paginationData.totalPages || 1);
    }
}

/**
 * Вспомогательные функции
 */
function formatPrice(price, currency = 'EUR') {
    const currencySymbols = {
        'EUR': '€',
        'USD': '$',
        'UAH': '₴',
        'RUB': '₽'
    };
    const symbol = currencySymbols[currency] || currency;
    return `${parseInt(price).toLocaleString('ru-RU')} ${symbol}`;
}

function formatMileage(mileage) {
    return parseInt(mileage).toLocaleString('ru-RU');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Простое уведомление через alert (можно заменить на более красивое)
    if (type === 'success') {
        // Можно использовать более красивое уведомление
        console.log('Success:', message);
    } else if (type === 'error') {
        alert(message);
    }
}

// Делаем функцию доступной глобально
if (typeof window !== 'undefined') {
    window.removeFromFavorites = removeFromFavorites;
}

