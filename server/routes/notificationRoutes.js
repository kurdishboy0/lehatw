const express = require('express');
const { getMyNotifications, markNotificationsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.put('/:id/read', protect, markNotificationsRead);

module.exports = router;
