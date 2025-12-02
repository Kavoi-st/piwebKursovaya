const { Message, User, Listing } = require('../models');
const logger = require('../utils/logger');

/**
 * Получение списка диалогов пользователя
 * GET /api/messages/conversations
 * Требует аутентификации
 */
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Получение всех уникальных собеседников пользователя
    // Находим всех пользователей, с которыми есть переписка
    const sentMessages = await Message.findAll({
      where: { senderId: userId },
      attributes: ['receiverId'],
      group: ['receiverId'],
      raw: true
    });

    const receivedMessages = await Message.findAll({
      where: { receiverId: userId },
      attributes: ['senderId'],
      group: ['senderId'],
      raw: true
    });

    // Объединяем уникальных собеседников
    const interlocutorIds = new Set();
    sentMessages.forEach(msg => interlocutorIds.add(msg.receiverId));
    receivedMessages.forEach(msg => interlocutorIds.add(msg.senderId));

    const interlocutorsArray = Array.from(interlocutorIds);
    const totalConversations = interlocutorsArray.length;

    // Получаем последнее сообщение и информацию о собеседнике для каждого диалога
    const conversations = await Promise.all(
      interlocutorsArray.slice(offset, offset + limitNum).map(async (interlocutorId) => {
        // Получаем информацию о собеседнике
        const interlocutor = await User.findByPk(interlocutorId, {
          attributes: ['userId', 'username', 'displayName', 'avatarUrl', 'lastLogin']
        });

        // Получаем последнее сообщение в переписке
        const lastMessage = await Message.findOne({
          where: {
            [require('sequelize').Op.or]: [
              { senderId: userId, receiverId: interlocutorId },
              { senderId: interlocutorId, receiverId: userId }
            ]
          },
          include: [
            {
              model: Listing,
              as: 'listing',
              attributes: ['listingId', 'title', 'price'],
              required: false
            }
          ],
          order: [['sentAt', 'DESC']]
        });

        // Подсчет непрочитанных сообщений
        const unreadCount = await Message.count({
          where: {
            senderId: interlocutorId,
            receiverId: userId,
            isRead: false
          }
        });

        // Определяем статус онлайн/оффлайн на основе lastLogin
        // Считаем пользователя онлайн, если он заходил в последние 15 минут
        let isOnline = false;
        if (interlocutor && interlocutor.lastLogin) {
          const lastLoginTime = new Date(interlocutor.lastLogin).getTime();
          const now = Date.now();
          const fifteenMinutes = 15 * 60 * 1000; // 15 минут в миллисекундах
          isOnline = (now - lastLoginTime) < fifteenMinutes;
        }

        const interlocutorData = interlocutor ? {
          ...interlocutor.toJSON(),
          isOnline
        } : null;

        return {
          interlocutor: interlocutorData,
          lastMessage: lastMessage ? {
            ...lastMessage.toJSON(),
            isFromMe: lastMessage.senderId === userId
          } : null,
          unreadCount,
          listingId: lastMessage?.listingId || null
        };
      })
    );

    res.json({
      conversations,
      pagination: {
        total: totalConversations,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(totalConversations / limitNum)
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении списка диалогов:', error);
    next(error);
  }
};

/**
 * Получение переписки с конкретным пользователем
 * GET /api/messages/conversation/:userId
 * Требует аутентификации
 */
const getConversation = async (req, res, next) => {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;
    const interlocutorId = parseInt(userId);
    const { listingId, page = 1, limit = 50 } = req.query;

    if (isNaN(interlocutorId)) {
      return res.status(400).json({
        error: 'Некорректный ID пользователя'
      });
    }

    // Проверка существования собеседника
    const interlocutor = await User.findByPk(interlocutorId, {
      attributes: ['userId', 'username', 'displayName', 'avatarUrl', 'lastLogin']
    });

    if (!interlocutor) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    // Нельзя просматривать переписку с самим собой
    if (interlocutorId === currentUserId) {
      return res.status(400).json({
        error: 'Нельзя просматривать переписку с самим собой'
      });
    }

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Построение условий для фильтрации по объявлению (если указано)
    const whereConditions = {
      [require('sequelize').Op.or]: [
        { senderId: currentUserId, receiverId: interlocutorId },
        { senderId: interlocutorId, receiverId: currentUserId }
      ]
    };

    if (listingId) {
      const listingIdNum = parseInt(listingId);
      if (!isNaN(listingIdNum)) {
        whereConditions.listingId = listingIdNum;
      }
    }

    // Получение сообщений
    const { count, rows: messages } = await Message.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: Listing,
          as: 'listing',
          attributes: ['listingId', 'title', 'price', 'status'],
          required: false
        }
      ],
      order: [['sentAt', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true
    });

    // Отмечаем все сообщения как прочитанные (только те, что отправил собеседник текущему пользователю)
    await Message.update(
      { isRead: true },
      {
        where: {
          senderId: interlocutorId,
          receiverId: currentUserId,
          isRead: false
        }
      }
    );

    // Определяем статус онлайн/оффлайн на основе lastLogin
    // Считаем пользователя онлайн, если он заходил в последние 15 минут
    let isOnline = false;
    if (interlocutor && interlocutor.lastLogin) {
      const lastLoginTime = new Date(interlocutor.lastLogin).getTime();
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000; // 15 минут в миллисекундах
      isOnline = (now - lastLoginTime) < fifteenMinutes;
    }

    // Формирование ответа
    const messagesData = messages.map(message => {
      const messageData = message.toJSON();
      return {
        ...messageData,
        isFromMe: messageData.senderId === currentUserId
      };
    });

    const interlocutorData = {
      ...interlocutor.toJSON(),
      isOnline
    };

    res.json({
      interlocutor: interlocutorData,
      messages: messagesData.reverse(), // Переворачиваем для отображения от старых к новым
      pagination: {
        total: count,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении переписки:', error);
    next(error);
  }
};

/**
 * Отправка сообщения
 * POST /api/messages
 * Требует аутентификации
 */
const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, listingId, content } = req.body;

    // Валидация обязательных полей
    if (!receiverId || !content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Отсутствуют обязательные поля: receiverId, content'
      });
    }

    const receiverIdNum = parseInt(receiverId);
    if (isNaN(receiverIdNum)) {
      return res.status(400).json({
        error: 'Некорректный ID получателя'
      });
    }

    // Нельзя отправлять сообщение самому себе
    if (receiverIdNum === senderId) {
      return res.status(400).json({
        error: 'Нельзя отправить сообщение самому себе'
      });
    }

    // Проверка существования получателя
    const receiver = await User.findByPk(receiverIdNum, {
      attributes: ['userId', 'username', 'displayName', 'avatarUrl']
    });

    if (!receiver) {
      return res.status(404).json({
        error: 'Получатель не найден'
      });
    }

    // Проверка существования объявления (если указано)
    let listing = null;
    if (listingId) {
      const listingIdNum = parseInt(listingId);
      if (!isNaN(listingIdNum)) {
        listing = await Listing.findByPk(listingIdNum, {
          attributes: ['listingId', 'title', 'status', 'userId']
        });

        if (!listing) {
          return res.status(404).json({
            error: 'Объявление не найдено'
          });
        }

        // Проверка, что объявление опубликовано
        if (listing.status !== 'published') {
          return res.status(400).json({
            error: 'Можно отправлять сообщения только по опубликованным объявлениям'
          });
        }

        // Проверка, что отправитель не является владельцем объявления
        // (покупатель пишет продавцу, или наоборот)
        // Это не обязательно, но логично - владелец может писать любому, кто писал ему
      }
    }

    // Создание сообщения
    const message = await Message.create({
      senderId,
      receiverId: receiverIdNum,
      listingId: listingId ? parseInt(listingId) : null,
      content: content.trim(),
      isRead: false
    });

    // Загрузка созданного сообщения с данными
    const createdMessage = await Message.findByPk(message.messageId, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: Listing,
          as: 'listing',
          attributes: ['listingId', 'title', 'price', 'status'],
          required: false
        }
      ]
    });

    logger.info(`Сообщение отправлено: messageId=${message.messageId}, от ${senderId} к ${receiverIdNum}`);

    res.status(201).json({
      message: 'Сообщение успешно отправлено',
      data: createdMessage.toJSON()
    });
  } catch (error) {
    logger.error('Ошибка при отправке сообщения:', error);
    next(error);
  }
};

