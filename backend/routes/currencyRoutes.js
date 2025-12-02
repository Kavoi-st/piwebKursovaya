/**
 * Маршруты для работы с курсами валют
 */

const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/currency/rates
 * Получение актуальных курсов валют (публичный доступ)
 */
router.get('/rates', currencyController.getCurrencyRates);

/**
 * POST /api/currency/update
 * Ручное обновление курсов валют (требует аутентификации и прав админа)
 */
router.post('/update', authenticateToken, (req, res, next) => {
    // Проверяем, что пользователь - админ
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Доступ запрещен. Требуются права администратора.'
        });
    }
    next();
}, currencyController.updateCurrencyRates);

module.exports = router;

