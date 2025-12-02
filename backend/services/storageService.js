const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const UPLOADS_ROOT = process.env.UPLOADS_ROOT || path.join(__dirname, '..', 'uploads');
const LISTINGS_DIR = path.join(UPLOADS_ROOT, 'listings');
const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');

const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirExists(UPLOADS_ROOT);
ensureDirExists(LISTINGS_DIR);
ensureDirExists(AVATARS_DIR);

const getDefaultAppUrl = () => {
  const appUrlFromEnv = process.env.APP_URL;
  if (appUrlFromEnv) {
    return appUrlFromEnv.replace(/\/$/, '');
  }

  // Используем порт из переменной окружения или из server.js
  const port = process.env.PORT || 3000;
  // Убеждаемся, что порт - это число
  const portNum = parseInt(port, 10) || 3000;
  return `http://localhost:${portNum}`;
};

// Формируем URL для статических файлов
// Используем ленивую инициализацию, чтобы порт был установлен правильно
let STORAGE_PUBLIC_URL_CACHE = null;

const getStoragePublicUrl = () => {
  if (STORAGE_PUBLIC_URL_CACHE) {
    return STORAGE_PUBLIC_URL_CACHE;
  }
  
  if (process.env.STORAGE_PUBLIC_URL) {
    STORAGE_PUBLIC_URL_CACHE = process.env.STORAGE_PUBLIC_URL.replace(/\/$/, '');
  } else {
    const baseUrl = getDefaultAppUrl();
    STORAGE_PUBLIC_URL_CACHE = `${baseUrl}/uploads`.replace(/\/$/, '');
  }
  
  return STORAGE_PUBLIC_URL_CACHE;
};

const isExternalUrl = (value = '') => /^https?:\/\//i.test(value);

const normalizeRelativePath = (value = '') => value.replace(/\\/g, '/').replace(/^\/+/, '');

const buildPublicUrl = (value) => {
  if (!value) {
    return null;
  }

  if (isExternalUrl(value)) {
    return value;
  }

  const normalized = normalizeRelativePath(value);
  const storageUrl = getStoragePublicUrl();
  return `${storageUrl}/${normalized}`;
};

const getRelativePathFromAbsolute = (absolutePath) => {
  if (!absolutePath) {
    return null;
  }

  const relativePath = path.relative(UPLOADS_ROOT, absolutePath);
  return normalizeRelativePath(relativePath);
};

const deleteStoredFile = async (relativePath) => {
  if (!relativePath || isExternalUrl(relativePath)) {
    return;
  }

  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const absolutePath = path.join(UPLOADS_ROOT, normalizedRelativePath);

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('Не удалось удалить файл из хранилища', {
        path: absolutePath,
        error: error.message
      });
    }
  }
};

module.exports = {
  UPLOADS_ROOT,
  LISTINGS_DIR,
  AVATARS_DIR,
  ensureDirExists,
  buildPublicUrl,
  getRelativePathFromAbsolute,
  deleteStoredFile,
  isExternalUrl,
  normalizeRelativePath
};


