const express = require('express');
const { getActive } = require('../controllers/announcementController');

const router = express.Router();

// Public: site-wide banners that are live right now.
router.get('/active', getActive);

module.exports = router;
