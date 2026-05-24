const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;
