const express = require('express');
const { getSimilarStudents, searchStudents } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/similar', protect, getSimilarStudents);
router.get('/search', searchStudents); // public: also used by HR and logged-out visitors

module.exports = router;
