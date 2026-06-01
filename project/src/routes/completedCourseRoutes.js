const express = require('express');
const router = express.Router();
const multer = require('multer');
const completedCourseController = require('../controllers/completedCourseController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware);

router.get('/me', completedCourseController.getMyCompletedCourses);

router.use(adminMiddleware);
router.get('/class-roster', completedCourseController.getClassGradeRoster);
router.get('/', completedCourseController.getAllCompletedCourses);
router.post('/batch', completedCourseController.batchCreateCompletedCourses);
router.post('/import', upload.single('file'), completedCourseController.importCompletedCourses);
router.post('/', completedCourseController.createCompletedCourse);
router.put('/:id', completedCourseController.updateCompletedCourse);
router.delete('/:id', completedCourseController.deleteCompletedCourse);

module.exports = router;
