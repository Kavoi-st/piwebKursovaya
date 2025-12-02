const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const {
  LISTINGS_DIR,
  AVATARS_DIR,
  ensureDirExists,
  getRelativePathFromAbsolute
} = require('../services/storageService');

const MAX_LISTING_IMAGES = parseInt(process.env.MAX_LISTING_IMAGES || '8', 10);
const MAX_AVATAR_SIZE_MB = parseInt(process.env.MAX_AVATAR_SIZE_MB || '5', 10);
const MAX_LISTING_IMAGE_SIZE_MB = parseInt(process.env.MAX_LISTING_IMAGE_SIZE_MB || '8', 10);

const MULTER_LIMITS = {
  avatar: MAX_AVATAR_SIZE_MB * 1024 * 1024,
  listing: MAX_LISTING_IMAGE_SIZE_MB * 1024 * 1024
};

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/jpg'
]);

const createUploadError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const generateFileName = (originalName = '') => {
  const safeExt = path.extname(originalName).toLowerCase() || '.jpg';
  const uniqueSuffix = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString('hex');
  return `${Date.now()}-${uniqueSuffix}${safeExt}`;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = req.uploadTargetDir || LISTINGS_DIR;
    ensureDirExists(targetDir);
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Допустимы только изображения (JPG, PNG, WebP, GIF, AVIF)'));
  }
  cb(null, true);
};

const listingUploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MULTER_LIMITS.listing
  }
}).array('images', MAX_LISTING_IMAGES);

const avatarUploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MULTER_LIMITS.avatar
  }
}).single('avatar');

const listingImagesUpload = (req, res, next) => {
  req.uploadTargetDir = LISTINGS_DIR;

  listingUploader(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.files || req.files.length === 0) {
      return next(createUploadError('Не выбрано ни одного изображения'));
    }

    next();
  });
};

const avatarUpload = (req, res, next) => {
  req.uploadTargetDir = AVATARS_DIR;

  avatarUploader(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return next(createUploadError('Файл аватара не загружен'));
    }

    next();
  });
};

const mapUploadedFiles = (files = []) =>
  files.map((file) => ({
    relativePath: getRelativePathFromAbsolute(file.path),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  }));

const mapUploadedFile = (file) => {
  if (!file) {
    return null;
  }

  return {
    relativePath: getRelativePathFromAbsolute(file.path),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
};

module.exports = {
  listingImagesUpload,
  avatarUpload,
  mapUploadedFiles,
  mapUploadedFile,
  MAX_LISTING_IMAGES
};


