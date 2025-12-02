const { Op } = require('sequelize');
const { Listing, Car, User, Image, Favorite } = require('../models');
const logger = require('../utils/logger');
const {
  getRelativePathFromAbsolute,
  deleteStoredFile
} = require('../services/storageService');

/**
 * Создание нового объявления
 * POST /api/listings
 * Требует аутентификации
 */
const createListing = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      // Данные автомобиля
      make,
      model,
      year,
      mileage,
      bodyType,
      engineType,
      transmission,
      color,
      vin,
      extra,
      // Данные объявления
      title,
      price,
      currency = 'EUR',
      description,
      city,
      region
    } = req.body;

    // Валидация обязательных полей
    if (!make || !model || !year || !title || !price) {
      return res.status(400).json({
        error: 'Отсутствуют обязательные поля: make, model, year, title, price'
      });
    }

    // Валидация цены
    if (price <= 0 || price > 999999999999.99) {
      return res.status(400).json({
        error: 'Некорректная цена'
      });
    }

    // Валидация года
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({
        error: `Год должен быть в диапазоне от 1900 до ${currentYear + 1}`
      });
    }

    // Создание или поиск автомобиля
    let car;
    const [carInstance, created] = await Car.findOrCreate({
      where: {
        make,
        model,
        year,
        ...(vin ? { vin } : {})
      },
      defaults: {
        make,
        model,
        year,
        mileage: mileage || null,
        bodyType: bodyType || null,
        engineType: engineType || null,
        transmission: transmission || null,
        color: color || null,
        vin: vin || null,
        extra: extra || null
      }
    });
    car = carInstance;

    // Создание объявления
    const listing = await Listing.create({
      userId,
      carId: car.carId,
      title,
      price,
      currency: currency.toUpperCase(),
      description: description || null,
      city: city || null,
      region: region || null,
      status: 'pending', // По умолчанию ожидает модерации
      views: 0,
      featured: false
    });

    // Загрузка объявления с связями для ответа
    const createdListing = await Listing.findByPk(listing.listingId, {
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
          as: 'images'
        }
      ]
    });

    logger.info(`Создано объявление ID: ${listing.listingId} пользователем: ${req.user.username}`);

    res.status(201).json({
      message: 'Объявление успешно создано и отправлено на модерацию',
      listing: createdListing
    });
  } catch (error) {
    logger.error('Ошибка при создании объявления:', error);
    next(error);
  }
};

/**
 * Получение списка объявлений с фильтрацией и пагинацией
 * GET /api/listings
 */
