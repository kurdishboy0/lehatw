const express = require('express');
const { getMyProfile, updateMyProfile } = require('../controllers/instructorController');
const { listMyCourses, createCourse, updateCourse, submitCourse, deleteCourse, courseStudents } = require('../controllers/courseController');
const { listLessons, createLesson, updateLesson, deleteLesson, reorderLessons } = require('../controllers/lessonController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, updateMyProfile);

// Courses this instructor teaches
router.get('/courses', protect, listMyCourses);
router.post('/courses', protect, createCourse);
router.put('/courses/:id', protect, updateCourse);
router.post('/courses/:id/submit', protect, submitCourse);
router.delete('/courses/:id', protect, deleteCourse);
router.get('/courses/:id/students', protect, courseStudents);

// Lessons inside one of their courses
router.get('/courses/:courseId/lessons', protect, listLessons);
router.post('/courses/:courseId/lessons', protect, createLesson);
router.put('/courses/:courseId/lessons/:lessonId', protect, updateLesson);
router.delete('/courses/:courseId/lessons/:lessonId', protect, deleteLesson);
router.put('/courses/:courseId/lesson-order', protect, reorderLessons);

module.exports = router;
