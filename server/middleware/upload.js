const multer = require('multer');
const path = require('path');

const PHOTO_MIME_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const RESUME_MIME_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

// Files are held in memory (req.file.buffer) rather than written to local
// disk, since they get forwarded straight to Supabase Storage — this also
// means the app has no dependency on a persistent local filesystem.
function makeUploader({ mimeTypes, maxSizeBytes, rejectMessage }) {
  const fileFilter = (req, file, cb) => {
    if (mimeTypes[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error(rejectMessage));
    }
  };

  return multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: maxSizeBytes } });
}

const uploadPhoto = makeUploader({
  mimeTypes: PHOTO_MIME_TYPES,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  rejectMessage: 'Only JPEG, PNG, or WEBP images are allowed.'
});

const uploadResume = makeUploader({
  mimeTypes: RESUME_MIME_TYPES,
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  rejectMessage: 'Only PDF, DOC, or DOCX files are allowed.'
});

// Builds the Supabase Storage path/key for an uploaded file, e.g.
// "student-photos/user7-1735489200000.jpg".
function storageKey(folder, prefix, userId, mimeType, originalname) {
  const mimeTypes = folder === 'student-photos' ? PHOTO_MIME_TYPES : RESUME_MIME_TYPES;
  const ext = mimeTypes[mimeType] || path.extname(originalname);
  return `${folder}/${prefix}${userId}-${Date.now()}${ext}`;
}

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

module.exports = { handlePhotoUpload, handleResumeUpload, handleOptionalCvUpload, storageKey };
