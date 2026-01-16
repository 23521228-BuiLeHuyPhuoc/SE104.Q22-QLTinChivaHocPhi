const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/semesterController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all semesters
router.get('/', semesterController.getAllSemesters);

// Get active semester
router.get('/active', semesterController.getActiveSemester);

// Get academic years
router.get('/years', semesterController.getAcademicYears);

// Get semester by ID
router.get('/:id', semesterController.getSemesterById);

// Admin only routes
router.post('/', adminMiddleware, semesterController.createSemester);
router.put('/:id', adminMiddleware, semesterController.updateSemester);
router.delete('/:id', adminMiddleware, semesterController.deleteSemester);

module.exports = router;
