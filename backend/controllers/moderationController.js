const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Listing, Car, User, Image, ModerationLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Получение списка непроверенных объявлений (pending)
 * GET /api/moderation/pending
 * Только модератор/админ
 */
const getPendingListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'ASC' } = req.query;

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Сортировка
    const validSortFields = ['createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Получение непроверенных объявлений
    const { count, rows } = await Listing.findAndCountAll({
      where: {
        status: 'pending'
      },
      include: [
        {
          model: Car,
          as: 'car',
          required: true
        },
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl', 'email', 'phone', 'registrationDate']
        },
        {
          model: Image,
          as: 'images',
          required: false,
          separate: true,
          order: [['isMain', 'DESC'], ['uploadedAt', 'ASC'], ['imageId', 'ASC']]
        }
      ],
      order: [[sortField, order]],
      limit: limitNum,
      offset,
      distinct: true
    });

    res.json({
      listings: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении непроверенных объявлений:', error);
    next(error);
  }
};

/**
 * Получение объявления для модерации по ID
 * GET /api/moderation/listing/:id
 * Только модератор/админ
 */
const getListingForModeration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listingId = parseInt(id);

    if (isNaN(listingId)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    const listing = await Listing.findByPk(listingId, {
      include: [
        {
          model: Car,
          as: 'car',
          required: true
        },
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl', 'email', 'phone', 'registrationDate']
        },
        {
          model: Image,
          as: 'images',
          order: [['isMain', 'DESC'], ['uploadedAt', 'ASC']]
        },
        {
          model: ModerationLog,
          as: 'moderationLogs',
          include: [
            {
              model: User,
              as: 'moderator',
              attributes: ['userId', 'username', 'displayName'],
              required: false
            }
          ],
          order: [['changedAt', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    // Модераторы могут просматривать все объявления, не только pending
    // Но лучше показывать предупреждение, если статус не pending
    if (listing.status !== 'pending') {
      return res.json({
        warning: 'Объявление уже обработано',
        listing
      });
    }

    res.json({
      listing
    });
  } catch (error) {
    logger.error('Ошибка при получении объявления для модерации:', error);
    next(error);
  }
};

/**
 * Подтверждение объявления (публикация)
 * POST /api/moderation/listing/:id/approve
 * Только модератор/админ
 */
const approveListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { featured } = req.body; // Опционально: сделать объявление рекомендованным
    const listingId = parseInt(id);
    const moderatorId = req.user.userId;

    if (isNaN(listingId)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    const listing = await Listing.findByPk(listingId, {
      include: [
        {
          model: Car,
          as: 'car'
        },
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName']
        }
      ]
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    if (listing.status !== 'pending') {
      return res.status(400).json({
        error: `Нельзя одобрить объявление со статусом "${listing.status}". Только объявления со статусом "pending" могут быть одобрены.`
      });
    }

    // Обновление статуса
    await listing.update({
      status: 'published',
      moderatorId,
      moderationDate: new Date(),
      rejectionReason: null,
      featured: featured === true || false // Можно сразу сделать рекомендованным
    });

    // Загрузка обновленного объявления
    const updatedListing = await Listing.findByPk(listingId, {
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
          model: User,
          as: 'moderator',
          attributes: ['userId', 'username', 'displayName'],
          required: false
        },
        {
          model: Image,
          as: 'images',
          limit: 5
        }
      ]
    });

    logger.info(`Объявление одобрено: listingId=${listingId}, moderatorId=${moderatorId}`);

    res.json({
      message: 'Объявление успешно одобрено и опубликовано',
      listing: updatedListing
    });
  } catch (error) {
    logger.error('Ошибка при одобрении объявления:', error);
    next(error);
  }
};

/**
 * Отклонение объявления
 * POST /api/moderation/listing/:id/reject
 * Только модератор/админ
 */
const rejectListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const listingId = parseInt(id);
    const moderatorId = req.user.userId;

    if (isNaN(listingId)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Требуется указать причину отклонения'
      });
    }

    const listing = await Listing.findByPk(listingId, {
      include: [
        {
          model: Car,
          as: 'car'
        },
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'email']
        }
      ]
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    if (listing.status !== 'pending') {
      return res.status(400).json({
        error: `Нельзя отклонить объявление со статусом "${listing.status}". Только объявления со статусом "pending" могут быть отклонены.`
      });
    }

    // Обновление статуса
    await listing.update({
      status: 'rejected',
      moderatorId,
      moderationDate: new Date(),
      rejectionReason: reason.trim()
    });

    // Загрузка обновленного объявления
    const updatedListing = await Listing.findByPk(listingId, {
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
          model: User,
          as: 'moderator',
          attributes: ['userId', 'username', 'displayName'],
          required: false
        }
      ]
    });

    logger.info(`Объявление отклонено: listingId=${listingId}, moderatorId=${moderatorId}, reason="${reason.trim()}"`);

    res.json({
      message: 'Объявление отклонено',
      listing: updatedListing
    });
  } catch (error) {
    logger.error('Ошибка при отклонении объявления:', error);
    next(error);
  }
};

