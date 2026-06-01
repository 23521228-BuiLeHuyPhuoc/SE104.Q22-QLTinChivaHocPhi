const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/vnpay-return', paymentController.vnpayReturn);
router.get('/vnpay-ipn', paymentController.vnpayIpn);
router.post('/zalopay-callback', paymentController.zalopayCallback);

// All routes require authentication
router.use(authMiddleware);

// Get student's payment history
router.get('/student/:studentId', paymentController.getStudentPayments);

// Get payment statistics
router.get('/stats', adminMiddleware, paymentController.getPaymentStats);

// Export payment list
router.get('/export', adminMiddleware, paymentController.exportPayments);

// Get payment by ID
router.get('/:id', adminMiddleware, paymentController.getPaymentById);

// Create payment (admin only)
router.post('/', adminMiddleware, paymentController.createPayment);
router.post('/checkout', paymentController.checkoutPayment);

// Get all payments
router.get('/', adminMiddleware, paymentController.getAllPayments);

// Confirm pending payment (admin only)
router.put('/:id/confirm', adminMiddleware, paymentController.confirmPayment);

// Cancel payment (admin only)
router.put('/:id/cancel', adminMiddleware, paymentController.cancelPayment);

module.exports = router;
