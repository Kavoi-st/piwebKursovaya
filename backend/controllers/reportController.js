const { Op } = require('sequelize');
const { Report, Listing, Comment, User, Car } = require('../models');
const logger = require('../utils/logger');

/**
 * Создание жалобы на объявление или комментарий
 * POST /api/reports
 * Требует аутентификации
 */
const createReport = async (req, res, next) => {
  try {
    const reporterId = req.user.userId;
    const { listingId, commentId, reason, details } = req.body;

    // Валидация: должно быть указано либо listingId, либо commentId (но не оба одновременно)
    if (!listingId && !commentId) {
      return res.status(400).json({
        error: 'Необходимо указать listingId или commentId'
      });
    }

    if (listingId && commentId) {
      return res.status(400).json({
        error: 'Нельзя указать одновременно listingId и commentId'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Необходимо указать причину жалобы'
      });
    }

    // Проверка существования объявления (если указано)
    if (listingId) {
      const listingIdNum = parseInt(listingId);
      if (isNaN(listingIdNum)) {
        return res.status(400).json({
          error: 'Некорректный ID объявления'
        });
      }

      const listing = await Listing.findByPk(listingIdNum);

      if (!listing) {
        return res.status(404).json({
          error: 'Объявление не найдено'
        });
      }

      // Проверка, не жаловался ли уже пользователь на это объявление
      const existingReport = await Report.findOne({
        where: {
          reporterId,
          listingId: listingIdNum,
          status: { [Op.in]: ['open', 'in_progress'] }
        }
      });

      if (existingReport) {
        return res.status(409).json({
          error: 'Вы уже подали жалобу на это объявление. Ожидайте рассмотрения.'
        });
      }

      // Создание жалобы на объявление
      const report = await Report.create({
        reporterId,
        listingId: listingIdNum,
        commentId: null,
        reason: reason.trim(),
        details: details ? details.trim() : null,
        status: 'open'
      });

      const createdReport = await Report.findByPk(report.reportId, {
        include: [
          {
            model: Listing,
            as: 'listing',
            attributes: ['listingId', 'title', 'status'],
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['userId', 'username', 'displayName']
              }
            ]
          },
          {
            model: User,
            as: 'reporter',
            attributes: ['userId', 'username', 'displayName']
          }
        ]
      });

      logger.info(`Создана жалоба на объявление: reportId=${report.reportId}, listingId=${listingIdNum}, reporterId=${reporterId}`);

      res.status(201).json({
        message: 'Жалоба успешно создана и отправлена на рассмотрение',
        report: createdReport
      });
    }

    // Проверка существования комментария (если указано)
    if (commentId) {
      const commentIdNum = parseInt(commentId);
      if (isNaN(commentIdNum)) {
        return res.status(400).json({
          error: 'Некорректный ID комментария'
        });
      }

      const comment = await Comment.findByPk(commentIdNum);

      if (!comment) {
        return res.status(404).json({
          error: 'Комментарий не найден'
        });
      }

      // Проверка, не жаловался ли уже пользователь на этот комментарий
      const existingReport = await Report.findOne({
        where: {
          reporterId,
          commentId: commentIdNum,
          status: { [Op.in]: ['open', 'in_progress'] }
        }
      });

      if (existingReport) {
        return res.status(409).json({
          error: 'Вы уже подали жалобу на этот комментарий. Ожидайте рассмотрения.'
        });
      }

      // Создание жалобы на комментарий
      const report = await Report.create({
        reporterId,
        listingId: null,
        commentId: commentIdNum,
        reason: reason.trim(),
        details: details ? details.trim() : null,
        status: 'open'
      });

      const createdReport = await Report.findByPk(report.reportId, {
        include: [
          {
            model: Comment,
            as: 'comment',
            attributes: ['commentId', 'content', 'postedAt'],
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['userId', 'username', 'displayName']
              },
              {
                model: Listing,
                as: 'listing',
                attributes: ['listingId', 'title']
              }
            ]
          },
          {
            model: User,
            as: 'reporter',
            attributes: ['userId', 'username', 'displayName']
          }
        ]
      });

      logger.info(`Создана жалоба на комментарий: reportId=${report.reportId}, commentId=${commentIdNum}, reporterId=${reporterId}`);

      res.status(201).json({
        message: 'Жалоба успешно создана и отправлена на рассмотрение',
        report: createdReport
      });
    }
  } catch (error) {
    logger.error('Ошибка при создании жалобы:', error);
    next(error);
  }
};

