const express = require('express');
const { listEvents, getEvent, register, cancelRegistration } = require('../controllers/eventController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Public, but a signed-in visitor also sees which events they joined.
router.get('/', optionalAuth, listEvents);
router.get('/:id', optionalAuth, getEvent);

router.post('/:id/register', protect, register);
router.delete('/:id/register', protect, cancelRegistration);

module.exports = router;
