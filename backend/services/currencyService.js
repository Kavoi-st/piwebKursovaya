/**
 * Сервис для работы с курсами валют
 * Получает курсы из онлайн API и обновляет их каждые 6 часов
 */

const axios = require('axios');
const { CurrencyRate } = require('../models');
const logger = require('../utils/logger');

// Поддерживаемые валюты
const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'BYN', 'RUB', 'PLN', 'UAH'];

// Интервал обновления (6 часов в миллисекундах)
const UPDATE_INTERVAL = 6 * 60 * 60 * 1000;

/**
 * Получение курсов валют из онлайн API
 * Использует exchangerate-api.com (бесплатный API)
 */
async function fetchExchangeRates() {
    try {
        // Используем бесплатный API exchangerate-api.com
        // Можно также использовать fixer.io, currencyapi.net и другие
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/EUR', {
            timeout: 10000
        });

        if (response.data && response.data.rates) {
            return response.data.rates;
        }

        throw new Error('Неверный формат ответа от API');
    } catch (error) {
        logger.error('Ошибка при получении курсов валют:', error.message);
        
        // Пробуем альтернативный бесплатный API
        try {
            const altResponse = await axios.get('https://open.er-api.com/v6/latest/EUR', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            if (altResponse.data && altResponse.data.rates) {
                return altResponse.data.rates;
            }
        } catch (altError) {
            logger.error('Ошибка при получении курсов из альтернативного API:', altError.message);
        }
        
        throw error;
    }
}

/**
 * Обновление курсов валют в базе данных
 */
async function updateCurrencyRates() {
    try {
        logger.info('Начало обновления курсов валют...');
        
        const rates = await fetchExchangeRates();
        const baseCurrency = 'EUR';
        const now = new Date();
        
        // Обновляем курсы для всех поддерживаемых валют
        for (const targetCurrency of SUPPORTED_CURRENCIES) {
            if (targetCurrency === baseCurrency) {
                // Для базовой валюты курс всегда 1
                await CurrencyRate.upsert({
                    baseCurrency,
                    targetCurrency,
                    rate: 1.0,
                    lastUpdated: now
                });
                continue;
            }
            
            const rate = rates[targetCurrency];
            if (rate) {
                await CurrencyRate.upsert({
                    baseCurrency,
                    targetCurrency,
                    rate: parseFloat(rate),
                    lastUpdated: now
                });
                logger.info(`Обновлен курс ${baseCurrency}/${targetCurrency}: ${rate}`);
            } else {
                logger.warn(`Курс для ${targetCurrency} не найден в ответе API`);
            }
        }
        
        logger.info('Курсы валют успешно обновлены');
        return true;
    } catch (error) {
        logger.error('Ошибка при обновлении курсов валют:', error);
        return false;
    }
}

/**
 * Получение курсов валют из базы данных
 * Если курсы устарели (старше 6 часов), обновляет их
 */
async function getCurrencyRates() {
    try {
        // Проверяем, нужно ли обновление
        const oldestRate = await CurrencyRate.findOne({
            order: [['lastUpdated', 'ASC']],
            limit: 1
        });
        
        const needsUpdate = !oldestRate || 
            (new Date() - new Date(oldestRate.lastUpdated)) > UPDATE_INTERVAL;
        
        if (needsUpdate) {
            logger.info('Курсы валют устарели, обновляем...');
            await updateCurrencyRates();
        }
        
        // Получаем все актуальные курсы
        const rates = await CurrencyRate.findAll({
            where: {
                baseCurrency: 'EUR'
            }
        });
        
        // Преобразуем в удобный формат
        const ratesMap = {};
        rates.forEach(rate => {
            ratesMap[rate.targetCurrency] = parseFloat(rate.rate);
        });
        
        return ratesMap;
    } catch (error) {
        logger.error('Ошибка при получении курсов валют:', error);
        // Возвращаем дефолтные курсы в случае ошибки
        return getDefaultRates();
    }
}

/**
 * Получение дефолтных курсов (если API недоступен)
 */
function getDefaultRates() {
    // Примерные курсы (будут обновлены при следующем успешном запросе)
    return {
        'EUR': 1.0,
        'USD': 1.08,
        'BYN': 3.45,
        'RUB': 100.0,
        'PLN': 4.30,
        'UAH': 40.0
    };
}

/**
 * Конвертация цены из одной валюты в другую
 */
function convertPrice(price, fromCurrency, toCurrency, rates) {
    if (fromCurrency === toCurrency) {
        return price;
    }
    
    // Все курсы в rates относительно EUR (базовая валюта)
    // Если fromCurrency = EUR, то rate = 1
    // Если fromCurrency != EUR, то rate показывает, сколько единиц fromCurrency = 1 EUR
    
    const fromRate = rates[fromCurrency] || 1; // Курс fromCurrency к EUR
    const toRate = rates[toCurrency] || 1; // Курс toCurrency к EUR
    
    // Конвертируем: price (в fromCurrency) -> EUR -> toCurrency
    // Если fromCurrency = EUR, fromRate = 1, priceInEur = price
    // Если fromCurrency != EUR, priceInEur = price / fromRate
    const priceInEur = fromCurrency === 'EUR' ? price : price / fromRate;
    
    // Конвертируем из EUR в toCurrency
    // Если toCurrency = EUR, toRate = 1, priceInTarget = priceInEur
    // Если toCurrency != EUR, priceInTarget = priceInEur * toRate
    const priceInTarget = toCurrency === 'EUR' ? priceInEur : priceInEur * toRate;
    
    return priceInTarget;
}

/**
 * Инициализация автоматического обновления курсов
 */
function startAutoUpdate() {
    // Обновляем сразу при запуске
    updateCurrencyRates().catch(error => {
        logger.error('Ошибка при начальном обновлении курсов:', error);
    });
    
    // Затем обновляем каждые 6 часов
    setInterval(() => {
        updateCurrencyRates().catch(error => {
            logger.error('Ошибка при автоматическом обновлении курсов:', error);
        });
    }, UPDATE_INTERVAL);
    
    logger.info('Автоматическое обновление курсов валют запущено (каждые 6 часов)');
}

module.exports = {
    getCurrencyRates,
    updateCurrencyRates,
    convertPrice,
    startAutoUpdate,
    SUPPORTED_CURRENCIES
};

