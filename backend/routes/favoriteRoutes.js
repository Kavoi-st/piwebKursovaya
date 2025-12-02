const express = require('express');
const router = express.Router();

const {
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  toggleFavorite,
  checkFavorite
} = require('../controllers/favoriteController');

const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/favorites
 * @desc    Получение списка избранных объявлений пользователя
 * @access  Private
 */
router.get('/', authenticateToken, getFavorites);

/**
 * @route   GET /api/favorites/:listingId/check
 * @desc    Проверка, находится ли объявление в избранном
 * @access  Private
 */
router.get('/:listingId/check', authenticateToken, checkFavorite);

/**
 * @route   POST /api/favorites/:listingId
 * @desc    Добавление объявления в избранное
 * @access  Private
 */
router.post('/:listingId', authenticateToken, addToFavorites);

/**
 * @route   DELETE /api/favorites/:listingId
 * @desc    Удаление объявления из избранного
 * @access  Private
 */
router.delete('/:listingId', authenticateToken, removeFromFavorites);

/**
 * @route   POST /api/favorites/:listingId/toggle
 * @desc    Переключение статуса избранного (добавить/удалить)
 * @access  Private
 */
router.post('/:listingId/toggle', authenticateToken, toggleFavorite);

module.exports = router;

