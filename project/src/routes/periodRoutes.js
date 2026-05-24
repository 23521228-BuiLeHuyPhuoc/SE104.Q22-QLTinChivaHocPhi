const express = require('express');
const router = express.Router();
const periodController = require('../controllers/periodController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', periodController.getPeriods);
router.get('/:id', periodController.getPeriodById);
router.post('/', adminMiddleware, periodController.createPeriod);
router.put('/:id', adminMiddleware, periodController.updatePeriod);
router.delete('/:id', adminMiddleware, periodController.deletePeriod);

module.exports = router;
