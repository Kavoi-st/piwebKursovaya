/**
 * Модуль для работы со страницей жалоб (для модераторов/админов)
 * Загрузка и обработка жалоб на объявления
 */

let currentPage = 1;
let currentStatus = '';
let currentSortBy = 'createdAt';
let currentSortOrder = 'DESC';
const limitPerPage = 20;

/**
 * Инициализация страницы жалоб
 */
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('reportsContainer')) {
        // Проверяем авторизацию и права доступа
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        checkModeratorAccess();
        loadReports();
        setupEventHandlers();
    }
});

/**
 * Проверка прав доступа модератора/админа
 */
async function checkModeratorAccess() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        const user = await apiGet('/auth/me');
        const role = user.user?.role || currentUser.role;
        
        if (role !== 'moderator' && role !== 'admin') {
            alert('У вас нет прав доступа к этой странице');
            window.location.href = 'index.html';
            return;
        }
    } catch (error) {
        console.error('Ошибка при проверке доступа:', error);
        window.location.href = 'login.html';
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventHandlers() {
    // Фильтры
    const statusFilter = document.getElementById('statusFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentStatus = e.target.value;
            currentPage = 1;
            loadReports();
        });
    }
    
    if (sortBy) {
        sortBy.addEventListener('change', (e) => {
            currentSortBy = e.target.value;
            currentPage = 1;
            loadReports();
        });
    }
    
    if (sortOrder) {
        sortOrder.addEventListener('change', (e) => {
            currentSortOrder = e.target.value;
            currentPage = 1;
            loadReports();
        });
    }
    
    // Кнопка обновления
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadReports();
        });
    }
    
    // Пагинация
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadReports();
            }
        });
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            currentPage++;
            loadReports();
        });
    }
}

/**
 * Загрузка списка жалоб
 */