/**
 * Получение статистики модерации
 * GET /api/moderation/stats
 * Только модератор/админ
 */
const getModerationStats = async (req, res, next) => {
  try {
    const { period = 'today' } = req.query; // today, week, month

    let dateFilter = {};
    const now = new Date();
    
    if (period === 'today') {
      dateFilter = {
        [Op.gte]: new Date(now.setHours(0, 0, 0, 0))
      };
    } else if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = {
        [Op.gte]: weekAgo
      };
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = {
        [Op.gte]: monthAgo
      };
    }

    // Статистика по статусам объявлений
    const pendingCount = await Listing.count({
      where: {
        status: 'pending',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    });

    const publishedCount = await Listing.count({
      where: {
        status: 'published',
        ...(Object.keys(dateFilter).length > 0 && { moderationDate: dateFilter })
      }
    });

    const rejectedCount = await Listing.count({
      where: {
        status: 'rejected',
        ...(Object.keys(dateFilter).length > 0 && { moderationDate: dateFilter })
      }
    });

    // Статистика по модерации за период
    const moderationLogsCount = await ModerationLog.count({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { changedAt: dateFilter })
      }
    });

    // Активность модераторов за период
    const moderatorActivity = await ModerationLog.findAll({
      where: {
        moderatorId: { [Op.ne]: null },
        ...(Object.keys(dateFilter).length > 0 && { changedAt: dateFilter })
      },
      include: [
        {
          model: User,
          as: 'moderator',
          attributes: ['userId', 'username', 'displayName'],
          required: false
        }
      ],
      attributes: [
        'moderatorId',
        [sequelize.fn('COUNT', sequelize.col('ModerationLog.log_id')), 'count']
      ],
      group: ['moderatorId'],
      raw: true
    });

    res.json({
      period,
      listings: {
        pending: pendingCount,
        published: publishedCount,
        rejected: rejectedCount,
        total: pendingCount + publishedCount + rejectedCount
      },
      moderation: {
        totalActions: moderationLogsCount,
        moderatorActivity: moderatorActivity.map(item => ({
          moderator: item.moderator,
          count: parseInt(item.count)
        }))
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении статистики модерации:', error);
    next(error);
  }
};

/**
 * Массовое одобрение объявлений
 * POST /api/moderation/batch/approve
 * Только модератор/админ
 */
const batchApprove = async (req, res, next) => {
  try {
    const { listingIds } = req.body;
    const moderatorId = req.user.userId;

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({
        error: 'Необходимо предоставить массив listingIds'
      });
    }

    if (listingIds.length > 50) {
      return res.status(400).json({
        error: 'Максимум 50 объявлений за один раз'
      });
    }

    const listingIdsNum = listingIds.map(id => parseInt(id)).filter(id => !isNaN(id));

    // Получение объявлений со статусом pending
    const listings = await Listing.findAll({
      where: {
        listingId: { [Op.in]: listingIdsNum },
        status: 'pending'
      }
    });

    if (listings.length === 0) {
      return res.status(400).json({
        error: 'Не найдено объявлений со статусом pending для одобрения'
      });
    }

    // Массовое обновление
    await Listing.update(
      {
        status: 'published',
        moderatorId,
        moderationDate: new Date(),
        rejectionReason: null
      },
      {
        where: {
          listingId: { [Op.in]: listings.map(l => l.listingId) }
        }
      }
    );

    logger.info(`Массовое одобрение объявлений: ${listings.length} объявлений, moderatorId=${moderatorId}`);

    res.json({
      message: `Успешно одобрено ${listings.length} объявлений`,
      approvedCount: listings.length,
      listingIds: listings.map(l => l.listingId)
    });
  } catch (error) {
    logger.error('Ошибка при массовом одобрении:', error);
    next(error);
  }
};

