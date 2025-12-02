const { Favorite, Listing, Car, User, Image } = require('../models');
const logger = require('../utils/logger');

/**
 * Получение списка избранных объявлений пользователя
 * GET /api/favorites
 * Требует аутентификации
 */
const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, sortBy = 'addedAt', sortOrder = 'DESC' } = req.query;

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Сортировка
    const validSortFields = ['addedAt', 'createdAt', 'price'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'addedAt';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Получение избранных объявлений через Favorite с join
    const { count, rows } = await Favorite.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Listing,
          as: 'listing',
          where: {
            status: 'published'
          },
          include: [
            {
              model: Car,
              as: 'car'
            },
            {
              model: User,
              as: 'user',
              attributes: ['userId', 'username', 'displayName', 'avatarUrl']
            },
            {
              model: Image,
              as: 'images',
              where: { isMain: true },
              required: false,
              limit: 1
            }
          ],
          required: true
        }
      ],
      limit: limitNum,
      offset,
      order: sortField === 'addedAt'
        ? [['addedAt', order]]
        : [[{ model: Listing, as: 'listing' }, sortField, order]],
      distinct: true
    });

    // Формирование ответа
    const favorites = rows
      .filter(fav => fav.listing) // Фильтруем удаленные объявления
      .map(favorite => {
        const favoriteData = favorite.toJSON();
        const listing = favoriteData.listing;
        return {
          favoriteId: favorite.listingId,
          addedAt: favorite.addedAt,
          listing: {
            ...listing,
            isFavorite: true
          }
        };
      });

    res.json({
      favorites,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении избранных объявлений:', error);
    next(error);
  }
};

/**
 * Добавление объявления в избранное
 * POST /api/favorites/:listingId
 * Требует аутентификации
 */
const addToFavorites = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { listingId } = req.params;
    const listingIdNum = parseInt(listingId);

    if (isNaN(listingIdNum)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    // Проверка существования объявления
    const listing = await Listing.findByPk(listingIdNum);

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    // Проверка доступа: нельзя добавить в избранное неопубликованные объявления
    if (listing.status !== 'published') {
      return res.status(400).json({
        error: 'Можно добавить в избранное только опубликованные объявления'
      });
    }

    // Проверка, не является ли пользователь владельцем объявления
    if (listing.userId === userId) {
      return res.status(400).json({
        error: 'Нельзя добавить свое собственное объявление в избранное'
      });
    }

    // Проверка, не добавлено ли уже в избранное
    const existingFavorite = await Favorite.findOne({
      where: {
        userId,
        listingId: listingIdNum
      }
    });

    if (existingFavorite) {
      return res.status(409).json({
        error: 'Объявление уже в избранном'
      });
    }

    // Добавление в избранное
    const favorite = await Favorite.create({
      userId,
      listingId: listingIdNum
    });

    // Загрузка объявления для ответа
    const favoriteListing = await Listing.findByPk(listingIdNum, {
      include: [
        {
          model: Car,
          as: 'car'
        },
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: Image,
          as: 'images',
          where: { isMain: true },
          required: false,
          limit: 1
        }
      ]
    });

    logger.info(`Объявление добавлено в избранное: listingId=${listingIdNum}, userId=${userId}`);

    res.status(201).json({
      message: 'Объявление успешно добавлено в избранное',
      favorite: {
        addedAt: favorite.addedAt,
        listing: {
          ...favoriteListing.toJSON(),
          isFavorite: true
        }
      }
    });
  } catch (error) {
    logger.error('Ошибка при добавлении в избранное:', error);
    next(error);
  }
};

/**
 * Удаление объявления из избранного
 * DELETE /api/favorites/:listingId
 * Требует аутентификации
 */
const removeFromFavorites = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { listingId } = req.params;
    const listingIdNum = parseInt(listingId);

    if (isNaN(listingIdNum)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    // Поиск записи в избранном
    const favorite = await Favorite.findOne({
      where: {
        userId,
        listingId: listingIdNum
      }
    });

    if (!favorite) {
      return res.status(404).json({
        error: 'Объявление не найдено в избранном'
      });
    }

    // Удаление из избранного
    await favorite.destroy();

    logger.info(`Объявление удалено из избранного: listingId=${listingIdNum}, userId=${userId}`);

    res.json({
      message: 'Объявление успешно удалено из избранного'
    });
  } catch (error) {
    logger.error('Ошибка при удалении из избранного:', error);
    next(error);
  }
};

/**
 * Переключение статуса избранного (добавить/удалить)
 * POST /api/favorites/:listingId/toggle
 * Требует аутентификации
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { listingId } = req.params;
    const listingIdNum = parseInt(listingId);

    if (isNaN(listingIdNum)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    // Проверка существования объявления
    const listing = await Listing.findByPk(listingIdNum);

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    // Проверка доступа
    if (listing.status !== 'published') {
      return res.status(400).json({
        error: 'Можно добавить в избранное только опубликованные объявления'
      });
    }

    if (listing.userId === userId) {
      return res.status(400).json({
        error: 'Нельзя добавить свое собственное объявление в избранное'
      });
    }

    // Проверка текущего статуса
    const existingFavorite = await Favorite.findOne({
      where: {
        userId,
        listingId: listingIdNum
      }
    });

    if (existingFavorite) {
      // Удаление из избранного
      await existingFavorite.destroy();
      logger.info(`Объявление удалено из избранного (toggle): listingId=${listingIdNum}, userId=${userId}`);
      
      return res.json({
        message: 'Объявление удалено из избранного',
        isFavorite: false
      });
    } else {
      // Добавление в избранное
      const favorite = await Favorite.create({
        userId,
        listingId: listingIdNum
      });

      logger.info(`Объявление добавлено в избранное (toggle): listingId=${listingIdNum}, userId=${userId}`);

      return res.json({
        message: 'Объявление добавлено в избранное',
        isFavorite: true,
        addedAt: favorite.addedAt
      });
    }
  } catch (error) {
    logger.error('Ошибка при переключении избранного:', error);
    next(error);
  }
};

/**
 * Проверка, находится ли объявление в избранном
 * GET /api/favorites/:listingId/check
 * Требует аутентификации
 */
const checkFavorite = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { listingId } = req.params;
    const listingIdNum = parseInt(listingId);

    if (isNaN(listingIdNum)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    const favorite = await Favorite.findOne({
      where: {
        userId,
        listingId: listingIdNum
      }
    });

    res.json({
      isFavorite: !!favorite,
      addedAt: favorite ? favorite.addedAt : null
    });
  } catch (error) {
    logger.error('Ошибка при проверке избранного:', error);
    next(error);
  }
};

module.exports = {
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  toggleFavorite,
  checkFavorite
};

