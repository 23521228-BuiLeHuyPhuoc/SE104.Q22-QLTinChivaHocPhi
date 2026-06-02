const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const completedCourseController = require('../controllers/completedCourseController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const allowedImportExtensions = new Set(['.csv', '.tsv', '.txt', '.xls', '.xlsx']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (allowedImportExtensions.has(extension)) return cb(null, true);
    return cb(new Error('INVALID_IMPORT_FILE_TYPE'));
  }
});

const uploadImportFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File import khong duoc vuot qua 5MB' });
    }
    if (error.message === 'INVALID_IMPORT_FILE_TYPE') {
      return res.status(400).json({ success: false, message: 'Chi chap nhan file CSV, TSV, TXT, XLS hoac XLSX' });
    }
    return res.status(400).json({ success: false, message: 'Khong the doc file import' });
  });
};

router.use(authMiddleware);

router.get('/me', completedCourseController.getMyCompletedCourses);

router.use(adminMiddleware);
router.get('/class-roster', completedCourseController.getClassGradeRoster);
router.get('/', completedCourseController.getAllCompletedCourses);
router.post('/batch', completedCourseController.batchCreateCompletedCourses);
router.post('/import', uploadImportFile, completedCourseController.importCompletedCourses);
router.post('/', completedCourseController.createCompletedCourse);
router.put('/:id', completedCourseController.updateCompletedCourse);
router.delete('/:id', completedCourseController.deleteCompletedCourse);

module.exports = router;
