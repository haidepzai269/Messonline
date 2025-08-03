const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Tự chọn thư mục lưu tùy theo route (hoặc req.body.type nếu cần)
    let folder = 'chatbox-others';
    if (req.originalUrl.includes('avatar')) folder = 'chatbox-avatars';
    else if (req.originalUrl.includes('messages')) folder = 'chatbox-files';

    return {
      folder,
      resource_type: 'auto',
      format: file.mimetype.split('/')[1],
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    };
  }
});

const upload = multer({ storage });
module.exports = upload;
