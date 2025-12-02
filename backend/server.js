const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sanitizeBody } = require('./middleware/validation');
const logger = require('./utils/logger');
const currencyService = require('./services/currencyService');

const app = express();

// ====================
// Security Middleware
// ====================

// Helmet для защиты HTTP заголовков
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:*"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS настройка
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting для защиты от DDoS
// Более мягкий лимит для общих эндпоинтов (публичные данные)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000, // максимум 1000 запросов с одного IP за окно (увеличено для нормальной работы)
  message: 'Слишком много запросов с этого IP, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем rate limiting для локальных запросов в development
    return process.env.NODE_ENV === 'development' && (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip.startsWith('::ffff:127.0.0.1'));
  }
});

// Более строгий лимит для аутентификации
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 20, // максимум 20 попыток входа за окно
  message: 'Слишком много попыток входа, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false
});

// Очень мягкий лимит для публичных данных (чтение объявлений, комментариев, курсов валют)
const publicDataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 200, // максимум 200 запросов в минуту для публичных данных
  message: 'Слишком много запросов, попробуйте через минуту',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем rate limiting для локальных запросов в development
    return process.env.NODE_ENV === 'development' && (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip.startsWith('::ffff:127.0.0.1'));
  }
});

// Применяем лимиты
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
// Публичные данные - более мягкий лимит (применяется перед общим лимитом)
app.use('/api/listings/:id', publicDataLimiter);
app.use('/api/comments/listing/:id', publicDataLimiter);
app.use('/api/currency/rates', publicDataLimiter);
app.use('/api/vin-check/:id', publicDataLimiter);
app.use('/api/av-by-check/:id', publicDataLimiter);
// Остальные API - общий лимит
app.use('/api/', generalLimiter);

// ====================
// Body Parsing & Sanitization
// ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeBody); // Защита от XSS

// Папка со статическими файлами (загруженные изображения)
// Добавляем CORS заголовки для статических файлов
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', corsOptions.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// ====================
// Routes
// ====================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/listings', require('./routes/listingRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/favorites', require('./routes/favoriteRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/moderation', require('./routes/moderationRoutes'));
app.use('/api/currency', require('./routes/currencyRoutes'));
// TODO: Подключить остальные маршруты
// и т.д.

// ====================
// Error Handling
// ====================
app.use(notFoundHandler); // 404 для несуществующих маршрутов
app.use(errorHandler); // Обработка всех ошибок

// ====================
// Server Start
// ====================
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Проверка подключения к базе данных
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('Не удалось подключиться к базе данных');
      process.exit(1);
    }

    // Запуск сервера
    app.listen(PORT, () => {
      logger.info(`🚀 Сервер запущен на порту ${PORT}`);
      logger.info(`📝 Окружение: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5500'}`);
      
      // Запускаем автоматическое обновление курсов валют
      currencyService.startAutoUpdate();
    });
  } catch (error) {
    logger.error('Ошибка при запуске сервера:', error);
    process.exit(1);
  }
}

// Обработка необработанных ошибок
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();

module.exports = app;