const getListings = async (req, res, next) => {
  try {
    const {
      status, // Статус (не устанавливаем по умолчанию, чтобы можно было получить все)
      userId, // Фильтр по пользователю
      minPrice,
      maxPrice,
      make,
      yearFrom,
      yearTo,
      city,
      region,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Нормализация статуса (убираем пробелы, проверяем на пустую строку)
    const normalizedStatus = status && typeof status === 'string' ? status.trim() : null;
    
    // Проверка прав: если пользователь модератор/админ, может видеть все статусы
    const isModerator = req.user && (req.user.role === 'moderator' || req.user.role === 'admin');
    const allowedStatuses = isModerator
      ? ['pending', 'published', 'rejected', 'sold', 'archived']
      : ['published'];

    // Логирование для отладки
    logger.info('Запрос объявлений:', {
      userId: userId || 'не указан',
      currentUserId: req.user ? req.user.userId : 'не авторизован',
      currentUserRole: req.user ? req.user.role : 'не авторизован',
      status: normalizedStatus || 'не указан',
      isModerator
    });

    // Построение условий фильтрации
    const whereConditions = {};
    
    // Фильтр по пользователю (для "Мои объявления")
    let isRequestingOwnListings = false;
    if (userId) {
      const requestedUserId = parseInt(userId);
      
      // Если запрашиваются объявления конкретного пользователя, нужна аутентификация
      if (!req.user) {
        return res.status(401).json({
          error: 'Требуется аутентификация для просмотра объявлений пользователя'
        });
      }
      
      const currentUserId = parseInt(req.user.userId);
      
      // Пользователь может видеть только свои объявления
      if (currentUserId === requestedUserId) {
        isRequestingOwnListings = true;
        whereConditions.userId = requestedUserId;
        // Для своих объявлений показываем все статусы, если статус не указан
        // Если статус указан, фильтруем по нему
        if (normalizedStatus && ['pending', 'published', 'rejected', 'sold', 'archived'].includes(normalizedStatus)) {
          whereConditions.status = normalizedStatus;
        }
        // Если статус не указан, НЕ добавляем фильтр по статусу - показываем все статусы
      } else if (isModerator) {
        // Модераторы могут видеть объявления любого пользователя
        whereConditions.userId = requestedUserId;
        if (normalizedStatus && allowedStatuses.includes(normalizedStatus)) {
          whereConditions.status = normalizedStatus;
        }
      } else {
        return res.status(403).json({
          error: 'Недостаточно прав для просмотра объявлений этого пользователя'
        });
      }
    }

 else if (!userId) {
      // Если userId не указан, это общий список объявлений
      // Если статус указан и разрешен, используем его
      if (normalizedStatus && allowedStatuses.includes(normalizedStatus)) {
        whereConditions.status = normalizedStatus;
      } else if (!isModerator) {
        // Для обычных пользователей без указания статуса показываем только published
        whereConditions.status = 'published';
      }
      // Для модераторов, если статус не указан, показываем все
    }
    
    // Проверка статуса ТОЛЬКО для общих списков (не для своих объявлений)
    // И только если статус явно указан
    if (normalizedStatus && !isRequestingOwnListings && !isModerator) {
      if (!allowedStatuses.includes(normalizedStatus)) {
        logger.warn('Попытка доступа к объявлениям с неразрешенным статусом:', {
          status: normalizedStatus,
          userId: req.user ? req.user.userId : 'не авторизован',
          isRequestingOwnListings
        });
        return res.status(403).json({
          error: 'Недостаточно прав для просмотра объявлений с этим статусом'
        });
      }
    }

    if (minPrice || maxPrice) {
      whereConditions.price = {};
      if (minPrice) whereConditions.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereConditions.price[Op.lte] = parseFloat(maxPrice);
    }

    if (city) {
      whereConditions.city = city;
    }

    if (region) {
      whereConditions.region = region;
    }

    // Поиск по тексту (FULLTEXT)
    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Условия для Car
    const carWhereConditions = {};
    if (make) {
      carWhereConditions.make = make;
    }
    if (req.query.model) {
      carWhereConditions.model = req.query.model;
    }
    if (yearFrom || yearTo) {
      carWhereConditions.year = {};
      if (yearFrom) carWhereConditions.year[Op.gte] = parseInt(yearFrom);
      if (yearTo) carWhereConditions.year[Op.lte] = parseInt(yearTo);
    }
    if (req.query.color) {
      carWhereConditions.color = req.query.color;
    }

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Сортировка
    const validSortFields = ['createdAt', 'price', 'views', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Логирование для отладки
    logger.info('Запрос объявлений:', {
      userId: userId ? parseInt(userId) : null,
      currentUserId: req.user ? parseInt(req.user.userId) : null,
      currentUserRole: req.user ? req.user.role : null,
      status: status || 'не указан',
      whereConditions,
      isAuthenticated: !!req.user
    });

    // Запрос
    const { count, rows } = await Listing.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Car,
          as: 'car',
          where: Object.keys(carWhereConditions).length > 0 ? carWhereConditions : undefined
        },
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl']
        },
        {
          model: Image,
          as: 'images',
          required: false,
          separate: true,
          order: [
            ['isMain', 'DESC'],
            ['uploadedAt', 'ASC'],
            ['imageId', 'ASC']
          ],
          // Для модераторов загружаем все изображения, для обычных пользователей - только главное
          ...(userId || isModerator ? {} : { where: { isMain: true }, limit: 1 })
        }
      ],
      limit: limitNum,
      offset,
      order: [[sortField, order]],
      distinct: true
    });

    // Проверка избранного для авторизованных пользователей
    let favoriteIds = [];
    if (req.user && req.user.userId) {
      const favorites = await Favorite.findAll({
        where: { userId: req.user.userId },
        attributes: ['listingId']
      });
      favoriteIds = favorites.map(f => f.listingId);
    }

    const listings = rows.map(listing => {
      const listingData = listing.toJSON();
      listingData.isFavorite = favoriteIds.includes(listing.listingId);
      return listingData;
    });

    res.json({
      listings,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      },
      filters: {
        status,
        minPrice,
        maxPrice,
        make,
        yearFrom,
        yearTo,
        city,
        region,
        search
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении списка объявлений:', error);
    next(error);
  }
};

