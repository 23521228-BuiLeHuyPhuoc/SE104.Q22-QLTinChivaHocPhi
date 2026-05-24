const express = require('express');
const router = express.Router();
const mc = require('../controllers/majorController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', mc.getAllMajors);
router.post('/', mc.createMajor);
router.put('/:id', mc.updateMajor);
router.delete('/:id', mc.deleteMajor);

module.exports = router;
