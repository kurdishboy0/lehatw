const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PHOTOS_DIR = path.join(__dirname, '..', 'uploads', 'student-photos');
const RESUMES_DIR = path.join(__dirname, '..', 'uploads', 'resumes');
fs.mkdirSync(PHOTOS_DIR, { recursive: true });
fs.mkdirSync(RESUMES_DIR, { recursive: true });

const PHOTO_MIME_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const RESUME_MIME_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

function makeUploader({ dir, mimeTypes, maxSizeBytes, filenamePrefix, rejectMessage }) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = mimeTypes[file.mimetype] || path.extname(file.originalname);
      cb(null, `${filenamePrefix}${req.user.id}-${Date.now()}${ext}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    if (mimeTypes[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error(rejectMessage));
    }
  };

  return multer({ storage, fileFilter, limits: { fileSize: maxSizeBytes } });
}

const uploadPhoto = makeUploader({
  dir: PHOTOS_DIR,
  mimeTypes: PHOTO_MIME_TYPES,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  filenamePrefix: 'user',
  rejectMessage: 'Only JPEG, PNG, or WEBP images are allowed.'
});

const uploadResume = makeUploader({
  dir: RESUMES_DIR,
  mimeTypes: RESUME_MIME_TYPES,
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  filenamePrefix: 'resume',
  rejectMessage: 'Only PDF, DOC, or DOCX files are allowed.'
});

// Wraps a multer single-file handler so validation/size errors come back as a
// clean JSON 400 instead of an unhandled error. `required` controls whether a
// missing file is itself treated as an error (job applications may not need one).
function wrapSingleUpload(uploader, fieldName, { required } = { required: false }) {
  return (req, res, next) => {
    uploader.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Failed to upload file.' });
      }
      if (required && !req.file) {
        return res.status(400).json({ message: 'No file was uploaded.' });
      }
      next();
    });
  };
}

const handlePhotoUpload = wrapSingleUpload(uploadPhoto, 'photo', { required: true });
const handleResumeUpload = wrapSingleUpload(uploadResume, 'resume', { required: true });
const handleOptionalCvUpload = wrapSingleUpload(uploadResume, 'cv', { required: false });

module.exports = { handlePhotoUpload, handleResumeUpload, handleOptionalCvUpload, PHOTOS_DIR, RESUMES_DIR };