/**
 * Получение списка всех жалоб
 * GET /api/reports
 * Только модератор/админ
 */
const getReports = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Построение условий фильтрации
    const whereConditions = {};
    if (status) {
      const validStatuses = ['open', 'in_progress', 'resolved', 'dismissed'];
      if (validStatuses.includes(status)) {
        whereConditions.status = status;
      }
    }

    // Сортировка
    const validSortFields = ['createdAt', 'handledAt', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Получение жалоб
    const { count, rows } = await Report.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: User,
          as: 'handler',
          attributes: ['userId', 'username', 'displayName'],
          required: false
        },
        {
          model: Listing,
          as: 'listing',
          attributes: ['listingId', 'title', 'status', 'price'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['userId', 'username', 'displayName']
            }
          ],
          required: false
        },
        {
          model: Comment,
          as: 'comment',
          attributes: ['commentId', 'content', 'postedAt', 'isHidden'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['userId', 'username', 'displayName']
            },
            {
              model: Listing,
              as: 'listing',
              attributes: ['listingId', 'title']
            }
          ],
          required: false
        }
      ],
      order: [[sortField, order]],
      limit: limitNum,
      offset,
      distinct: true
    });

    res.json({
      reports: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      },
      filters: {
        status
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении списка жалоб:', error);
    next(error);
  }
};

/**
 * Получение жалобы по ID
 * GET /api/reports/:id
 * Только модератор/админ
 */
const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return res.status(400).json({
        error: 'Некорректный ID жалобы'
      });
    }

    const report = await Report.findByPk(reportId, {
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl', 'email']
        },
        {
          model: User,
          as: 'handler',
          attributes: ['userId', 'username', 'displayName'],
          required: false
        },
        {
          model: Listing,
          as: 'listing',
          attributes: ['listingId', 'title', 'status', 'price', 'description'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['userId', 'username', 'displayName', 'email']
            },
            {
              model: Car,
              as: 'car'
            }
          ],
          required: false
        },
        {
          model: Comment,
          as: 'comment',
          attributes: ['commentId', 'content', 'postedAt', 'isHidden'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['userId', 'username', 'displayName']
            },
            {
              model: Listing,
              as: 'listing',
              attributes: ['listingId', 'title']
            }
          ],
          required: false
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        error: 'Жалоба не найдена'
      });
    }

    res.json({
      report
    });
  } catch (error) {
    logger.error('Ошибка при получении жалобы:', error);
    next(error);
  }
};

/**
 * Обновление статуса жалобы
 * PUT /api/reports/:id/status
 * Только модератор/админ
 */
const updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, details } = req.body;
    const handlerId = req.user.userId;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return res.status(400).json({
        error: 'Некорректный ID жалобы'
      });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'dismissed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Статус должен быть одним из: ${validStatuses.join(', ')}`
      });
    }

    const report = await Report.findByPk(reportId, {
      include: [
        {
          model: Listing,
          as: 'listing',
          required: false
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        error: 'Жалоба не найдена'
      });
    }

    // Если жалоба принимается (resolved) и она на объявление - удаляем объявление
    if (status === 'resolved' && report.listingId && report.listing) {
      // Удаляем объявление (меняем статус на 'archived' или удаляем физически)
      await report.listing.update({ status: 'archived' });
      logger.info(`Объявление удалено по жалобе: listingId=${report.listingId}, reportId=${reportId}`);
    }

    // Обновление статуса
    const updateData = {
      status,
      handledBy: handlerId,
      handledAt: new Date()
    };

    if (details) {
      // Можно добавить дополнительную информацию при обработке
      // В данном случае details уже есть в модели, но можно расширить
    }

    await report.update(updateData);

    // Загрузка обновленной жалобы
    const updatedReport = await Report.findByPk(reportId, {
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['userId', 'username', 'displayName']
        },
        {
          model: User,
          as: 'handler',
          attributes: ['userId', 'username', 'displayName']
        },
        {
          model: Listing,
          as: 'listing',
          required: false
        },
        {
          model: Comment,
          as: 'comment',
          required: false
        }
      ]
    });

    logger.info(`Статус жалобы обновлен: reportId=${reportId}, статус=${status}, handlerId=${handlerId}`);

    res.json({
      message: 'Статус жалобы успешно обновлен',
      report: updatedReport
    });
  } catch (error) {
    logger.error('Ошибка при обновлении статуса жалобы:', error);
    next(error);
  }
};

