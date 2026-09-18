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
const { getMyJobMatches, getJobCandidates, inviteCandidate } = require('../controllers/recommendationController');

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

// Matching: a student's fit for every live job, and a company's candidates per job
router.get('/matches/mine', protect, getMyJobMatches);
router.get('/:jobId/candidates', protect, getJobCandidates);
router.post('/:jobId/invite', protect, inviteCandidate);

// Public single-job lookup (kept below the specific routes above)
router.get('/:jobId', getJobById);

module.exports = router;