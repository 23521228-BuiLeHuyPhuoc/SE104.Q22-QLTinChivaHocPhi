const express = require('express');
const router = express.Router();
const mc = require('../controllers/majorController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', mc.getAllMajors);
router.get('/curriculum/items', mc.getCurriculum);
router.post('/curriculum/items', mc.createCurriculumItem);
router.put('/curriculum/items/:itemId', mc.updateCurriculumItem);
router.delete('/curriculum/items/:itemId', mc.deleteCurriculumItem);
router.get('/students/:maSv/debt', mc.getStudentDebt);
router.get('/students/:maSv/thesis-eligibility', mc.getStudentThesisEligibility);
router.get('/:id/curriculum', mc.getCurriculum);
router.post('/', mc.createMajor);
router.put('/:id', mc.updateMajor);
router.delete('/:id', mc.deleteMajor);

module.exports = router;
