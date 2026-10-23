const express = require('express');
const {
  createStudentProfile,
  getStudentProfile,
  getStudentById,
  updateStudentProfile,
  getAllStudentsPaginated, // <-- 1. Import the new function
  uploadProfilePhoto,
  uploadResume,
  removeResume,
  getResumeLink
} = require('../controllers/studentController');
const { protect, studentOnly } = require('../middleware/authMiddleware');
const { handlePhotoUpload, handleResumeUpload } = require('../middleware/upload');

const router = express.Router();
const { getContact, updateContact } = require('../controllers/studentContactController');
router.get('/contact', protect, getContact);
router.put('/contact', protect, updateContact);

// --- PUBLIC ROUTE ---
// GET /api/student/all -> Anyone can view the talent directory for the homepage
router.get('/all', getAllStudentsPaginated);

// --- PROTECTED ROUTES (Requires Bouncer) ---
// The user MUST pass the Bouncer (protect) to reach these functions
router.post('/profile', protect, studentOnly, createStudentProfile);
router.get('/profile', protect, studentOnly, getStudentProfile);
router.put('/profile', protect, studentOnly, updateStudentProfile);
router.post('/profile/photo', protect, studentOnly, handlePhotoUpload, uploadProfilePhoto);
router.post('/profile/resume', protect, studentOnly, handleResumeUpload, uploadResume);
router.delete('/profile/resume', protect, studentOnly, removeResume);

// --- PUBLIC: single student profile by id (kept below the literal routes above) ---
// Before '/:id' would also match, and behind protect: a CV link is never
// handed to someone who isn't signed in.
router.get('/:id/resume', protect, getResumeLink);
router.get('/:id', getStudentById);

module.exports = router;
