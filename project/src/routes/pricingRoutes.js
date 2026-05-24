const express = require('express');
const router = express.Router();
const pc = require('../controllers/pricingController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', pc.getAllPricing);
router.post('/', pc.createPricing);
router.put('/:id', pc.updatePricing);
router.delete('/:id', pc.deletePricing);

module.exports = router;
