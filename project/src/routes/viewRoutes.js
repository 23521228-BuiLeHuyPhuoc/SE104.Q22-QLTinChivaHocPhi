const express = require('express');
const router = express.Router();
const vc = require('../controllers/viewController');

// PUBLIC
router.get('/', vc.root);
router.get('/login', vc.loginPage);
router.get('/admin/login', vc.adminLoginPage);
router.get('/forgot-password', vc.forgotPasswordPage);
router.get('/admin/forgot-password', vc.adminForgotPasswordPage);
router.get('/reset-password', vc.resetPasswordPage);
router.get('/logout', vc.logout);

// ADMIN
router.get('/admin/dashboard', vc.requireViewAuth, vc.requireViewAdmin, vc.adminDashboard);
router.get('/admin/students', vc.requireViewAuth, vc.requireViewAdmin, vc.adminStudents);
router.get('/admin/courses', vc.requireViewAuth, vc.requireViewAdmin, vc.adminCourses);
router.get('/admin/classes', vc.requireViewAuth, vc.requireViewAdmin, vc.adminClasses);
router.get('/admin/semesters', vc.requireViewAuth, vc.requireViewAdmin, vc.adminSemesters);
router.get('/admin/registrations', vc.requireViewAuth, vc.requireViewAdmin, vc.adminRegistrations);
router.get('/admin/tuition', vc.requireViewAuth, vc.requireViewAdmin, vc.adminTuition);
router.get('/admin/payments', vc.requireViewAuth, vc.requireViewAdmin, vc.adminPayments);
router.get('/admin/reports', vc.requireViewAuth, vc.requireViewAdmin, vc.adminReports);
router.get('/admin/users', vc.requireViewAuth, vc.requireViewAdmin, vc.adminUsers);
router.get('/admin/faculties', vc.requireViewAuth, vc.requireViewAdmin, vc.adminFaculties);
router.get('/admin/majors', vc.requireViewAuth, vc.requireViewAdmin, vc.adminMajors);
router.get('/admin/completed-courses', vc.requireViewAuth, vc.requireViewAdmin, vc.adminCompletedCourses);
router.get('/admin/grades', vc.requireViewAuth, vc.requireViewAdmin, (req, res) => res.redirect('/admin/completed-courses'));
router.get('/admin/pricing', vc.requireViewAuth, vc.requireViewAdmin, vc.adminPricing);
router.get('/admin/beneficiaries', vc.requireViewAuth, vc.requireViewAdmin, vc.adminBeneficiaries);
router.get('/admin/permissions', vc.requireViewAuth, vc.requireViewAdmin, vc.adminPermissions);
router.get('/admin/notifications', vc.requireViewAuth, vc.requireViewAdmin, vc.adminNotifications);
router.get('/admin/settings', vc.requireViewAuth, vc.requireViewAdmin, vc.adminSettings);
router.get('/admin/trash', vc.requireViewAuth, vc.requireViewAdmin, vc.adminTrash);

// STUDENT
router.get('/student/dashboard', vc.requireViewAuth, vc.requireViewStudent, vc.studentDashboard);
router.get('/student/course-registration', vc.requireViewAuth, vc.requireViewStudent, vc.studentCourseReg);
router.get('/student/my-courses', vc.requireViewAuth, vc.requireViewStudent, vc.studentMyCourses);
router.get('/student/completed-courses', vc.requireViewAuth, vc.requireViewStudent, vc.studentCompletedCourses);
router.get('/student/my-tuition', vc.requireViewAuth, vc.requireViewStudent, vc.studentMyTuition);
router.get('/student/my-payments', vc.requireViewAuth, vc.requireViewStudent, vc.studentMyPayments);
router.get('/student/my-schedule', vc.requireViewAuth, vc.requireViewStudent, vc.studentMySchedule);
router.get('/student/profile', vc.requireViewAuth, vc.requireViewStudent, vc.studentProfile);
router.get('/student/notifications', vc.requireViewAuth, vc.requireViewStudent, vc.studentNotifications);
router.get('/student/curriculum', vc.requireViewAuth, vc.requireViewStudent, vc.studentCurriculum);

module.exports = router;
