/**
 * Простой логгер для приложения
 * В будущем можно расширить для использования библиотеки типа winston
 */

/**
 * Логирование информационного сообщения
 * @param {string} message - Сообщение для логирования
 * @param {object} data - Дополнительные данные
 */
const info = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] INFO: ${message}`, Object.keys(data).length > 0 ? data : '');
};

/**
 * Логирование предупреждения
 * @param {string} message - Сообщение для логирования
 * @param {object} data - Дополнительные данные
 */
const warn = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] WARN: ${message}`, Object.keys(data).length > 0 ? data : '');
};

/**
 * Логирование ошибки
 * @param {string} message - Сообщение для логирования
 * @param {Error} error - Объект ошибки
 */
const error = (message, error = null) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error || '');
};

module.exports = {
  info,
  warn,
  error
};

