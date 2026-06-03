const express = require('express');
const router = express.Router();
const multer = require('multer');
const studentController = require('../controllers/studentController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { avatarUploadMiddleware } = require('../middleware/avatarUpload');

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// All routes require authentication
router.use(authMiddleware);

// Get all students (with pagination and search)
router.get('/', adminMiddleware, studentController.getAllStudents);

// Get student statistics
router.get('/stats', adminMiddleware, studentController.getStudentStats);

// Get majors list
router.get('/majors', studentController.getMajors);

// Get provinces
router.get('/provinces', studentController.getProvinces);

// Get districts by province
router.get('/provinces/:provinceId/districts', studentController.getDistrictsByProvince);

// Get ethnicities
router.get('/ethnicities', studentController.getEthnicities);


// Get student by ID
router.get('/export', adminMiddleware, studentController.exportStudents);
router.post('/import', adminMiddleware, excelUpload.single('file'), studentController.importStudents);
router.get('/:id', adminMiddleware, studentController.getStudentById);
router.post('/:id/avatar', adminMiddleware, avatarUploadMiddleware, studentController.uploadStudentAvatar);

// Admin only routes
router.post('/', adminMiddleware, studentController.createStudent);
router.put('/:id', adminMiddleware, studentController.updateStudent);
router.delete('/:id', adminMiddleware, studentController.deleteStudent);

module.exports = router;
