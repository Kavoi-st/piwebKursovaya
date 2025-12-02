const express = require('express');
const router = express.Router();

const {
  getPendingListings,
  getListingForModeration,
  approveListing,
  rejectListing,
  getModerationStats,
  batchApprove,
  getUsers,
  promoteToModerator,
  demoteFromModerator
} = require('../controllers/moderationController');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { sanitizeBody, requireFields } = require('../middleware/validation');

/**
 * @route   GET /api/moderation/pending
 * @desc    Получение списка непроверенных объявлений
 * @access  Private (модератор/админ)
 */
router.get('/pending',
  authenticateToken,
  requireRole('moderator', 'admin'),
  getPendingListings
);

/**
 * @route   GET /api/moderation/listing/:id
 * @desc    Получение объявления для модерации по ID
 * @access  Private (модератор/админ)
 */
router.get('/listing/:id',
  authenticateToken,
  requireRole('moderator', 'admin'),
  getListingForModeration
);

/**
 * @route   POST /api/moderation/listing/:id/approve
 * @desc    Подтверждение объявления (публикация)
 * @access  Private (модератор/админ)
 */
router.post('/listing/:id/approve',
  authenticateToken,
  requireRole('moderator', 'admin'),
  sanitizeBody,
  approveListing
);

/**
 * @route   POST /api/moderation/listing/:id/reject
 * @desc    Отклонение объявления
 * @access  Private (модератор/админ)
 */
router.post('/listing/:id/reject',
  authenticateToken,
  requireRole('moderator', 'admin'),
  sanitizeBody,
  requireFields('reason'),
  rejectListing
);

/**
 * @route   GET /api/moderation/stats
 * @desc    Получение статистики модерации
 * @access  Private (модератор/админ)
 */
router.get('/stats',
  authenticateToken,
  requireRole('moderator', 'admin'),
  getModerationStats
);

/**
 * @route   POST /api/moderation/batch/approve
 * @desc    Массовое одобрение объявлений
 * @access  Private (модератор/админ)
 */
router.post('/batch/approve',
  authenticateToken,
  requireRole('moderator', 'admin'),
  sanitizeBody,
  requireFields('listingIds'),
  batchApprove
);

/**
 * @route   GET /api/moderation/users
 * @desc    Получение списка пользователей
 * @access  Private (только админ)
 */
router.get('/users',
  authenticateToken,
  requireRole('admin'),
  getUsers
);

/**
 * @route   POST /api/moderation/users/:id/promote
 * @desc    Назначение модератора из числа пользователей
 * @access  Private (только админ)
 */
router.post('/users/:id/promote',
  authenticateToken,
  requireRole('admin'),
  promoteToModerator
);

/**
 * @route   POST /api/moderation/users/:id/demote
 * @desc    Снятие роли модератора
 * @access  Private (только админ)
 */
router.post('/users/:id/demote',
  authenticateToken,
  requireRole('admin'),
  demoteFromModerator
);

module.exports = router;

