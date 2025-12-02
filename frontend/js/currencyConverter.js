/**
 * Модуль для конвертации и отображения цен в разных валютах
 */

let currencyRates = null;
let supportedCurrencies = ['EUR', 'USD', 'BYN', 'RUB', 'PLN', 'UAH'];

/**
 * Загрузка курсов валют с сервера
 */
async function loadCurrencyRates() {
    try {
        const response = await apiGet('/currency/rates');
        if (response.success && response.rates) {
            currencyRates = response.rates;
            supportedCurrencies = response.currencies || supportedCurrencies;
            return true;
        }
    } catch (error) {
        console.error('Ошибка при загрузке курсов валют:', error);
    }
    return false;
}

/**
 * Конвертация цены из одной валюты в другую
 */
function convertPrice(price, fromCurrency, toCurrency) {
    if (!currencyRates || fromCurrency === toCurrency) {
        return price;
    }
    
    // Конвертируем через EUR как базовую валюту
    const fromRate = currencyRates[fromCurrency] || 1;
    const toRate = currencyRates[toCurrency] || 1;
    
    // Сначала конвертируем в EUR, потом в целевую валюту
    const priceInEur = price / fromRate;
    const priceInTarget = priceInEur * toRate;
    
    return priceInTarget;
}

/**
 * Форматирование цены с символом валюты
 */
function formatPriceWithCurrency(price, currency) {
    const formatted = new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
    
    const currencySymbols = {
        'EUR': '€',
        'USD': '$',
        'BYN': 'Br',
        'RUB': '₽',
        'PLN': 'zł',
        'UAH': '₴'
    };
    
    return `${formatted} ${currencySymbols[currency] || currency}`;
}

/**
 * Отображение цены в разных валютах
 */
function displayPriceInMultipleCurrencies(price, baseCurrency, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Загружаем курсы, если еще не загружены
    if (!currencyRates) {
        loadCurrencyRates().then(() => {
            displayPriceInMultipleCurrencies(price, baseCurrency, containerId);
        });
        return;
    }
    
    // Основная цена
    const mainPrice = formatPriceWithCurrency(price, baseCurrency);
    
    // Получаем другие валюты (кроме основной)
    const otherCurrencies = supportedCurrencies.filter(c => c !== baseCurrency);
    
    // Конвертируем в другие валюты
    const convertedPrices = otherCurrencies.map(currency => {
        const convertedPrice = convertPrice(price, baseCurrency, currency);
        return {
            currency,
            price: convertedPrice,
            formatted: formatPriceWithCurrency(convertedPrice, currency)
        };
    });
    
    // Создаем HTML
    let html = `
        <div class="listing-price-main">${mainPrice}</div>
        <div class="listing-price-converted">
    `;
    
    convertedPrices.forEach(({ currency, formatted }) => {
        html += `<span class="converted-price-item">${formatted}</span>`;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadCurrencyRates();
});

// Экспорт функций
if (typeof window !== 'undefined') {
    window.loadCurrencyRates = loadCurrencyRates;
    window.convertPrice = convertPrice;
    window.formatPriceWithCurrency = formatPriceWithCurrency;
    window.displayPriceInMultipleCurrencies = displayPriceInMultipleCurrencies;
}

