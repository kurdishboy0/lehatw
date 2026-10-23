const express = require('express');
const { getAllSkills, getTaxonomy, saveStudentSkills } = require('../controllers/skillController');
const { protect, studentOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/skills -> Fetches the master list (Protected)
router.get('/', protect, getAllSkills);

// GET /api/skills/taxonomy -> Public: Subject Areas -> Fields of Study -> Skills,
// used to power the filter UI on the public Skill Match / search page.
router.get('/taxonomy', getTaxonomy);

// POST /api/skills/save -> Saves standard and custom skills in bulk
router.post('/save', protect, studentOnly, saveStudentSkills);

module.exports = router;
