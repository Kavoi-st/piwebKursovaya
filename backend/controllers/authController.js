const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { isValidEmail, isValidPassword } = require('../middleware/validation');
const logger = require('../utils/logger');
const {
  getRelativePathFromAbsolute,
  deleteStoredFile,
  isExternalUrl
} = require('../services/storageService');

/**
 * Регистрация нового пользователя
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, displayName, phone } = req.body;

    // Валидация обязательных полей
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Отсутствуют обязательные поля: username, email, password'
      });
    }

    // Валидация формата данных
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Некорректный формат email'
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: 'Пароль должен содержать минимум 6 символов, включая буквы и цифры'
      });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        error: 'Имя пользователя должно содержать от 3 до 50 символов'
      });
    }

    // Проверка на существование пользователя
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({
        error: `Пользователь с таким ${field === 'email' ? 'email' : 'именем пользователя'} уже существует`
      });
    }

    // Хеширование пароля
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Создание пользователя
    const user = await User.create({
      username,
      email,
      passwordHash,
      displayName: displayName || username,
      phone: phone || null,
      role: 'user', // По умолчанию обычный пользователь
      isActive: true
    });

    // Генерация JWT токена
    const token = generateToken({
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Удаление пароля из ответа
    const userResponse = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      registrationDate: user.registrationDate
    };

    logger.info(`Новый пользователь зарегистрирован: ${user.username} (${user.email})`);

    res.status(201).json({
      message: 'Регистрация успешна',
      user: userResponse,
      token
    });
  } catch (error) {
    logger.error('Ошибка при регистрации:', error);
    next(error);
  }
};

/**
 * Авторизация пользователя
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Валидация обязательных полей
    if (!email || !password) {
      return res.status(400).json({
        error: 'Требуются email и пароль'
      });
    }

    // Поиск пользователя по email
    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Неверный email или пароль'
      });
    }

    // Проверка активности пользователя
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Аккаунт деактивирован. Обратитесь к администратору'
      });
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Неверный email или пароль'
      });
    }

    // Обновление времени последнего входа
    await user.update({
      lastLogin: new Date()
    });

    // Генерация JWT токена
    const token = generateToken({
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Подготовка ответа
    const userResponse = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin
    };

    logger.info(`Пользователь авторизован: ${user.username} (${user.email})`);

    res.json({
      message: 'Авторизация успешна',
      user: userResponse,
      token
    });
  } catch (error) {
    logger.error('Ошибка при авторизации:', error);
    next(error);
  }
};

/**
 * Получение текущего пользователя
 * GET /api/auth/me
 * Требует аутентификации (middleware authenticateToken)
 */
const getCurrentUser = async (req, res, next) => {
  try {
    // req.user устанавливается middleware authenticateToken
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: 'Пользователь не авторизован'
      });
    }

    // Получение полной информации о пользователе из БД
    const user = await User.findByPk(req.user.userId, {
      attributes: {
        exclude: ['passwordHash'] // Исключаем пароль из ответа
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Аккаунт деактивирован'
      });
    }

    res.json({
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isActive: user.isActive,
        registrationDate: user.registrationDate,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    logger.error('Ошибка при получении текущего пользователя:', error);
    next(error);
  }
};

/**
 * Обновление профиля текущего пользователя
 * PUT /api/auth/profile
 * Требует аутентификации
 */
const updateProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: 'Пользователь не авторизован'
      });
    }

    const { displayName, phone, avatarUrl } = req.body;

    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    // Обновление только разрешенных полей
    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    await user.update(updateData);

    const userResponse = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin
    };

    logger.info(`Профиль обновлен: ${user.username}`);

    res.json({
      message: 'Профиль успешно обновлен',
      user: userResponse
    });
  } catch (error) {
    logger.error('Ошибка при обновлении профиля:', error);
    next(error);
  }
};

/**
 * Смена пароля
 * PUT /api/auth/change-password
 * Требует аутентификации
 */
const changePassword = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: 'Пользователь не авторизован'
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Требуются текущий и новый пароль'
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        error: 'Новый пароль должен содержать минимум 6 символов, включая буквы и цифры'
      });
    }

    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    // Проверка текущего пароля
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Неверный текущий пароль'
      });
    }

    // Хеширование нового пароля
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await user.update({ passwordHash });

    logger.info(`Пароль изменен: ${user.username}`);

    res.json({
      message: 'Пароль успешно изменен'
    });
  } catch (error) {
    logger.error('Ошибка при смене пароля:', error);
    next(error);
  }
};

/**
 * Получение информации о пользователе по ID
 * GET /api/auth/user/:userId
 * Требует аутентификации
 */
const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestedUserId = parseInt(userId);

    if (isNaN(requestedUserId)) {
      return res.status(400).json({
        error: 'Некорректный ID пользователя'
      });
    }

    // Получение информации о пользователе
    const user = await User.findByPk(requestedUserId, {
      attributes: {
        exclude: ['passwordHash'] // Исключаем пароль
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    // Определяем статус онлайн/оффлайн на основе lastLogin
    // Считаем пользователя онлайн, если он заходил в последние 15 минут
    let isOnline = false;
    if (user.lastLogin) {
      const lastLoginTime = new Date(user.lastLogin).getTime();
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000; // 15 минут в миллисекундах
      isOnline = (now - lastLoginTime) < fifteenMinutes;
    }

    res.json({
      userId: user.userId,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      isCompany: user.isCompany,
      companyName: user.companyName,
      companyDescription: user.companyDescription,
      isOnline
    });
  } catch (error) {
    logger.error('Ошибка при получении пользователя:', error);
    next(error);
  }
};

/**
 * Загрузка аватара пользователя
 * PUT /api/auth/profile/avatar
 */
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: 'Пользователь не авторизован'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Файл аватара не загружен'
      });
    }

    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    const previousAvatarPath = user.getDataValue('avatarUrl');
    const relativePath = getRelativePathFromAbsolute(req.file.path);

    await user.update({
      avatarUrl: relativePath
    });

    if (previousAvatarPath && !isExternalUrl(previousAvatarPath)) {
      await deleteStoredFile(previousAvatarPath);
    }

    const userResponse = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin
    };

    logger.info(`Аватар обновлен: ${user.username}`);

    res.json({
      message: 'Аватар успешно обновлен',
      user: userResponse
    });
  } catch (error) {
    logger.error('Ошибка при загрузке аватара:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  getUserById,
  uploadAvatar
};

