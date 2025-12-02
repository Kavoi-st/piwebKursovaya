const { Comment, Listing, User } = require('../models');
const logger = require('../utils/logger');

/**
 * Получение комментариев к объявлению
 * GET /api/comments/listing/:listingId
 */
const getCommentsByListing = async (req, res, next) => {
  try {
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

    // Проверка доступа: скрытые комментарии видны только модераторам
    const isModerator = req.user && (req.user.role === 'moderator' || req.user.role === 'admin');
    const whereConditions = {
      listingId: listingIdNum,
      ...(isModerator ? {} : { isHidden: false })
    };

    // Получение всех комментариев к объявлению
    const comments = await Comment.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: Comment,
          as: 'replies',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['userId', 'username', 'displayName', 'avatarUrl']
            }
          ],
          order: [['postedAt', 'ASC']]
        }
      ],
      order: [['postedAt', 'ASC']]
    });

    // Формирование дерева комментариев (только корневые комментарии с их ответами)
    const rootComments = comments.filter(comment => !comment.parentCommentId);
    
    // Добавление ответов к корневым комментариям
    const commentsTree = rootComments.map(rootComment => {
      const commentData = rootComment.toJSON();
      const replies = comments
        .filter(comment => comment.parentCommentId === rootComment.commentId)
        .map(reply => reply.toJSON());
      commentData.replies = replies;
      return commentData;
    });

    res.json({
      comments: commentsTree,
      total: comments.length
    });
  } catch (error) {
    logger.error('Ошибка при получении комментариев:', error);
    next(error);
  }
};

/**
 * Добавление комментария к объявлению
 * POST /api/comments
 * Требует аутентификации
 */
const createComment = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { listingId, content, parentCommentId } = req.body;

    // Валидация обязательных полей
    if (!listingId || !content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Отсутствуют обязательные поля: listingId, content'
      });
    }

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

    // Проверка доступа: нельзя комментировать неопубликованные объявления (кроме модераторов)
    const isModerator = req.user.role === 'moderator' || req.user.role === 'admin';
    if (listing.status !== 'published' && !isModerator) {
      return res.status(403).json({
        error: 'Можно комментировать только опубликованные объявления'
      });
    }

    // Если указан родительский комментарий, проверяем его существование
    if (parentCommentId) {
      const parentCommentIdNum = parseInt(parentCommentId);
      if (isNaN(parentCommentIdNum)) {
        return res.status(400).json({
          error: 'Некорректный ID родительского комментария'
        });
      }

      const parentComment = await Comment.findByPk(parentCommentIdNum);

      if (!parentComment) {
        return res.status(404).json({
          error: 'Родительский комментарий не найден'
        });
      }

      // Проверка, что родительский комментарий относится к тому же объявлению
      if (parentComment.listingId !== listingIdNum) {
        return res.status(400).json({
          error: 'Родительский комментарий не относится к этому объявлению'
        });
      }

      // Проверка, что родительский комментарий не скрыт
      if (parentComment.isHidden) {
        return res.status(400).json({
          error: 'Нельзя отвечать на скрытый комментарий'
        });
      }
    }

    // Создание комментария
    const comment = await Comment.create({
      listingId: listingIdNum,
      userId,
      parentCommentId: parentCommentId ? parseInt(parentCommentId) : null,
      content: content.trim(),
      isHidden: false
    });

    // Загрузка созданного комментария с данными пользователя
    const createdComment = await Comment.findByPk(comment.commentId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: Comment,
          as: 'parentComment',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['userId', 'username', 'displayName', 'avatarUrl']
            }
          ],
          required: false
        }
      ]
    });

    logger.info(`Создан комментарий ID: ${comment.commentId} пользователем: ${req.user.username} к объявлению: ${listingIdNum}`);

    res.status(201).json({
      message: parentCommentId ? 'Ответ добавлен' : 'Комментарий успешно добавлен',
      comment: createdComment
    });
  } catch (error) {
    logger.error('Ошибка при создании комментария:', error);
    next(error);
  }
};

/**
 * Удаление комментария
 * DELETE /api/comments/:id
 * Только автор комментария или модератор/админ
 */
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const commentId = parseInt(id);
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (isNaN(commentId)) {
      return res.status(400).json({
        error: 'Некорректный ID комментария'
      });
    }

    const comment = await Comment.findByPk(commentId, {
      include: [
        {
          model: Listing,
          as: 'listing',
          attributes: ['listingId', 'status']
        }
      ]
    });

    if (!comment) {
      return res.status(404).json({
        error: 'Комментарий не найден'
      });
    }

    // Проверка прав: только автор или модератор/админ могут удалить
    const isAuthor = comment.userId === userId;
    const isModerator = userRole === 'moderator' || userRole === 'admin';

    if (!isAuthor && !isModerator) {
      return res.status(403).json({
        error: 'Нет прав на удаление этого комментария'
      });
    }

    // Если комментарий имеет ответы, вместо удаления помечаем как скрытый (для модераторов)
    // Или удаляем полностью, если это делает автор и нет ответов
    const replies = await Comment.findAll({
      where: { parentCommentId: commentId }
    });

    if (replies.length > 0) {
      // Если есть ответы, модератор может скрыть комментарий
      if (isModerator) {
        await comment.update({ isHidden: true });
        logger.info(`Комментарий скрыт ID: ${commentId} модератором: ${req.user.username}`);
        return res.json({
          message: 'Комментарий скрыт (имеет ответы, полное удаление невозможно)'
        });
      } else {
        // Автор не может удалить комментарий с ответами
        return res.status(400).json({
          error: 'Нельзя удалить комментарий, на который есть ответы'
        });
      }
    }

    // Удаление комментария
    await comment.destroy();

    logger.info(`Комментарий удален ID: ${commentId} пользователем: ${req.user.username}`);

    res.json({
      message: 'Комментарий успешно удален'
    });
  } catch (error) {
    logger.error('Ошибка при удалении комментария:', error);
    next(error);
  }
};

/**
 * Скрытие/показ комментария (только для модераторов)
 * PUT /api/comments/:id/hide
 * Только модератор/админ
 */
const toggleCommentVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isHidden } = req.body;
    const commentId = parseInt(id);

    if (isNaN(commentId)) {
      return res.status(400).json({
        error: 'Некорректный ID комментария'
      });
    }

    if (typeof isHidden !== 'boolean') {
      return res.status(400).json({
        error: 'Поле isHidden должно быть boolean'
      });
    }

    const comment = await Comment.findByPk(commentId);

    if (!comment) {
      return res.status(404).json({
        error: 'Комментарий не найден'
      });
    }

    await comment.update({ isHidden });

    const updatedComment = await Comment.findByPk(commentId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        }
      ]
    });

    logger.info(`Комментарий ${isHidden ? 'скрыт' : 'показан'} ID: ${commentId} модератором: ${req.user.username}`);

    res.json({
      message: `Комментарий ${isHidden ? 'скрыт' : 'показан'}`,
      comment: updatedComment
    });
  } catch (error) {
    logger.error('Ошибка при изменении видимости комментария:', error);
    next(error);
  }
};

module.exports = {
  getCommentsByListing,
  createComment,
  deleteComment,
  toggleCommentVisibility
};

