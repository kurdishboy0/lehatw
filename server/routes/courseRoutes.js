const express = require('express');
const {
  listCourses, getCourse, enroll, unenroll, myCourses
} = require('../controllers/courseController');
const { setLessonProgress } = require('../controllers/lessonController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Public browsing; signing in also marks the courses you enrolled in.
router.get('/', optionalAuth, listCourses);
router.get('/mine', protect, myCourses);
router.get('/:id', optionalAuth, getCourse);

router.post('/:id/enroll', protect, enroll);
router.delete('/:id/enroll', protect, unenroll);
router.put('/:courseId/lessons/:lessonId/progress', protect, setLessonProgress);

module.exports = router;
