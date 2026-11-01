import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Safe document storage directory outside public web server roots
export const FDR_UPLOAD_DIR = path.resolve('storage', 'fdr-documents');
if (!fs.existsSync(FDR_UPLOAD_DIR)) {
  fs.mkdirSync(FDR_UPLOAD_DIR, { recursive: true });
}

// Storage configuration with completely random server-generated filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FDR_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const randomName = `fdr-${Date.now()}-${crypto.randomBytes(16).toString('hex')}${ext}`;
    cb(null, randomName);
  }
});

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg'
];

// Dual validation: validate extension AND MIME type (do not trust client alone)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);
  const isMimeValid = ALLOWED_MIME_TYPES.includes(mime);

  if (isExtValid && isMimeValid) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file format. Only PDF, JPG, JPEG, and PNG files are accepted.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

export const uploadFDRDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB maximum
  }
});

/**
 * Middleware wrapper to cleanly catch and format Multer errors into JSON 400 responses
 */
export const handleFDRUpload = (fieldName = 'document') => {
  const upload = uploadFDRDocument.single(fieldName);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum allowed limit of 5 MB.'
          });
        }
        if (err.code === 'INVALID_FILE_TYPE' || (err.message && err.message.includes('Invalid file format'))) {
          return res.status(400).json({
            success: false,
            message: 'Invalid file format. Only PDF, JPG, JPEG, and PNG files are accepted.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error'
        });
      }
      next();
    });
  };
};
