const express = require('express');
const router = express.Router();
const bc = require('../controllers/beneficiaryController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', bc.getAllBeneficiaries);
router.post('/', bc.createBeneficiary);
router.put('/:id', bc.updateBeneficiary);
router.delete('/:id', bc.deleteBeneficiary);
router.get('/:id/students', bc.getBeneficiaryStudents);
router.post('/:id/students', bc.addStudentToBeneficiary);
router.delete('/:id/students/:studentId', bc.removeStudentFromBeneficiary);

module.exports = router;
