const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.post('/login', authController.loginStudent);
router.post('/student/login', authController.loginStudent);
router.post('/admin/login', authController.loginAdmin);
router.post('/register', authController.registerStudent);
router.post('/student/register', authController.registerStudent);
router.post('/admin/register', authController.registerAdmin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
