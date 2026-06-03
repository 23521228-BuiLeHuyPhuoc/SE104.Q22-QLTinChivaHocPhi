const express = require('express');
const router = express.Router();
const openCourseController = require('../controllers/openCourseController');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/available', authorizeAdmin, openCourseController.getAvailableCourses);
router.get('/', authorizeAdmin, openCourseController.getOpenCourses);
router.get('/:id', authorizeAdmin, openCourseController.getOpenCourseById);
router.post('/', authorizeAdmin, openCourseController.createOpenCourse);
router.put('/:id', authorizeAdmin, openCourseController.updateOpenCourse);
router.delete('/:id', authorizeAdmin, openCourseController.deleteOpenCourse);

module.exports = router;
