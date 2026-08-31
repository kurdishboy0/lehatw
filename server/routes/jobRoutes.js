const express = require('express');
const {
  createJobPost,
  getSkillsList,
  getMatchingStudents,
  getJobById,
  getActiveJobs,
  getMyJobs,
  updateJobPost,
  deleteJobPost
} = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public / Authenticated lookups
router.get('/skills', getSkillsList);
router.get('/', getActiveJobs);

// HR Protected Routes
router.get('/mine', protect, getMyJobs);
router.post('/', protect, createJobPost);
router.put('/:jobId', protect, updateJobPost);
router.delete('/:jobId', protect, deleteJobPost);
router.get('/:jobId/matches', protect, getMatchingStudents);

// Public single-job lookup (kept below the specific routes above)
router.get('/:jobId', getJobById);

module.exports = router;