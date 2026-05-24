const express = require('express');
const router = express.Router();
const sc = require('../controllers/settingsController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', sc.getSettings);
router.put('/', sc.updateSettings);

module.exports = router;
