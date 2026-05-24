const express = require('express');
const router = express.Router();
const pc = require('../controllers/permissionController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

// Functions (CHUCNANG)
router.get('/functions', pc.getAllFunctions);
router.post('/functions', pc.createFunction);
router.put('/functions/:id', pc.updateFunction);
router.delete('/functions/:id', pc.deleteFunction);

// Groups (NHOMNGUOIDUNG)
router.get('/groups', pc.getAllGroups);
router.post('/groups', pc.createGroup);
router.put('/groups/:id', pc.updateGroup);
router.delete('/groups/:id', pc.deleteGroup);

// Permissions (PHANQUYEN)
router.get('/groups/:id/permissions', pc.getGroupPermissions);
router.post('/groups/:id/permissions', pc.assignPermission);
router.put('/groups/:id/permissions', pc.bulkUpdatePermissions);
router.delete('/groups/:id/permissions/:funcId', pc.removePermission);

module.exports = router;
