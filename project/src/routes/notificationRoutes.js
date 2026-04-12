const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Public routes (có thể không cần auth)
router.get('/public', notificationController.getPublicNotifications);

// Protected routes (cần auth)
router.get('/', authenticateToken, notificationController.getAllNotifications);
router.get('/personal', authenticateToken, notificationController.getPersonalNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

// Admin routes
router.post('/', authenticateToken, isAdmin, notificationController.createPublicNotification);
router.delete('/:id', authenticateToken, isAdmin, notificationController.deleteNotification);

module.exports = router;
