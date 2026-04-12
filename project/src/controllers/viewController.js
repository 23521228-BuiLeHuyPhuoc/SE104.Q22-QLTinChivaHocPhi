const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
require('dotenv').config();

// === Helper: Auth from cookie ===
function getTokenFromCookie(req) { return (req.cookies && req.cookies.token) ? req.cookies.token : null; }
async function getUserFromToken(token) {
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch (e) { return null; }
}

// === Middleware ===
const requireViewAuth = async (req, res, next) => {
  const user = await getUserFromToken(getTokenFromCookie(req));
  if (!user) return res.redirect('/login');
  req.user = user; next();
};
const requireViewAdmin = (req, res, next) => { if (!req.user || req.user.Role !== 'admin') return res.redirect('/login'); next(); };
const requireViewStudent = (req, res, next) => { if (!req.user || req.user.Role !== 'sinh_vien') return res.redirect('/login'); next(); };

// === PUBLIC ===
const root = async (req, res) => {
  const user = await getUserFromToken(getTokenFromCookie(req));
  if (user) { if (user.Role === 'admin') return res.redirect('/admin/dashboard'); return res.redirect('/student/dashboard'); }
  res.redirect('/login');
};
const loginPage = (req, res) => { res.render('pages/login', { pageTitle: 'Đăng nhập' }); };
const logout = (req, res) => { res.clearCookie('token'); res.redirect('/login'); };

// === ADMIN ===
const adminDashboard = (req, res) => { res.render('pages/admin/dashboard', { pageTitle: 'Admin Dashboard', currentPage: 'dashboard', headerTitle: 'Dashboard', user: req.user }); };

const adminStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || ''; const status = req.query.status || '';
    const where = {};
    if (search) { where.OR = [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }]; }
    if (status) where.TrangThai = status;
    const [students, total] = await Promise.all([
      prisma.SINHVIEN.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { MaSv: 'asc' }, include: { NGANHHOC: { include: { KHOA: true } } } }),
      prisma.SINHVIEN.count({ where })
    ]);
    res.render('pages/admin/students', { pageTitle: 'Quản lý Sinh viên', currentPage: 'students', headerTitle: 'Quản lý Sinh viên', user: req.user, students, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/students', queryParams: { search, status, limit }, search, status });
  } catch (err) { console.error('Error:', err); res.render('pages/admin/students', { pageTitle: 'Quản lý Sinh viên', currentPage: 'students', headerTitle: 'Quản lý Sinh viên', user: req.user, students: [], totalPages: 0, search: '', status: '' }); }
};

const adminCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const where = {};
    if (search) { where.OR = [{ MaMonHoc: { contains: search, mode: 'insensitive' } }, { TenMonHoc: { contains: search, mode: 'insensitive' } }]; }
    const [courses, total] = await Promise.all([
      prisma.MONHOC.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { MaMonHoc: 'asc' }, include: { KHOA: true } }),
      prisma.MONHOC.count({ where })
    ]);
    res.render('pages/admin/courses', { pageTitle: 'Quản lý Môn học', currentPage: 'courses', headerTitle: 'Quản lý Môn học', user: req.user, courses, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/courses', queryParams: { search, limit }, search });
  } catch (err) { console.error('Error:', err); res.render('pages/admin/courses', { pageTitle: 'Quản lý Môn học', currentPage: 'courses', headerTitle: 'Quản lý Môn học', user: req.user, courses: [], totalPages: 0, search: '' }); }
};

const adminClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const where = {};
    if (search) { where.OR = [{ MaLop: { contains: search, mode: 'insensitive' } }, { TenLop: { contains: search, mode: 'insensitive' } }]; }
    const [classes, total] = await Promise.all([
      prisma.LOP.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { MaLop: 'asc' }, include: { MONHOC: true } }),
      prisma.LOP.count({ where })
    ]);
    res.render('pages/admin/classes', { pageTitle: 'Quản lý Lớp học', currentPage: 'classes', headerTitle: 'Quản lý Lớp học', user: req.user, classes, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/classes', queryParams: { search, limit }, search });
  } catch (err) { console.error('Error:', err); res.render('pages/admin/classes', { pageTitle: 'Quản lý Lớp học', currentPage: 'classes', headerTitle: 'Quản lý Lớp học', user: req.user, classes: [], totalPages: 0, search: '' }); }
};

const adminSemesters = async (req, res) => {
  try {
    const semesters = await prisma.HOCKY.findMany({ include: { NAMHOC: true }, orderBy: { NgayBatDau: 'desc' } });
    res.render('pages/admin/semesters', { pageTitle: 'Quản lý Học kỳ', currentPage: 'semesters', headerTitle: 'Quản lý Học kỳ', user: req.user, semesters });
  } catch (err) { console.error('Error:', err); res.render('pages/admin/semesters', { pageTitle: 'Quản lý Học kỳ', currentPage: 'semesters', headerTitle: 'Quản lý Học kỳ', user: req.user, semesters: [] }); }
};

const adminRegistrations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || ''; const status = req.query.status || '';
    const where = {};
    if (status) where.TrangThai = status;
    if (search) { where.PHIEUDANGKY = { SINHVIEN: { OR: [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }] } }; }
    const [registrations, total] = await Promise.all([
      prisma.CHITIETDANGKY.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { NgayDangKy: 'desc' }, include: { LOP: { include: { MONHOC: true } }, PHIEUDANGKY: { include: { SINHVIEN: true } } } }),
      prisma.CHITIETDANGKY.count({ where })
    ]);
    res.render('pages/admin/registrations', { pageTitle: 'Quản lý Đăng ký', currentPage: 'registrations', headerTitle: 'Quản lý Đăng ký', user: req.user, registrations, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/registrations', queryParams: { search, status, limit }, search, status });
  } catch (err) { console.error('Error:', err); res.render('pages/admin/registrations', { pageTitle: 'Quản lý Đăng ký', currentPage: 'registrations', headerTitle: 'Quản lý Đăng ký', user: req.user, registrations: [], totalPages: 0, search: '', status: '' }); }
};

