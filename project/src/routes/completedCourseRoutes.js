const express = require('express');
const router = express.Router();
const completedCourseController = require('../controllers/completedCourseController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', completedCourseController.getAllCompletedCourses);
router.post('/', completedCourseController.createCompletedCourse);
router.put('/:id', completedCourseController.updateCompletedCourse);
router.delete('/:id', completedCourseController.deleteCompletedCourse);

module.exports = router;
