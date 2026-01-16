const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// Tất cả routes cần xác thực
router.use(authenticateToken);

// Thống kê lớp học
router.get('/stats', authorizeAdmin, classController.getClassStats);

// Danh sách lớp mở theo học kỳ
router.get('/opened', classController.getOpenedClasses);

// CRUD lớp học
router.get('/', classController.getClasses);
router.get('/:id', classController.getClassById);
router.post('/', authorizeAdmin, classController.createClass);
router.put('/:id', authorizeAdmin, classController.updateClass);
router.delete('/:id', authorizeAdmin, classController.deleteClass);

// Mở/đóng lớp trong học kỳ
router.post('/open', authorizeAdmin, classController.openClass);
router.delete('/opened/:id', authorizeAdmin, classController.closeClass);

module.exports = router;
