const express = require('express');
const { applyToJob, getMyApplications, getJobApplicants } = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');
const { handleOptionalCvUpload } = require('../middleware/upload');

const router = express.Router();

router.post('/', protect, handleOptionalCvUpload, applyToJob);
router.get('/mine', protect, getMyApplications);
router.get('/job/:jobId', protect, getJobApplicants);

module.exports = router;
