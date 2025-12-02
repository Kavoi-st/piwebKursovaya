const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Генерация JWT токена для пользователя
 * @param {object} user - Объект пользователя с userId, username, email, role
 * @returns {string} JWT токен
 */
const generateToken = (user) => {
  const payload = {
    userId: user.userId,
    username: user.username,
    email: user.email,
    role: user.role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Верификация JWT токена
 * @param {string} token - JWT токен
 * @returns {object|null} Декодированные данные пользователя или null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
};

