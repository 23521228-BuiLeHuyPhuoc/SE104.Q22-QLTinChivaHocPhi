const express = require('express');
const router = express.Router();
const lc = require('../controllers/locationController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/provinces', lc.getAllProvinces);
router.post('/provinces', lc.createProvince);
router.put('/provinces/:id', lc.updateProvince);
router.delete('/provinces/:id', lc.deleteProvince);

router.get('/wards', lc.getAllWards);
router.post('/wards', lc.createWard);
router.put('/wards/:id', lc.updateWard);
router.delete('/wards/:id', lc.deleteWard);

module.exports = router;
