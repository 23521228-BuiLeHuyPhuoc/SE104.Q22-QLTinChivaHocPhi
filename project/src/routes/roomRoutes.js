const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeAdmin);

router.get('/', roomController.getAllRooms);
router.get('/:id/classes', roomController.getRoomClasses);
router.post('/', roomController.createRoom);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;
