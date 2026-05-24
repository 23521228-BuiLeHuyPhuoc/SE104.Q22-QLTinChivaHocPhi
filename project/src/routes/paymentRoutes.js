const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get student's payment history
router.get('/student/:studentId', paymentController.getStudentPayments);

// Get all payments
router.get('/', adminMiddleware, paymentController.getAllPayments);

// Get payment statistics
router.get('/stats', adminMiddleware, paymentController.getPaymentStats);

// Get payment by ID
router.get('/:id', adminMiddleware, paymentController.getPaymentById);

// Create payment (admin only)
router.post('/', adminMiddleware, paymentController.createPayment);

// Cancel payment (admin only)
router.put('/:id/cancel', adminMiddleware, paymentController.cancelPayment);

module.exports = router;
