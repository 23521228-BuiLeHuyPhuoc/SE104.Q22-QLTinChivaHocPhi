const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authMiddleware, adminMiddleware, systemAdminMiddleware } = require('../middleware/auth');

// Xác thực
router.use(authMiddleware);

// Lấy vai trò hiện tại
router.get('/my-role', roleController.getMyRole);

// Lấy tất cả vai trò (admin only)
router.get('/', adminMiddleware, roleController.getAllRoles);

// Lấy danh sách tài khoản (admin only)
router.get('/accounts', adminMiddleware, roleController.getAllAccounts);
router.post('/accounts', adminMiddleware, roleController.createAccount);
router.delete('/accounts/:id', adminMiddleware, systemAdminMiddleware, roleController.deleteAccount);

// Cập nhật role tài khoản (admin only)
router.put('/accounts/:id/role', adminMiddleware, systemAdminMiddleware, roleController.updateUserRole);


module.exports = router;
