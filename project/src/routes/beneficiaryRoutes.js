const express = require('express');
const router = express.Router();
const multer = require('multer');
const bc = require('../controllers/beneficiaryController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', bc.getAllBeneficiaries);
router.post('/', bc.createBeneficiary);
router.put('/:id', bc.updateBeneficiary);
router.delete('/:id', bc.deleteBeneficiary);
router.post('/:id/students/import', excelUpload.single('file'), bc.importStudentsToBeneficiary);
router.get('/:id/students', bc.getBeneficiaryStudents);
router.post('/:id/students', bc.addStudentToBeneficiary);
router.delete('/:id/students/:studentId', bc.removeStudentFromBeneficiary);

module.exports = router;
