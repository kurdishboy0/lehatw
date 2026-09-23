const express = require('express');
const { getMyProfile, updateMyProfile } = require('../controllers/instructorController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, updateMyProfile);

module.exports = router;
