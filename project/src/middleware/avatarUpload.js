const multer = require('multer');

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.AVATAR_MAX_SIZE_BYTES || 3 * 1024 * 1024)
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('INVALID_AVATAR_TYPE'));
    }
    cb(null, true);
  }
});

const avatarUploadMiddleware = (req, res, next) => {
  upload.single('avatar')(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Anh dai dien khong duoc vuot qua 3MB'
      });
    }

    if (error.message === 'INVALID_AVATAR_TYPE') {
      return res.status(400).json({
        success: false,
        message: 'Chi ho tro anh JPG, PNG, WebP hoac GIF'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Khong the doc file anh dai dien'
    });
  });
};

module.exports = {
  avatarUploadMiddleware
};
