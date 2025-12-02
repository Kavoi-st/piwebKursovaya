/**
 * Middleware для централизованной обработки ошибок
 * Все ошибки должны передаваться через next(error)
 */

/**
 * Обработчик ошибок Express (последний middleware)
 */
const errorHandler = (err, req, res, next) => {
  // Логирование ошибки
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  // Ошибка валидации Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Ошибка валидации данных',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Ошибка уникальности Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Конфликт: запись с такими данными уже существует',
      field: err.errors[0]?.path
    });
  }

  // Ошибка внешнего ключа Sequelize
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Ошибка связности данных: связанная запись не найдена'
    });
  }

  // Ошибка базы данных
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      error: 'Ошибка базы данных'
    });
  }

  // JWT ошибки
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Невалидный токен'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Токен истек'
    });
  }

  if (err.name === 'MulterError') {
    let message = 'Ошибка загрузки файла';

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Размер файла превышает допустимый предел';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = err.message || 'Недопустимый тип файла';
    }

    return res.status(400).json({
      error: message
    });
  }

  // Стандартные HTTP ошибки
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message || 'Произошла ошибка'
    });
  }

  // Неожиданные ошибки (500)
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Внутренняя ошибка сервера'
  });
};

/**
 * Middleware для обработки 404 ошибок (несуществующие маршруты)
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: `Маршрут ${req.method} ${req.originalUrl} не найден`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};