const adminTuition = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || ''; const status = req.query.status || '';
    const where = {};
    if (status) where.TrangThai = status;
    if (search) { where.SINHVIEN = { OR: [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }] }; }
    const [tuitions, total] = await Promise.all([
      prisma.PHIEUTHUHOCPHI.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { NgayLap: 'desc' }, include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: true } } } }),
      prisma.PHIEUTHUHOCPHI.count({ where })
    ]);
    res.render('pages/admin/tuition', { pageTitle: 'Quản lý Học phí', currentPage: 'tuition', headerTitle: 'Quản lý Học phí', user: req.user, tuitions, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/tuition', queryParams: { search, status, limit }, search, status });
  } catch (err) { console.error('Error:', err); res.render('pages/admin/tuition', { pageTitle: 'Quản lý Học phí', currentPage: 'tuition', headerTitle: 'Quản lý Học phí', user: req.user, tuitions: [], totalPages: 0, search: '', status: '' }); }
};

const adminPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const where = {};
    if (search) { where.SINHVIEN = { OR: [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }] }; }
    const [payments, total] = await Promise.all([
      prisma.PHIEUTHUHOCPHI.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { NgayLap: 'desc' }, include: { SINHVIEN: true } }),
      prisma.PHIEUTHUHOCPHI.count({ where })
    ]);
    res.render('pages/admin/payments', { pageTitle: 'Thu Học phí', currentPage: 'payments', headerTitle: 'Thu Học phí', user: req.user, payments, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/payments', queryParams: { search, limit }, search });
  } catch (err) { console.error('Error:', err); res.render('pages/admin/payments', { pageTitle: 'Thu Học phí', currentPage: 'payments', headerTitle: 'Thu Học phí', user: req.user, payments: [], totalPages: 0, search: '' }); }
};

const adminReports = (req, res) => { res.render('pages/admin/reports', { pageTitle: 'Báo cáo Thống kê', currentPage: 'reports', headerTitle: 'Báo cáo Thống kê', user: req.user }); };

const adminUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || ''; const filterRole = req.query.Role || '';
    const where = {};
    if (search) { where.OR = [{ TenDangNhap: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }]; }
    if (filterRole && ['admin', 'student'].includes(filterRole)) where.Role = filterRole;
    const [accounts, total] = await Promise.all([
      prisma.TAIKHOAN.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { NgayTao: 'desc' }, select: { MaTaiKhoan: true, TenDangNhap: true, Role: true, NgayTao: true, HoTen: true, MaSv: true, Email: true } }),
      prisma.TAIKHOAN.count({ where })
    ]);
    res.render('pages/admin/users', { pageTitle: 'Quản lý Tài khoản', currentPage: 'users', headerTitle: 'Quản lý Tài khoản', user: req.user, accounts, currentUserId: req.user.id || req.user.MaTaiKhoan, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/users', queryParams: { search, Role: filterRole, limit }, search, filterRole });
  } catch (err) { console.error('Error:', err); res.render('pages/admin/users', { pageTitle: 'Quản lý Tài khoản', currentPage: 'users', headerTitle: 'Quản lý Tài khoản', user: req.user, accounts: [], currentUserId: req.user.id || req.user.MaTaiKhoan, totalPages: 0, search: '', filterRole: '' }); }
};

// === STUDENT ===
const studentDashboard = (req, res) => { res.render('pages/student/dashboard', { pageTitle: 'Dashboard Sinh viên', currentPage: 'dashboard', headerTitle: 'Dashboard', user: req.user }); };
const studentCourseReg = (req, res) => { res.render('pages/student/course-registration', { pageTitle: 'Đăng ký Môn học', currentPage: 'course-registration', headerTitle: 'Đăng ký Môn học', user: req.user }); };
const studentMyCourses = (req, res) => { res.render('pages/student/my-courses', { pageTitle: 'Môn học đã ĐK', currentPage: 'my-courses', headerTitle: 'Môn học đã Đăng ký', user: req.user }); };
const studentMyTuition = (req, res) => { res.render('pages/student/my-tuition', { pageTitle: 'Học phí', currentPage: 'my-tuition', headerTitle: 'Học phí', user: req.user }); };
const studentMyPayments = (req, res) => { res.render('pages/student/my-payments', { pageTitle: 'Lịch sử Thanh toán', currentPage: 'my-payments', headerTitle: 'Lịch sử Thanh toán', user: req.user }); };
const studentMySchedule = (req, res) => { res.render('pages/student/my-schedule', { pageTitle: 'Thời khóa biểu', currentPage: 'my-schedule', headerTitle: 'Thời khóa biểu', user: req.user }); };
const studentProfile = (req, res) => { res.render('pages/student/profile', { pageTitle: 'Hồ sơ Sinh viên', currentPage: 'profile', headerTitle: 'Hồ sơ cá nhân', user: req.user }); };
const studentNotifications = (req, res) => { res.render('pages/student/notifications', { pageTitle: 'Thông báo', currentPage: 'notifications', headerTitle: 'Thông báo', user: req.user }); };

module.exports = {
  requireViewAuth, requireViewAdmin, requireViewStudent,
  root, loginPage, logout,
  adminDashboard, adminStudents, adminCourses, adminClasses, adminSemesters,
  adminRegistrations, adminTuition, adminPayments, adminReports, adminUsers,
  studentDashboard, studentCourseReg, studentMyCourses, studentMyTuition,
  studentMyPayments, studentMySchedule, studentProfile, studentNotifications
};
