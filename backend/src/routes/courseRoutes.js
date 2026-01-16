const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all courses (with pagination and search)
router.get('/', courseController.getAllCourses);

// Get course statistics
router.get('/stats', courseController.getCourseStats);

// Get opened classes for semester
router.get('/opened', courseController.getOpenedClasses);

// Get course by ID
router.get('/:id', courseController.getCourseById);

// Admin only routes
router.post('/', adminMiddleware, courseController.createCourse);
router.put('/:id', adminMiddleware, courseController.updateCourse);
router.delete('/:id', adminMiddleware, courseController.deleteCourse);

module.exports = router;
