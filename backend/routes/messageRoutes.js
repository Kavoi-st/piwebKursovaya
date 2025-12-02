const express = require('express');
const router = express.Router();

const {
  getConversations,
  getConversation,
  sendMessage,
  markAsRead,
  getUnreadCount,
  sendMessageToSeller
} = require('../controllers/messageController');

const { authenticateToken } = require('../middleware/auth');
const { sanitizeBody, requireFields } = require('../middleware/validation');

/**
 * @route   GET /api/messages/conversations
 * @desc    Получение списка диалогов пользователя
 * @access  Private
 */
router.get('/conversations', authenticateToken, getConversations);

/**
 * @route   GET /api/messages/conversation/:userId
 * @desc    Получение переписки с конкретным пользователем
 * @access  Private
 */
router.get('/conversation/:userId', authenticateToken, getConversation);

/**
 * @route   GET /api/messages/unread-count
 * @desc    Получение количества непрочитанных сообщений
 * @access  Private
 */
router.get('/unread-count', authenticateToken, getUnreadCount);

/**
 * @route   POST /api/messages
 * @desc    Отправка сообщения
 * @access  Private
 */
router.post('/',
  authenticateToken,
  sanitizeBody,
  requireFields('receiverId', 'content'),
  sendMessage
);

/**
 * @route   POST /api/messages/listing/:listingId
 * @desc    Отправка сообщения продавцу по объявлению (быстрый способ)
 * @access  Private
 */
router.post('/listing/:listingId',
  authenticateToken,
  sanitizeBody,
  requireFields('content'),
  sendMessageToSeller
);

/**
 * @route   PUT /api/messages/:id/read
 * @desc    Отметка сообщения как прочитанного
 * @access  Private
 */
router.put('/:id/read',
  authenticateToken,
  markAsRead
);

module.exports = router;