async function loadReports() {
    const container = document.getElementById('reportsContainer');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');
    
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка жалоб...</div>';
    
    try {
        let url = `/reports?page=${currentPage}&limit=${limitPerPage}&sortBy=${currentSortBy}&sortOrder=${currentSortOrder}`;
        if (currentStatus) {
            url += `&status=${currentStatus}`;
        }
        
        const response = await apiGet(url);
        
        const reports = response.reports || [];
        const paginationData = response.pagination || {};
        
        if (reports.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (pagination) pagination.style.display = 'none';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (pagination) pagination.style.display = 'flex';
        
        // Отображаем жалобы
        displayReports(reports);
        
        // Обновляем пагинацию
        updatePagination(paginationData);
        
    } catch (error) {
        console.error('Ошибка при загрузке жалоб:', error);
        container.innerHTML = `
            <div class="error-message">
                Ошибка при загрузке жалоб. 
                ${error.message || 'Попробуйте обновить страницу.'}
            </div>
        `;
    }
}

/**
 * Отображение списка жалоб
 */
function displayReports(reports) {
    const container = document.getElementById('reportsContainer');
    if (!container) return;
    
    container.innerHTML = reports.map(report => {
        const listing = report.listing || {};
        const reporter = report.reporter || {};
        const handler = report.handler || {};
        
        const statusClass = getStatusClass(report.status);
        const statusText = getStatusText(report.status);
        const createdAt = new Date(report.createdAt).toLocaleString('ru-RU');
        const handledAt = report.handledAt ? new Date(report.handledAt).toLocaleString('ru-RU') : '';
        
        return `
            <div class="report-card" data-report-id="${report.reportId}">
                <div class="report-header">
                    <div class="report-info">
                        <h3 class="report-title">Жалоба #${report.reportId}</h3>
                        <span class="report-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="report-date">📅 ${createdAt}</div>
                </div>
                
                <div class="report-content">
                    <div class="report-section">
                        <h4>Причина жалобы:</h4>
                        <p class="report-reason">${escapeHtml(report.reason)}</p>
                        ${report.details ? `<p class="report-details">${escapeHtml(report.details)}</p>` : ''}
                    </div>
                    
                    ${listing.listingId ? `
                        <div class="report-section">
                            <h4>Объявление:</h4>
                            <div class="report-listing">
                                <a href="listing.html?id=${listing.listingId}" target="_blank" class="listing-link">
                                    ${escapeHtml(listing.title || 'Без названия')}
                                </a>
                                <span class="listing-status">Статус: ${getListingStatusText(listing.status)}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="report-section">
                        <h4>Информация:</h4>
                        <div class="report-meta">
                            <span>👤 Жалобу подал: <strong>${escapeHtml(reporter.displayName || reporter.username || 'Неизвестно')}</strong></span>
                            ${handler.userId ? `<span>✅ Обработал: <strong>${escapeHtml(handler.displayName || handler.username || 'Неизвестно')}</strong></span>` : ''}
                            ${handledAt ? `<span>🕐 Обработано: ${handledAt}</span>` : ''}
                        </div>
                    </div>
                </div>
                
                ${report.status === 'open' || report.status === 'in_progress' ? `
                    <div class="report-actions">
                        <button class="btn btn-danger" onclick="acceptReport(${report.reportId})">
                            ✅ Принять жалобу (удалить объявление)
                        </button>
                        <button class="btn btn-outline" onclick="dismissReport(${report.reportId})">
                            ❌ Отклонить жалобу
                        </button>
                        <button class="btn btn-secondary" onclick="viewReportDetails(${report.reportId})">
                            👁️ Подробнее
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Принятие жалобы (удаление объявления)
 */
async function acceptReport(reportId) {
    if (!confirm('Вы уверены, что хотите принять жалобу и удалить объявление?')) {
        return;
    }
    
    try {
        await apiPost(`/reports/${reportId}/accept`);
        showNotification('Жалоба принята, объявление удалено', 'success');
        loadReports();
    } catch (error) {
        console.error('Ошибка при принятии жалобы:', error);
        alert('Ошибка: ' + (error.message || 'Не удалось принять жалобу'));
    }
}

/**
 * Отклонение жалобы
 */
async function dismissReport(reportId) {
    if (!confirm('Вы уверены, что хотите отклонить жалобу?')) {
        return;
    }
    
    try {
        await apiPost(`/reports/${reportId}/dismiss`);
        showNotification('Жалоба отклонена', 'info');
        loadReports();
    } catch (error) {
        console.error('Ошибка при отклонении жалобы:', error);
        alert('Ошибка: ' + (error.message || 'Не удалось отклонить жалобу'));
    }
}

/**
 * Просмотр деталей жалобы
 */
async function viewReportDetails(reportId) {
    const modal = document.getElementById('reportDetailModal');
    const content = document.getElementById('reportDetailContent');
    
    if (!modal || !content) return;
    
    try {
        const response = await apiGet(`/reports/${reportId}`);
        const report = response.report;
        const listing = report.listing || {};
        const reporter = report.reporter || {};
        const handler = report.handler || {};
        const car = listing.car || {};
        
        content.innerHTML = `
            <div class="report-detail">
                <div class="report-detail-section">
                    <h3>Информация о жалобе</h3>
                    <p><strong>ID жалобы:</strong> #${report.reportId}</p>
                    <p><strong>Статус:</strong> <span class="report-status ${getStatusClass(report.status)}">${getStatusText(report.status)}</span></p>
                    <p><strong>Дата создания:</strong> ${new Date(report.createdAt).toLocaleString('ru-RU')}</p>
                    ${report.handledAt ? `<p><strong>Дата обработки:</strong> ${new Date(report.handledAt).toLocaleString('ru-RU')}</p>` : ''}
                </div>
                
                <div class="report-detail-section">
                    <h3>Причина жалобы</h3>
                    <p><strong>Причина:</strong> ${escapeHtml(report.reason)}</p>
                    ${report.details ? `<p><strong>Детали:</strong> ${escapeHtml(report.details)}</p>` : ''}
                </div>
                
                <div class="report-detail-section">
                    <h3>Информация о жалобщике</h3>
                    <p><strong>Имя:</strong> ${escapeHtml(reporter.displayName || reporter.username || 'Неизвестно')}</p>
                    <p><strong>Email:</strong> ${escapeHtml(reporter.email || 'Не указан')}</p>
                </div>
                
                ${listing.listingId ? `
                    <div class="report-detail-section">
                        <h3>Объявление</h3>
                        <p><strong>Название:</strong> <a href="listing.html?id=${listing.listingId}" target="_blank">${escapeHtml(listing.title || 'Без названия')}</a></p>
                        <p><strong>Статус:</strong> ${getListingStatusText(listing.status)}</p>
                        <p><strong>Цена:</strong> ${formatPrice(listing.price, listing.currency)}</p>
                        ${listing.description ? `<p><strong>Описание:</strong> ${escapeHtml(listing.description)}</p>` : ''}
                        ${car.make ? `<p><strong>Автомобиль:</strong> ${escapeHtml(car.make)} ${escapeHtml(car.model || '')} ${car.year || ''}</p>` : ''}
                    </div>
                ` : ''}
                
                ${handler.userId ? `
                    <div class="report-detail-section">
                        <h3>Обработчик</h3>
                        <p><strong>Имя:</strong> ${escapeHtml(handler.displayName || handler.username || 'Неизвестно')}</p>
                    </div>
                ` : ''}
                
                ${report.status === 'open' || report.status === 'in_progress' ? `
                    <div class="report-detail-actions">
                        <button class="btn btn-danger" onclick="acceptReport(${report.reportId}); closeReportDetailModal();">
                            ✅ Принять жалобу (удалить объявление)
                        </button>
                        <button class="btn btn-outline" onclick="dismissReport(${report.reportId}); closeReportDetailModal();">
                            ❌ Отклонить жалобу
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Ошибка при загрузке деталей жалобы:', error);
        alert('Ошибка при загрузке деталей жалобы');
    }
}

/**
 * Закрытие модального окна деталей
 */
function closeReportDetailModal() {
    const modal = document.getElementById('reportDetailModal');
    if (modal) {
        modal.style.display = 'none';
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
function getStatusClass(status) {
    const classes = {
        'open': 'status-open',
        'in_progress': 'status-in-progress',
        'resolved': 'status-resolved',
        'dismissed': 'status-dismissed'
    };
    return classes[status] || '';
}

function getStatusText(status) {
    const texts = {
        'open': 'Открыта',
        'in_progress': 'В работе',
        'resolved': 'Принята',
        'dismissed': 'Отклонена'
    };
    return texts[status] || status;
}

function getListingStatusText(status) {
    const texts = {
        'published': 'Опубликовано',
        'pending': 'На модерации',
        'rejected': 'Отклонено',
        'sold': 'Продано',
        'archived': 'Архивировано'
    };
    return texts[status] || status;
}

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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}:`, message);
}

// Делаем функции доступными глобально
if (typeof window !== 'undefined') {
    window.acceptReport = acceptReport;
    window.dismissReport = dismissReport;
    window.viewReportDetails = viewReportDetails;
    window.closeReportDetailModal = closeReportDetailModal;
}