/**
 * Принятие жалобы (удаление объявления)
 * POST /api/reports/:id/accept
 * Только модератор/админ
 */
const acceptReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const handlerId = req.user.userId;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return res.status(400).json({
        error: 'Некорректный ID жалобы'
      });
    }

    const report = await Report.findByPk(reportId, {
      include: [
        {
          model: Listing,
          as: 'listing',
          required: false
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        error: 'Жалоба не найдена'
      });
    }

    if (!report.listingId || !report.listing) {
      return res.status(400).json({
        error: 'Жалоба не связана с объявлением'
      });
    }

    // Удаляем объявление (меняем статус на 'archived')
    await report.listing.update({ status: 'archived' });

    // Обновляем статус жалобы
    await report.update({
      status: 'resolved',
      handledBy: handlerId,
      handledAt: new Date()
    });

    const updatedReport = await Report.findByPk(reportId, {
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['userId', 'username', 'displayName']
        },
        {
          model: User,
          as: 'handler',
          attributes: ['userId', 'username', 'displayName']
        },
        {
          model: Listing,
          as: 'listing',
          required: false
        }
      ]
    });

    logger.info(`Жалоба принята, объявление удалено: reportId=${reportId}, listingId=${report.listingId}, handlerId=${handlerId}`);

    res.json({
      message: 'Жалоба принята, объявление удалено',
      report: updatedReport
    });
  } catch (error) {
    logger.error('Ошибка при принятии жалобы:', error);
    next(error);
  }
};

/**
 * Отклонение жалобы
 * POST /api/reports/:id/dismiss
 * Только модератор/админ
 */
const dismissReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const handlerId = req.user.userId;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return res.status(400).json({
        error: 'Некорректный ID жалобы'
      });
    }

    const report = await Report.findByPk(reportId);

    if (!report) {
      return res.status(404).json({
        error: 'Жалоба не найдена'
      });
    }

    // Обновляем статус жалобы
    await report.update({
      status: 'dismissed',
      handledBy: handlerId,
      handledAt: new Date()
    });

    const updatedReport = await Report.findByPk(reportId, {
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['userId', 'username', 'displayName']
        },
        {
          model: User,
          as: 'handler',
          attributes: ['userId', 'username', 'displayName']
        },
        {
          model: Listing,
          as: 'listing',
          required: false
        }
      ]
    });

    logger.info(`Жалоба отклонена: reportId=${reportId}, handlerId=${handlerId}`);

    res.json({
      message: 'Жалоба отклонена',
      report: updatedReport
    });
  } catch (error) {
    logger.error('Ошибка при отклонении жалобы:', error);
    next(error);
  }
};

/**
 * Получение жалоб, поданных текущим пользователем
 * GET /api/reports/my
 * Требует аутентификации
 */
const getMyReports = async (req, res, next) => {
  try {
    const reporterId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const { count, rows } = await Report.findAndCountAll({
      where: { reporterId },
      include: [
        {
          model: User,
          as: 'handler',
          attributes: ['userId', 'username', 'displayName'],
          required: false
        },
        {
          model: Listing,
          as: 'listing',
          attributes: ['listingId', 'title', 'status'],
          required: false
        },
        {
          model: Comment,
          as: 'comment',
          attributes: ['commentId', 'content'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true
    });

    res.json({
      reports: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении жалоб пользователя:', error);
    next(error);
  }
};

module.exports = {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  getMyReports,
  acceptReport,
  dismissReport
};

