const express = require('express');
const router = express.Router();

const {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  approveListing,
  rejectListing,
  addListingImages,
  deleteListingImage,
  setListingMainImage
} = require('../controllers/listingController');

const { authenticateToken, optionalAuthenticate, requireRole } = require('../middleware/auth');
const { sanitizeBody, requireFields } = require('../middleware/validation');
const { listingImagesUpload } = require('../middleware/upload');

/**
 * @route   GET /api/listings
 * @desc    Получение списка объявлений с фильтрацией и пагинацией
 * @access  Public (опубликованные), Private (все статусы для модераторов)
 * Используем опциональную аутентификацию - если токен есть, устанавливаем req.user
 */
router.get('/', optionalAuthenticate, getListings);

/**
 * @route   GET /api/listings/:id
 * @desc    Получение объявления по ID
 * @access  Public (опубликованные), Private (все для владельца/модератора)
 */
router.get('/:id', getListingById);

/**
 * @route   POST /api/listings/:id/images
 * @desc    Загрузка изображений для объявления
 * @access  Private (владелец или модератор)
 */
router.post('/:id/images',
  authenticateToken,
  listingImagesUpload,
  addListingImages
);

/**
 * @route   DELETE /api/listings/:id/images/:imageId
 * @desc    Удаление изображения объявления
 * @access  Private (владелец или модератор)
 */
router.delete('/:id/images/:imageId',
  authenticateToken,
  deleteListingImage
);

/**
 * @route   PATCH /api/listings/:id/images/:imageId/main
 * @desc    Установка главного изображения
 * @access  Private (владелец или модератор)
 */
router.patch('/:id/images/:imageId/main',
  authenticateToken,
  setListingMainImage
);

/**
 * @route   POST /api/listings
 * @desc    Создание нового объявления
 * @access  Private
 */
router.post('/',
  authenticateToken,
  sanitizeBody,
  requireFields('make', 'model', 'year', 'title', 'price'),
  createListing
);

/**
 * @route   PUT /api/listings/:id
 * @desc    Обновление объявления
 * @access  Private (только владелец)
 */
router.put('/:id',
  authenticateToken,
  sanitizeBody,
  updateListing
);

/**
 * @route   DELETE /api/listings/:id
 * @desc    Удаление объявления
 * @access  Private (только владелец)
 */
router.delete('/:id',
  authenticateToken,
  deleteListing
);

/**
 * @route   POST /api/listings/:id/approve
 * @desc    Одобрение объявления (публикация)
 * @access  Private (модератор/админ)
 */
router.post('/:id/approve',
  authenticateToken,
  requireRole('moderator', 'admin'),
  approveListing
);

/**
 * @route   POST /api/listings/:id/reject
 * @desc    Отклонение объявления
 * @access  Private (модератор/админ)
 */
router.post('/:id/reject',
  authenticateToken,
  requireRole('moderator', 'admin'),
  sanitizeBody,
  requireFields('reason'),
  rejectListing
);

module.exports = router;

