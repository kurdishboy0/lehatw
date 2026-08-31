const express = require('express');
const {
  createStudentProfile,
  getStudentProfile,
  getStudentById,
  updateStudentProfile,
  getAllStudentsPaginated, // <-- 1. Import the new function
  uploadProfilePhoto,
  uploadResume,
  removeResume
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware'); // Bring in the Bouncer!
const { handlePhotoUpload, handleResumeUpload } = require('../middleware/upload');

const router = express.Router();

// --- PUBLIC ROUTE ---
// GET /api/student/all -> Anyone can view the talent directory for the homepage
router.get('/all', getAllStudentsPaginated);

// --- PROTECTED ROUTES (Requires Bouncer) ---
// The user MUST pass the Bouncer (protect) to reach these functions
router.post('/profile', protect, createStudentProfile);
router.get('/profile', protect, getStudentProfile);
router.put('/profile', protect, updateStudentProfile);
router.post('/profile/photo', protect, handlePhotoUpload, uploadProfilePhoto);
router.post('/profile/resume', protect, handleResumeUpload, uploadResume);
router.delete('/profile/resume', protect, removeResume);

// --- PUBLIC: single student profile by id (kept below the literal routes above) ---
router.get('/:id', getStudentById);

module.exports = router;