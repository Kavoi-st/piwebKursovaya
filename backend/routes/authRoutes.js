const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  getUserById,
  uploadAvatar
} = require('../controllers/authController');

const { authenticateToken } = require('../middleware/auth');
const { requireFields, sanitizeBody } = require('../middleware/validation');
const { avatarUpload } = require('../middleware/upload');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * @route   POST /api/auth/register
 * @desc    Регистрация нового пользователя
 * @access  Public
 */
router.post('/register', 
  sanitizeBody,
  requireFields('username', 'email', 'password'),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Авторизация пользователя
 * @access  Public
 */
router.post('/login',
  sanitizeBody,
  requireFields('email', 'password'),
  login
);

/**
 * @route   GET /api/auth/me
 * @desc    Получение текущего авторизованного пользователя
 * @access  Private
 */
router.get('/me', authenticateToken, getCurrentUser);

/**
 * @route   PUT /api/auth/profile
 * @desc    Обновление профиля текущего пользователя
 * @access  Private
 */
router.put('/profile', 
  authenticateToken,
  sanitizeBody,
  updateProfile
);

/**
 * @route   PUT /api/auth/profile/avatar
 * @desc    Загрузка нового аватара
 * @access  Private
 */
router.put('/profile/avatar',
  authenticateToken,
  avatarUpload,
  uploadAvatar
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Смена пароля текущего пользователя
 * @access  Private
 */
router.put('/change-password',
  authenticateToken,
  sanitizeBody,
  requireFields('currentPassword', 'newPassword'),
  changePassword
);

/**
 * @route   GET /api/auth/user/:userId
 * @desc    Получение информации о пользователе по ID
 * @access  Private
 */
router.get('/user/:userId',
  authenticateToken,
  getUserById
);

/**
 * @route   GET /api/auth/profile/:userId
 * @desc    Получение публичной информации о пользователе по ID (для отображения информации о компании)
 * @access  Public
 */
router.get('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestedUserId = parseInt(userId);

    if (isNaN(requestedUserId)) {
      return res.status(400).json({
        error: 'Некорректный ID пользователя'
      });
    }

    // Получение публичной информации о пользователе
    const user = await User.findByPk(requestedUserId, {
      attributes: {
        exclude: ['passwordHash', 'email'] // Исключаем пароль и email для безопасности
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    // Возвращаем только публичную информацию
    res.json({
      user: {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isCompany: user.isCompany,
        companyName: user.companyName,
        companyDescription: user.companyDescription,
        registrationDate: user.registrationDate
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении публичной информации о пользователе:', error);
    next(error);
  }
});

module.exports = router;

