const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const courseController = require('../controllers/courseController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const allowedImportExtensions = new Set(['.xls', '.xlsx']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (allowedImportExtensions.has(extension)) return cb(null, true);
    return cb(new Error('INVALID_COURSE_IMPORT_FILE_TYPE'));
  }
});

const uploadCourseImportFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File import không được vượt quá 5MB' });
    }
    if (error.message === 'INVALID_COURSE_IMPORT_FILE_TYPE') {
      return res.status(400).json({ success: false, message: 'Chỉ chấp nhận file Excel .xls hoặc .xlsx' });
    }
    return res.status(400).json({ success: false, message: 'Không thể đọc file import' });
  });
};

// All routes require authentication
router.use(authMiddleware);

// Get all courses (with pagination and search)
router.get('/', courseController.getAllCourses);

// Get course statistics
router.get('/stats', courseController.getCourseStats);

// Get opened classes for semester
router.get('/opened', courseController.getOpenedClasses);

// Get current student's curriculum and completed credits
router.get('/curriculum/me', courseController.getMyCurriculum);

// Export course list as an Excel-readable file
router.get('/export', adminMiddleware, courseController.exportCourses);

// Import course list from Excel
router.post('/import', adminMiddleware, uploadCourseImportFile, courseController.importCourses);

// Get course by ID
router.get('/:id', courseController.getCourseById);

// Admin only routes
router.post('/', adminMiddleware, courseController.createCourse);
router.put('/:id', adminMiddleware, courseController.updateCourse);
router.delete('/:id', adminMiddleware, courseController.deleteCourse);

module.exports = router;
