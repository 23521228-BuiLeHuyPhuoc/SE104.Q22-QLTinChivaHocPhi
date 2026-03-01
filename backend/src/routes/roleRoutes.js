const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Xác thực
router.use(authMiddleware);

// Lấy vai trò hiện tại
router.get('/my-role', roleController.getMyRole);

// Lấy tất cả vai trò (admin only)
router.get('/', adminMiddleware, roleController.getAllRoles);

module.exports = router;
