const express = require('express');
const {
  getPendingHRProfiles,
  updateHRStatus,
  getPendingCustomSkills,
  reviewCustomSkill
} = require('../controllers/adminController');
// Bring in BOTH bouncers!
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// A user must pass BOTH the protect Bouncer AND the adminOnly Bouncer
router.get('/hr/pending', protect, adminOnly, getPendingHRProfiles);
router.put('/hr/:id', protect, adminOnly, updateHRStatus);
router.get('/skills/pending', protect, adminOnly, getPendingCustomSkills);
router.put('/skills/:id', protect, adminOnly, reviewCustomSkill);

module.exports = router;