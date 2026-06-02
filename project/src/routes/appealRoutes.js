const express = require('express');
const router = express.Router();
const appealController = require('../controllers/appealController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/student/:studentId', appealController.getStudentAppeals);
router.post('/', appealController.createAppeal);
router.put('/:id/cancel', appealController.cancelAppeal);

router.get('/', adminMiddleware, appealController.getAllAppeals);
router.put('/:id/approve', adminMiddleware, appealController.approveAppeal);
router.put('/:id/reject', adminMiddleware, appealController.rejectAppeal);

module.exports = router;