/**
 * Получение объявления по ID
 * GET /api/listings/:id
 */
const getListingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listingId = parseInt(id);

    if (isNaN(listingId)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    // Проверка прав доступа
    const isModerator = req.user && (req.user.role === 'moderator' || req.user.role === 'admin');
    const isOwner = req.user && req.user.userId;

    const listing = await Listing.findByPk(listingId, {
      include: [
        {
          model: Car,
          as: 'car'
        },
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'displayName', 'avatarUrl', 'phone']
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
          separate: true,
          order: [
            ['isMain', 'DESC'],
            ['uploadedAt', 'ASC'],
            ['imageId', 'ASC']
          ]
        },
      ]
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    // Проверка доступа: опубликованные доступны всем, остальные - только владельцу или модератору
    if (listing.status !== 'published' && !isOwner && !isModerator) {
      if (!req.user || listing.userId !== req.user.userId) {
        return res.status(403).json({
          error: 'Нет доступа к этому объявлению'
        });
      }
    }

    // Увеличение счетчика просмотров (только для опубликованных)
    if (listing.status === 'published') {
      await listing.increment('views');
      listing.views += 1;
    }

    // Проверка избранного
    let isFavorite = false;
    if (req.user && req.user.userId) {
      const favorite = await Favorite.findOne({
        where: {
          userId: req.user.userId,
          listingId: listing.listingId
        }
      });
      isFavorite = !!favorite;
    }

    const listingData = listing.toJSON();
    listingData.isFavorite = isFavorite;
    
    // Скрываем контактные данные для неавторизованных или если не владелец
    if (!req.user || listing.userId !== req.user.userId) {
      delete listingData.user.phone;
    }

    res.json({
      listing: listingData
    });
  } catch (error) {
    logger.error('Ошибка при получении объявления:', error);
    next(error);
  }
};

/**
 * Обновление объявления
 * PUT /api/listings/:id
 * Только владелец объявления
 */
const updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listingId = parseInt(id);
    const userId = req.user.userId;

    if (isNaN(listingId)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    // Проверка прав: только владелец может редактировать
    if (listing.userId !== userId) {
      return res.status(403).json({
        error: 'Нет прав на редактирование этого объявления'
      });
    }

    // Нельзя редактировать объявления со статусом sold или archived
    if (listing.status === 'sold' || listing.status === 'archived') {
      return res.status(400).json({
        error: 'Нельзя редактировать проданное или архивированное объявление'
      });
    }

    const {
      title,
      price,
      currency,
      description,
      city,
      region,
      make,
      model,
      year,
      mileage,
      bodyType,
      engineType,
      transmission,
      color,
      vin,
      extra
    } = req.body;

    // Обновление данных объявления
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (price !== undefined) {
      if (price <= 0 || price > 999999999999.99) {
        return res.status(400).json({
          error: 'Некорректная цена'
        });
      }
      updateData.price = price;
    }
    if (currency !== undefined) updateData.currency = currency.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (city !== undefined) updateData.city = city;
    if (region !== undefined) updateData.region = region;

    // Если объявление было отклонено или опубликовано, при редактировании возвращается в pending
    if (updateData.title || updateData.price || updateData.description) {
      if (listing.status === 'rejected' || listing.status === 'published') {
        updateData.status = 'pending';
        updateData.moderatorId = null;
        updateData.moderationDate = null;
        updateData.rejectionReason = null;
      }
      updateData.updatedAt = new Date();
    }

    // Обновление данных автомобиля
    if (make || model || year) {
      const car = await Car.findByPk(listing.carId);
      if (car) {
        const carUpdateData = {};
        if (make) carUpdateData.make = make;
        if (model) carUpdateData.model = model;
        if (year) {
          if (year < 1900 || year > new Date().getFullYear() + 1) {
            return res.status(400).json({
              error: 'Некорректный год'
            });
          }
          carUpdateData.year = year;
        }
        if (mileage !== undefined) carUpdateData.mileage = mileage;
        if (bodyType !== undefined) carUpdateData.bodyType = bodyType;
        if (engineType !== undefined) carUpdateData.engineType = engineType;
        if (transmission !== undefined) carUpdateData.transmission = transmission;
        if (color !== undefined) carUpdateData.color = color;
        if (vin !== undefined) {
          const oldVin = car.vin;
          carUpdateData.vin = vin;
        }
        if (extra !== undefined) carUpdateData.extra = extra;

        await car.update(carUpdateData);
      }
    }

    await listing.update(updateData);

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
          model: Image,
          as: 'images',
          separate: true,
          order: [
            ['isMain', 'DESC'],
            ['uploadedAt', 'ASC'],
            ['imageId', 'ASC']
          ]
        }
      ]
    });

    logger.info(`Объявление обновлено ID: ${listingId} пользователем: ${req.user.username}`);

    res.json({
      message: 'Объявление успешно обновлено',
      listing: updatedListing
    });
  } catch (error) {
    logger.error('Ошибка при обновлении объявления:', error);
    next(error);
  }
};

/**
 * Удаление объявления
 * DELETE /api/listings/:id
 * Только владелец объявления
 */
const deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listingId = parseInt(id);
    const userId = req.user.userId;

    if (isNaN(listingId)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    // Проверка прав: только владелец может удалить
    if (listing.userId !== userId) {
      return res.status(403).json({
        error: 'Нет прав на удаление этого объявления'
      });
    }

    await listing.destroy();

    logger.info(`Объявление удалено ID: ${listingId} пользователем: ${req.user.username}`);

    res.json({
      message: 'Объявление успешно удалено'
    });
  } catch (error) {
    logger.error('Ошибка при удалении объявления:', error);
    next(error);
  }
};

/**
 * Одобрение объявления (публикация)
 * POST /api/listings/:id/approve
 * Только модератор/админ
 */
const approveListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listingId = parseInt(id);
    const moderatorId = req.user.userId;

    if (isNaN(listingId)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    if (listing.status !== 'pending') {
      return res.status(400).json({
        error: 'Можно одобрять только объявления со статусом "pending"'
      });
    }

    await listing.update({
      status: 'published',
      moderatorId,
      moderationDate: new Date(),
      rejectionReason: null
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
          attributes: ['userId', 'username', 'displayName']
        }
      ]
    });

    logger.info(`Объявление одобрено ID: ${listingId} модератором: ${req.user.username}`);

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
 * POST /api/listings/:id/reject
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

    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    if (listing.status !== 'pending') {
      return res.status(400).json({
        error: 'Можно отклонять только объявления со статусом "pending"'
      });
    }

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
          attributes: ['userId', 'username', 'displayName']
        }
      ]
    });

    logger.info(`Объявление отклонено ID: ${listingId} модератором: ${req.user.username}`);

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
 * Загрузка изображений для объявления
 * POST /api/listings/:id/images
 */
const addListingImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listingId = parseInt(id);

    if (isNaN(listingId)) {
      return res.status(400).json({
        error: 'Некорректный ID объявления'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Не загружено ни одного изображения'
      });
    }

    const listing = await Listing.findByPk(listingId, {
      include: [
        {
          model: Image,
          as: 'images'
        }
      ]
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    const isOwner = req.user && req.user.userId === listing.userId;
    const isModerator = req.user && (req.user.role === 'moderator' || req.user.role === 'admin');

    if (!isOwner && !isModerator) {
      return res.status(403).json({
        error: 'Нет прав для изменения фотографий этого объявления'
      });
    }

    const hasMainImage = listing.images && listing.images.some((img) => img.isMain);

    const createdImages = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const relativePath = getRelativePathFromAbsolute(file.path);

      if (!relativePath) {
        continue;
      }

      const image = await Image.create({
        listingId,
        imageUrl: relativePath,
        caption: file.originalname ? file.originalname.slice(0, 248) : null,
        isMain: !hasMainImage && i === 0
      });

      createdImages.push(image);
    }

    logger.info(`Добавлены фотографии к объявлению ${listingId}`, {
      userId: req.user.userId,
      files: req.files.length
    });

    res.status(201).json({
      message: 'Фотографии успешно добавлены',
      images: createdImages.map((image) => image.toJSON())
    });
  } catch (error) {
    logger.error('Ошибка при загрузке изображений объявления:', error);
    next(error);
  }
};

/**
 * Удаление изображения объявления
 * DELETE /api/listings/:id/images/:imageId
 */
const deleteListingImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    const listingId = parseInt(id);
    const imageIdInt = parseInt(imageId);

    if (isNaN(listingId) || isNaN(imageIdInt)) {
      return res.status(400).json({
        error: 'Некорректные параметры'
      });
    }

    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    const isOwner = req.user && req.user.userId === listing.userId;
    const isModerator = req.user && (req.user.role === 'moderator' || req.user.role === 'admin');

    if (!isOwner && !isModerator) {
      return res.status(403).json({
        error: 'Нет прав для изменения фотографий этого объявления'
      });
    }

    const image = await Image.findOne({
      where: {
        imageId: imageIdInt,
        listingId
      }
    });

    if (!image) {
      return res.status(404).json({
        error: 'Изображение не найдено'
      });
    }

    const wasMain = image.isMain;
    const storedPath = image.getDataValue('imageUrl');

    await image.destroy();
    await deleteStoredFile(storedPath);

    if (wasMain) {
      const nextImage = await Image.findOne({
        where: { listingId },
        order: [
          ['uploadedAt', 'ASC'],
          ['imageId', 'ASC']
        ]
      });

      if (nextImage) {
        await nextImage.update({ isMain: true });
      }
    }

    logger.info(`Удалено изображение ${imageIdInt} для объявления ${listingId}`, {
      userId: req.user.userId
    });

    res.json({
      message: 'Изображение удалено'
    });
  } catch (error) {
    logger.error('Ошибка при удалении изображения объявления:', error);
    next(error);
  }
};

/**
 * Установка главного изображения
 * PATCH /api/listings/:id/images/:imageId/main
 */
const setListingMainImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    const listingId = parseInt(id);
    const imageIdInt = parseInt(imageId);

    if (isNaN(listingId) || isNaN(imageIdInt)) {
      return res.status(400).json({
        error: 'Некорректные параметры'
      });
    }

    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({
        error: 'Объявление не найдено'
      });
    }

    const isOwner = req.user && req.user.userId === listing.userId;
    const isModerator = req.user && (req.user.role === 'moderator' || req.user.role === 'admin');

    if (!isOwner && !isModerator) {
      return res.status(403).json({
        error: 'Нет прав для изменения фотографий этого объявления'
      });
    }

    const image = await Image.findOne({
      where: {
        imageId: imageIdInt,
        listingId
      }
    });

    if (!image) {
      return res.status(404).json({
        error: 'Изображение не найдено'
      });
    }

    await Image.update(
      { isMain: false },
      { where: { listingId } }
    );

    await image.update({ isMain: true });

    logger.info(`Главное изображение обновлено для объявления ${listingId}`, {
      userId: req.user.userId,
      imageId: imageIdInt
    });

    res.json({
      message: 'Главное изображение обновлено',
      image: image.toJSON()
    });
  } catch (error) {
    logger.error('Ошибка при обновлении главного изображения:', error);
    next(error);
  }
};

module.exports = {
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
};

