const express = require('express');
const router = express.Router();
const lecturerController = require('../controllers/lecturerController');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeAdmin);

router.get('/', lecturerController.getAllLecturers);
router.post('/', lecturerController.createLecturer);
router.put('/:id', lecturerController.updateLecturer);
router.delete('/:id', lecturerController.deleteLecturer);

module.exports = router;
