const express = require('express');
const router = express.Router();
const tuitionController = require('../controllers/tuitionController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all tuition fees
router.get('/', adminMiddleware, tuitionController.getAllTuition);

// Get tuition statistics
router.get('/stats', adminMiddleware, tuitionController.getTuitionStats);

// Get credit prices
router.get('/prices', tuitionController.getCreditPrices);

// Get student's tuition fees
router.get('/student/:studentId', tuitionController.getStudentTuition);

// Get tuition fee by ID
router.get('/:id', adminMiddleware, tuitionController.getTuitionById);

// Calculate tuition fee
router.post('/calculate', adminMiddleware, tuitionController.calculateTuition);

module.exports = router;