/**
 * Отметка сообщения как прочитанного
 * PUT /api/messages/:id/read
 * Требует аутентификации
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const messageId = parseInt(id);

    if (isNaN(messageId)) {
      return res.status(400).json({
        error: 'Некорректный ID сообщения'
      });
    }

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({
        error: 'Сообщение не найдено'
      });
    }

    // Только получатель может отметить сообщение как прочитанное
    if (message.receiverId !== userId) {
      return res.status(403).json({
        error: 'Нет прав на изменение статуса этого сообщения'
      });
    }

    await message.update({ isRead: true });

    logger.info(`Сообщение отмечено как прочитанное: messageId=${messageId}`);

    res.json({
      message: 'Сообщение отмечено как прочитанное'
    });
  } catch (error) {
    logger.error('Ошибка при отметке сообщения как прочитанного:', error);
    next(error);
  }
};

/**
 * Получение количества непрочитанных сообщений
 * GET /api/messages/unread-count
 * Требует аутентификации
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const unreadCount = await Message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    res.json({
      unreadCount
    });
  } catch (error) {
    logger.error('Ошибка при получении количества непрочитанных сообщений:', error);
    next(error);
  }
};

/**
 * Отправка сообщения продавцу по объявлению (быстрый способ)
 * POST /api/messages/listing/:listingId
 * Требует аутентификации
 */
const sendMessageToSeller = async (req, res, next) => {
  try {
    const senderId = req.user.userId;
    const { listingId } = req.params;
    const { content } = req.body;
    const listingIdNum = parseInt(listingId);

    if (isNaN(listingIdNum)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Отсутствует содержимое сообщения'
      });
    }

    // Получение объявления
    const listing = await Listing.findByPk(listingIdNum, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        }
      ]
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    // Проверка статуса объявления
    if (listing.status !== 'published') {
      return res.status(400).json({
        error: 'Можно отправлять сообщения только по опубликованным объявлениям'
      });
    }

    const receiverId = listing.userId;

    // Проверка, что отправитель не является продавцом
    if (receiverId === senderId) {
      return res.status(400).json({
        error: 'Нельзя отправить сообщение самому себе'
      });
    }

    // Создание сообщения
    const message = await Message.create({
      senderId,
      receiverId,
      listingId: listingIdNum,
      content: content.trim(),
      isRead: false
    });

    // Загрузка созданного сообщения
    const createdMessage = await Message.findByPk(message.messageId, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: Listing,
          as: 'listing',
          attributes: ['listingId', 'title', 'price', 'status']
        }
      ]
    });

    logger.info(`Сообщение продавцу отправлено: messageId=${message.messageId}, listingId=${listingIdNum}`);

    res.status(201).json({
      message: 'Сообщение успешно отправлено продавцу',
      data: createdMessage.toJSON()
    });
  } catch (error) {
    logger.error('Ошибка при отправке сообщения продавцу:', error);
    next(error);
  }
};

module.exports = {
  getConversations,
  getConversation,
  sendMessage,
  markAsRead,
  getUnreadCount,
  sendMessageToSeller
};

