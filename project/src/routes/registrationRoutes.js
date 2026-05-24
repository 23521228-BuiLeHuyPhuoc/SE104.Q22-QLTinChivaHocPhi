const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get available courses for student registration
router.get('/available', registrationController.getAvailableCourses);

// Get student's registered courses
router.get('/student/:studentId', registrationController.getStudentCourses);

// Register course
router.post('/', registrationController.registerCourse);

// Cancel registration
router.put('/:id/cancel', registrationController.cancelRegistration);

// Admin reports and list views
router.get('/stats', adminMiddleware, registrationController.getRegistrationStats);
router.get('/', adminMiddleware, registrationController.getAllRegistrations);

module.exports = router;
