const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', dashboardController.getDashboardStats);
router.get('/revenue-monthly', dashboardController.getRevenueMonthly);
router.get('/students-owing', dashboardController.getStudentsOwing);
router.get('/incomplete-tuition/export', dashboardController.exportIncompleteTuitionReport);
router.get('/incomplete-tuition', dashboardController.getIncompleteTuitionReport);
router.get('/registration-by-semester', dashboardController.getRegistrationBySemester);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;
