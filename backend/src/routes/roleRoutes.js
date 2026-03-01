const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authMiddleware, adminMiddleware, requirePermission } = require('../middleware/auth');

// Tất cả routes cần xác thực
router.use(authMiddleware);

// Lấy quyền của người dùng hiện tại
router.get('/my-permissions', roleController.getMyPermissions);

// Lấy tất cả quyền (admin + phân quyền)
router.get('/permissions', adminMiddleware, requirePermission('ROLE_VIEW'), roleController.getAllPermissions);

// Lấy tất cả vai trò và quyền
router.get('/', adminMiddleware, requirePermission('ROLE_VIEW'), roleController.getAllRoles);

// Lấy quyền theo vai trò
router.get('/:role/permissions', adminMiddleware, requirePermission('ROLE_VIEW'), roleController.getRolePermissions);

// Cập nhật quyền cho vai trò
router.put('/:role/permissions', adminMiddleware, requirePermission('ROLE_EDIT'), roleController.updateRolePermissions);

module.exports = router;
