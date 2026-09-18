const express = require('express');
const { getOverrides } = require('../controllers/translationController');

const router = express.Router();

// Public: admin edits to the site's text, applied on top of the built-in text.
router.get('/', getOverrides);

module.exports = router;
