const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Tất cả routes cần xác thực
router.use(authMiddleware);

// Lấy quyền của người dùng hiện tại
router.get('/my-permissions', roleController.getMyPermissions);

// Lấy tất cả quyền (admin only)
router.get('/permissions', adminMiddleware, roleController.getAllPermissions);

// Lấy tất cả vai trò và quyền
router.get('/', adminMiddleware, roleController.getAllRoles);

// Lấy quyền theo vai trò
router.get('/:role/permissions', adminMiddleware, roleController.getRolePermissions);

module.exports = router;
