const express = require('express');
const trashController = require('../controllers/trashController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/entities', trashController.listEntities);
router.get('/:entity', trashController.listTrash);
router.post('/:entity/:id/restore', trashController.restoreTrashItem);
router.delete('/:entity/:id/purge', trashController.purgeTrashItem);

module.exports = router;
