const express = require('express');
const router = express.Router();
const fc = require('../controllers/facultyController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', fc.getAllFaculties);
router.post('/', fc.createFaculty);
router.put('/:id', fc.updateFaculty);
router.delete('/:id', fc.deleteFaculty);

module.exports = router;
