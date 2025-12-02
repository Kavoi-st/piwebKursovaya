const express = require('express');
const router = express.Router();

const {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  getMyReports,
  acceptReport,
  dismissReport
} = require('../controllers/reportController');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { sanitizeBody, requireFields } = require('../middleware/validation');

/**
 * @route   GET /api/reports
 * @desc    Получение списка всех жалоб
 * @access  Private (модератор/админ)
 */
router.get('/',
  authenticateToken,
  requireRole('moderator', 'admin'),
  getReports
);

/**
 * @route   GET /api/reports/my
 * @desc    Получение жалоб, поданных текущим пользователем
 * @access  Private
 */
router.get('/my',
  authenticateToken,
  getMyReports
);

/**
 * @route   POST /api/reports
 * @desc    Создание жалобы на объявление или комментарий
 * @access  Private
 */
router.post('/',
  authenticateToken,
  sanitizeBody,
  requireFields('reason'),
  createReport
);

/**
 * @route   PUT /api/reports/:id/status
 * @desc    Обновление статуса жалобы
 * @access  Private (модератор/админ)
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /:id, иначе Express перехватит запрос
 */
router.put('/:id/status',
  authenticateToken,
  requireRole('moderator', 'admin'),
  sanitizeBody,
  requireFields('status'),
  updateReportStatus
);

/**
 * @route   POST /api/reports/:id/accept
 * @desc    Принятие жалобы (удаление объявления)
 * @access  Private (модератор/админ)
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /:id, иначе Express перехватит запрос
 */
router.post('/:id/accept',
  authenticateToken,
  requireRole('moderator', 'admin'),
  acceptReport
);

/**
 * @route   POST /api/reports/:id/dismiss
 * @desc    Отклонение жалобы
 * @access  Private (модератор/админ)
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /:id, иначе Express перехватит запрос
 */
router.post('/:id/dismiss',
  authenticateToken,
  requireRole('moderator', 'admin'),
  (req, res, next) => {
    console.log('[REPORTS ROUTES] Dismiss route called:', req.params.id, req.method, req.path);
    dismissReport(req, res, next);
  }
);

/**
 * @route   GET /api/reports/:id
 * @desc    Получение жалобы по ID
 * @access  Private (модератор/админ)
 * ВАЖНО: Этот маршрут должен быть ПОСЛЕ всех специфичных маршрутов (:id/accept, :id/dismiss и т.д.)
 */
router.get('/:id',
  authenticateToken,
  requireRole('moderator', 'admin'),
  (req, res, next) => {
    console.log('[REPORTS ROUTES] Get report by ID route called:', req.params.id);
    getReportById(req, res, next);
  }
);

// Логирование всех зарегистрированных маршрутов
console.log('[REPORTS ROUTES] Routes registered:');
router.stack.forEach((r) => {
  if (r.route) {
    console.log(`  ${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
  }
});

module.exports = router;

