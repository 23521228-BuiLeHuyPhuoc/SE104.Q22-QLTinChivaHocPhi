const express = require('express');
const router = express.Router();
const prerequisiteController = require('../controllers/prerequisiteController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', prerequisiteController.getPrerequisites);
router.get('/graph/data', prerequisiteController.getPrerequisiteGraph);
router.get('/:id', prerequisiteController.getPrerequisiteById);
router.post('/', adminMiddleware, prerequisiteController.createPrerequisite);
router.put('/:id', adminMiddleware, prerequisiteController.updatePrerequisite);
router.delete('/:id', adminMiddleware, prerequisiteController.deletePrerequisite);

module.exports = router;
