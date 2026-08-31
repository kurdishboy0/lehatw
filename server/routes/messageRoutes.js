const express = require('express');
const { sendMessage, getInbox, getConversation } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/', protect, getInbox);
router.get('/:userId', protect, getConversation);

module.exports = router;
