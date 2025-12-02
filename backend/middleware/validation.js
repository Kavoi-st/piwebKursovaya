/**
 * Middleware для валидации входящих данных
 * Базовые функции валидации для защиты от XSS и проверки формата данных
 */

/**
 * Базовый санитайзер строковых значений (защита от XSS)
 * @param {string} str - Строка для очистки
 * @returns {string} Очищенная строка
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // Удаляем потенциально опасные символы
    .trim();
};

/**
 * Валидация email
 * @param {string} email - Email для проверки
 * @returns {boolean} true если email валиден
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Валидация пароля (минимум 6 символов, хотя бы одна буква и цифра)
 * @param {string} password - Пароль для проверки
 * @returns {boolean} true если пароль соответствует требованиям
 */
const isValidPassword = (password) => {
  if (typeof password !== 'string' || password.length < 6) {
    return false;
  }
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
};

/**
 * Middleware для санитизации тела запроса
 * Очищает все строковые поля от потенциально опасных символов
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.body);
  }
  next();
};

/**
 * Middleware для валидации обязательных полей
 * @param {...string} requiredFields - Список обязательных полей
 * @returns {Function} Express middleware function
 */
const requireFields = (...requiredFields) => {
  return (req, res, next) => {
    const missing = requiredFields.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Отсутствуют обязательные поля',
        missing: missing
      });
    }
    
    next();
  };
};

module.exports = {
  sanitizeString,
  isValidEmail,
  isValidPassword,
  sanitizeBody,
  requireFields
};

