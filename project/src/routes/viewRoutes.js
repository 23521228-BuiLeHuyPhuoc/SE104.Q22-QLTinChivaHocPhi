const express = require('express');
const router = express.Router();
const vc = require('../controllers/viewController');

// PUBLIC
router.get('/', vc.root);
router.get('/login', vc.loginPage);
router.get('/admin/login', vc.adminLoginPage);
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

// STUDENT
router.get('/student/dashboard', vc.requireViewAuth, vc.requireViewStudent, vc.studentDashboard);
router.get('/student/course-registration', vc.requireViewAuth, vc.requireViewStudent, vc.studentCourseReg);
router.get('/student/my-courses', vc.requireViewAuth, vc.requireViewStudent, vc.studentMyCourses);
router.get('/student/my-tuition', vc.requireViewAuth, vc.requireViewStudent, vc.studentMyTuition);
router.get('/student/my-payments', vc.requireViewAuth, vc.requireViewStudent, vc.studentMyPayments);
router.get('/student/my-schedule', vc.requireViewAuth, vc.requireViewStudent, vc.studentMySchedule);
router.get('/student/profile', vc.requireViewAuth, vc.requireViewStudent, vc.studentProfile);
router.get('/student/notifications', vc.requireViewAuth, vc.requireViewStudent, vc.studentNotifications);

module.exports = router;
