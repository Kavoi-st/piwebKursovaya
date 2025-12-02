const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware для проверки JWT токена и извлечения информации о пользователе
 * Добавляет req.user с данными пользователя, если токен валиден
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Токен доступа не предоставлен' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Невалидный или истекший токен' 
      });
    }
    // Сохраняем данные пользователя из токена
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };

    // Обновляем время последнего входа (активности) пользователя
    // Это поможет определить статус онлайн/оффлайн
    try {
      const User = require('../models/User');
      const user = await User.findByPk(decoded.userId);
      if (user) {
        // Обновляем lastLogin при каждом запросе (можно сделать реже, например, раз в минуту)
        // Для оптимизации можно использовать кэш или обновлять только раз в минуту
        const now = new Date();
        const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
        // Обновляем только если прошло больше минуты с последнего обновления
        if (!lastLogin || (now - lastLogin) > 60000) {
          await user.update({ lastLogin: now });
        }
      }
    } catch (updateError) {
      // Игнорируем ошибки обновления, чтобы не ломать основной запрос
      console.error('Ошибка при обновлении активности пользователя:', updateError);
    }

    next();
  });
};

/**
 * Опциональная аутентификация - устанавливает req.user если токен есть, но не требует его
 */
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Если токена нет, просто продолжаем без req.user
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Если токен невалиден, продолжаем без req.user
      return next();
    }
    // Сохраняем данные пользователя из токена
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    next();
  });
};

/**
 * Middleware для проверки роли пользователя
 * @param {...string} allowedRoles - Разрешенные роли (user, moderator, admin)
 * @returns {Function} Express middleware function
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Требуется аутентификация' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Недостаточно прав доступа' 
      });
    }

    next();
  };
};

/**
 * Middleware для проверки, что пользователь является владельцем ресурса или модератором/админом
 * @param {Function} getResourceUserId - Функция, получающая user_id ресурса из параметров запроса
 * @returns {Function} Express middleware function
 */
const requireOwnershipOrModerator = (getResourceUserId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Требуется аутентификация' 
      });
    }

    const resourceUserId = await getResourceUserId(req);
    const isOwner = req.user.userId === resourceUserId;
    const isModerator = req.user.role === 'moderator' || req.user.role === 'admin';

    if (!isOwner && !isModerator) {
      return res.status(403).json({ 
        error: 'Нет прав на выполнение этого действия' 
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuthenticate,
  requireRole,
  requireOwnershipOrModerator
};
