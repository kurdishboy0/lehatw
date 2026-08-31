const express = require('express');
const { createHRProfile, getHRProfile, updateHRProfile } = require('../controllers/hrController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/hr/profile -> Submit a new company profile
router.post('/profile', protect, createHRProfile);

// GET /api/hr/profile -> Fetch the company profile (NEW)
router.get('/profile', protect, getHRProfile);

// PUT /api/hr/profile -> Update the company profile (NEW)
router.put('/profile', protect, updateHRProfile);

module.exports = router;