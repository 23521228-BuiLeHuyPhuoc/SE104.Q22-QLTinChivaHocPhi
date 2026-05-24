const { v2: cloudinary } = require('cloudinary');

const normalizeEnv = (value) => String(value || '').trim();

const getCloudinaryConfig = () => ({
  cloud_name: normalizeEnv(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: normalizeEnv(process.env.CLOUDINARY_API_KEY),
  api_secret: normalizeEnv(process.env.CLOUDINARY_API_SECRET)
});

const isCloudinaryConfigured = () => {
  const config = getCloudinaryConfig();
  return Boolean(config.cloud_name && config.api_key && config.api_secret);
};

const getMissingCloudinaryConfig = () => {
  const config = getCloudinaryConfig();
  const required = [
    ['CLOUDINARY_CLOUD_NAME', config.cloud_name],
    ['CLOUDINARY_API_KEY', config.api_key],
    ['CLOUDINARY_API_SECRET', config.api_secret]
  ];
  return required
    .filter(([, value]) => !value)
    .map(([name]) => name);
};

const configureCloudinary = () => {
  const config = getCloudinaryConfig();
  cloudinary.config({
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    api_secret: config.api_secret,
    secure: true
  });
};

const uploadAvatarBuffer = (buffer, options = {}) => {
  if (!isCloudinaryConfigured()) {
    const error = new Error('CLOUDINARY_NOT_CONFIGURED');
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    error.missing = getMissingCloudinaryConfig();
    throw error;
  }

  configureCloudinary();
  const folder = normalizeEnv(process.env.CLOUDINARY_AVATAR_FOLDER) || 'ql-tin-chi/avatars';
  const publicId = options.publicId || `avatar-${Date.now()}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        transformation: [
          { width: 512, height: 512, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};

module.exports = {
  isCloudinaryConfigured,
  getMissingCloudinaryConfig,
  uploadAvatarBuffer
};