/**
 * Получение списка пользователей (только для админа)
 * GET /api/moderation/users
 * Только админ
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Условия поиска
    const whereConditions = {};

    // Фильтр по роли
    if (role && ['user', 'moderator', 'admin'].includes(role)) {
      whereConditions.role = role;
    }

    // Поиск по имени пользователя или email
    if (search && search.trim()) {
      whereConditions[Op.or] = [
        { username: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } },
        { displayName: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    // Получение пользователей
    const { count, rows } = await User.findAndCountAll({
      where: whereConditions,
      attributes: ['userId', 'username', 'email', 'displayName', 'role', 'isActive', 'registrationDate', 'lastLogin'],
      order: [['registrationDate', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true
    });

    res.json({
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении списка пользователей:', error);
    next(error);
  }
};

/**
 * Назначение модератора из числа пользователей (только для админа)
 * POST /api/moderation/users/:id/promote
 * Только админ
 */
const promoteToModerator = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const adminId = req.user.userId;

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'Некорректный ID пользователя'
      });
    }

    // Получение пользователя
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    // Проверка, что пользователь не является админом
    if (user.role === 'admin') {
      return res.status(400).json({
        error: 'Нельзя изменить роль администратора'
      });
    }

    // Проверка, что пользователь не является уже модератором
    if (user.role === 'moderator') {
      return res.status(400).json({
        error: 'Пользователь уже является модератором'
      });
    }

    // Обновление роли
    await user.update({
      role: 'moderator'
    });

    logger.info(`Пользователь назначен модератором: userId=${userId}, adminId=${adminId}`);

    res.json({
      message: 'Пользователь успешно назначен модератором',
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Ошибка при назначении модератора:', error);
    next(error);
  }
};

/**
 * Снятие роли модератора (только для админа)
 * POST /api/moderation/users/:id/demote
 * Только админ
 */
const demoteFromModerator = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const adminId = req.user.userId;

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'Некорректный ID пользователя'
      });
    }

    // Получение пользователя
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    // Проверка, что пользователь не является админом
    if (user.role === 'admin') {
      return res.status(400).json({
        error: 'Нельзя изменить роль администратора'
      });
    }

    // Проверка, что пользователь является модератором
    if (user.role !== 'moderator') {
      return res.status(400).json({
        error: 'Пользователь не является модератором'
      });
    }

    // Обновление роли
    await user.update({
      role: 'user'
    });

    logger.info(`Пользователь снят с роли модератора: userId=${userId}, adminId=${adminId}`);

    res.json({
      message: 'Пользователь успешно снят с роли модератора',
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Ошибка при снятии роли модератора:', error);
    next(error);
  }
};

module.exports = {
  getPendingListings,
  getListingForModeration,
  approveListing,
  rejectListing,
  getModerationStats,
  batchApprove,
  getUsers,
  promoteToModerator,
  demoteFromModerator
};

