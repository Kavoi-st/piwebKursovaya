/**
 * Контроллер для работы с курсами валют
 */

const currencyService = require('../services/currencyService');
const logger = require('../utils/logger');

/**
 * GET /api/currency/rates
 * Получение актуальных курсов валют
 */
async function getCurrencyRates(req, res) {
    try {
        const rates = await currencyService.getCurrencyRates();
        
        res.json({
            success: true,
            rates,
            currencies: currencyService.SUPPORTED_CURRENCIES
        });
    } catch (error) {
        logger.error('Ошибка при получении курсов валют:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении курсов валют'
        });
    }
}

/**
 * POST /api/currency/update
 * Ручное обновление курсов валют (только для админов)
 */
async function updateCurrencyRates(req, res) {
    try {
        const success = await currencyService.updateCurrencyRates();
        
        if (success) {
            res.json({
                success: true,
                message: 'Курсы валют успешно обновлены'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Не удалось обновить курсы валют'
            });
        }
    } catch (error) {
        logger.error('Ошибка при обновлении курсов валют:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Ошибка при обновлении курсов валют'
        });
    }
}

module.exports = {
    getCurrencyRates,
    updateCurrencyRates
};

