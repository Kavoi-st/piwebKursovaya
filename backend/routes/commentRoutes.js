const express = require('express');
const router = express.Router();

const {
  getCommentsByListing,
  createComment,
  deleteComment,
  toggleCommentVisibility
} = require('../controllers/commentController');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { sanitizeBody, requireFields } = require('../middleware/validation');

/**
 * @route   GET /api/comments/listing/:listingId
 * @desc    Получение комментариев к объявлению
 * @access  Public
 */
router.get('/listing/:listingId', getCommentsByListing);

/**
 * @route   POST /api/comments
 * @desc    Добавление комментария к объявлению
 * @access  Private
 */
router.post('/',
  authenticateToken,
  sanitizeBody,
  requireFields('listingId', 'content'),
  createComment
);

/**
 * @route   DELETE /api/comments/:id
 * @desc    Удаление комментария
 * @access  Private (автор или модератор/админ)
 */
router.delete('/:id',
  authenticateToken,
  deleteComment
);

/**
 * @route   PUT /api/comments/:id/hide
 * @desc    Скрытие/показ комментария
 * @access  Private (модератор/админ)
 */
router.put('/:id/hide',
  authenticateToken,
  requireRole('moderator', 'admin'),
  sanitizeBody,
  requireFields('isHidden'),
  toggleCommentVisibility
);

module.exports = router;

