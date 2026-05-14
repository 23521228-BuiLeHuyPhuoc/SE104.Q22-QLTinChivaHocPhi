const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
require('dotenv').config();

function getTokenFromCookie(req) {
  return req.cookies && req.cookies.token ? req.cookies.token : null;
}

async function getUserFromToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return null;
  }
}

const toNumber = (value) => Number(value || 0);

const getTuitionStatus = (amountDue, amountPaid) => {
  if (amountDue <= 0) return 'Chưa phát sinh';
  if (amountPaid <= 0) return 'Chưa đóng';
  if (amountPaid < amountDue) return 'Đóng một phần';
  return 'Đã đóng đủ';
};

const filterTuitionByStatus = (row, status) => {
  if (!status) return true;
  if (status === 'paid') return row.TrangThaiHocPhi === 'Đã đóng đủ';
  if (status === 'partial') return row.TrangThaiHocPhi === 'Đóng một phần';
  if (status === 'unpaid') return row.TrangThaiHocPhi === 'Chưa đóng';
  return row.TrangThaiHocPhi === status;
};

const renderAdmin = (res, view, page, title, req, locals = {}) => {
  res.render(`pages/admin/${view}`, {
    pageTitle: title,
    activePage: page,
    headerTitle: title,
    user: req.user,
    ...locals
  });
};

const renderStudent = (res, view, page, title, req, locals = {}) => {
  res.render(`pages/student/${view}`, {
    pageTitle: title,
    activePage: page,
    headerTitle: title,
    user: req.user,
    ...locals
  });
};

const requireViewAuth = async (req, res, next) => {
  const user = await getUserFromToken(getTokenFromCookie(req));
  if (!user) return res.redirect('/login');
  req.user = user;
  next();
};

const requireViewAdmin = (req, res, next) => {
  if (!req.user || req.user.Role !== 'admin') return res.redirect('/login');
  next();
};

const requireViewStudent = (req, res, next) => {
  if (!req.user || req.user.Role !== 'student') return res.redirect('/login');
  next();
};

const root = async (req, res) => {
  const user = await getUserFromToken(getTokenFromCookie(req));
  if (user) {
    if (user.Role === 'admin') return res.redirect('/admin/dashboard');
    return res.redirect('/student/dashboard');
  }
  res.redirect('/login');
};

const loginPage = (req, res) => {
  res.render('pages/login', { pageTitle: 'Đăng nhập' });
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
};

const adminDashboard = (req, res) => {
  renderAdmin(res, 'dashboard', 'dashboard', 'Bảng điều khiển', req, {
    headerSubtitle: 'Tổng quan tình hình đăng ký tín chỉ và học phí'
  });
};

const adminStudents = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const where = {};

  if (search) {
    where.OR = [
      { MaSv: { contains: search, mode: 'insensitive' } },
      { HoTen: { contains: search, mode: 'insensitive' } },
      { Email: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (status) where.TrangThai = status;

  try {
    const [students, total] = await Promise.all([
      prisma.SINHVIEN.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { MaSv: 'asc' },
        include: {
          NGANHHOC: { include: { KHOA: true } },
          PHUONGXA: true,
          DANTOC: true
        }
      }),
      prisma.SINHVIEN.count({ where })
    ]);

    renderAdmin(res, 'students', 'students', 'Quản lý sinh viên', req, {
      students,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/students',
      queryParams: { search, status, limit },
      search,
      status
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'students', 'students', 'Quản lý sinh viên', req, {
      students: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/students',
      queryParams: {},
      search: '',
      status: ''
    });
  }
};

const adminCourses = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  const where = {};

  if (search) {
    where.OR = [
      { MaMonHoc: { contains: search, mode: 'insensitive' } },
      { TenMonHoc: { contains: search, mode: 'insensitive' } }
    ];
  }

  try {
    const [courses, total] = await Promise.all([
      prisma.MONHOC.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { MaMonHoc: 'asc' },
        include: { KHOA: true }
      }),
      prisma.MONHOC.count({ where })
    ]);

    renderAdmin(res, 'courses', 'courses', 'Quản lý môn học', req, {
      courses,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/courses',
      queryParams: { search, limit },
      search
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'courses', 'courses', 'Quản lý môn học', req, {
      courses: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/courses',
      queryParams: {},
      search: ''
    });
  }
};

const adminClasses = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  const where = {};

  if (search) {
    where.OR = [
      { MaLop: { contains: search, mode: 'insensitive' } },
      { TenLop: { contains: search, mode: 'insensitive' } },
      { GiangVien: { contains: search, mode: 'insensitive' } }
    ];
  }

  try {
    const [classes, total] = await Promise.all([
      prisma.LOP.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { MaLop: 'asc' },
        include: { MONHOC: true }
      }),
      prisma.LOP.count({ where })
    ]);

    renderAdmin(res, 'classes', 'classes', 'Quản lý lớp học', req, {
      classes,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/classes',
      queryParams: { search, limit },
      search
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'classes', 'classes', 'Quản lý lớp học', req, {
      classes: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/classes',
      queryParams: {},
      search: ''
    });
  }
};

const adminSemesters = async (req, res) => {
  try {
    const semesters = await prisma.HOCKY.findMany({
      include: { NAMHOC: true },
      orderBy: { NgayBatDau: 'desc' }
    });
    renderAdmin(res, 'semesters', 'semesters', 'Quản lý học kỳ', req, { semesters });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'semesters', 'semesters', 'Quản lý học kỳ', req, { semesters: [] });
  }
};

const adminRegistrations = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const where = {};

  if (status) where.TrangThai = status;
  if (search) {
    where.PHIEUDANGKY = {
      SINHVIEN: {
        OR: [
          { MaSv: { contains: search, mode: 'insensitive' } },
          { HoTen: { contains: search, mode: 'insensitive' } }
        ]
      }
    };
  }

  try {
    const [registrations, total] = await Promise.all([
      prisma.CHITIETDANGKY.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { NgayDangKy: 'desc' },
        include: {
          LOP: { include: { MONHOC: true } },
          PHIEUDANGKY: { include: { SINHVIEN: true, HOCKY: true } }
        }
      }),
      prisma.CHITIETDANGKY.count({ where })
    ]);

    renderAdmin(res, 'registrations', 'registrations', 'Quản lý đăng ký tín chỉ', req, {
      registrations,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/registrations',
      queryParams: { search, status, limit },
      search,
      status
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'registrations', 'registrations', 'Quản lý đăng ký tín chỉ', req, {
      registrations: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/registrations',
      queryParams: {},
      search: '',
      status: ''
    });
  }
};

const adminTuition = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const where = {};

  if (search) {
    where.SINHVIEN = {
      OR: [
        { MaSv: { contains: search, mode: 'insensitive' } },
        { HoTen: { contains: search, mode: 'insensitive' } }
      ]
    };
  }

  try {
    const registrations = await prisma.PHIEUDANGKY.findMany({
      where,
      orderBy: { NgayLap: 'desc' },
      include: {
        SINHVIEN: true,
        HOCKY: true,
        CHITIETDANGKY: true,
        PHIEUTHUHOCPHI: true
      }
    });

    const rows = registrations.map((registration) => {
      const amountDue = toNumber(registration.TongTienPhaiDong || registration.TongTienDangKy);
      const amountPaid = registration.PHIEUTHUHOCPHI.reduce((sum, receipt) => sum + toNumber(receipt.SoTienThu), 0);
      const debt = Math.max(amountDue - amountPaid, 0);

      return {
        SoPhieu: registration.SoPhieu,
        MaSv: registration.MaSv,
        HoTen: registration.SINHVIEN?.HoTen || '',
        MaHocKy: registration.MaHocKy,
        TenHocKy: registration.HOCKY?.TenHocKy || registration.MaHocKy,
        TongTinChi: registration.TongTinChi || registration.CHITIETDANGKY.reduce((sum, item) => sum + Number(item.SoTinChi || 0), 0),
        TongTienPhaiDong: amountDue,
        TongTienDaDong: amountPaid,
        ConNo: debt,
        TrangThaiHocPhi: getTuitionStatus(amountDue, amountPaid),
        NgayLap: registration.NgayLap
      };
    }).filter((row) => filterTuitionByStatus(row, status));

    const total = rows.length;
    const tuitions = rows.slice((page - 1) * limit, page * limit);

    renderAdmin(res, 'tuition', 'tuition', 'Quản lý học phí', req, {
      tuitions,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/tuition',
      queryParams: { search, status, limit },
      search,
      status
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'tuition', 'tuition', 'Quản lý học phí', req, {
      tuitions: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/tuition',
      queryParams: {},
      search: '',
      status: ''
    });
  }
};

const adminPayments = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  const where = {};

  if (search) {
    where.SINHVIEN = {
      OR: [
        { MaSv: { contains: search, mode: 'insensitive' } },
        { HoTen: { contains: search, mode: 'insensitive' } }
      ]
    };
  }

  try {
    const [payments, total] = await Promise.all([
      prisma.PHIEUTHUHOCPHI.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { NgayLap: 'desc' },
        include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: true } } }
      }),
      prisma.PHIEUTHUHOCPHI.count({ where })
    ]);

    renderAdmin(res, 'payments', 'payments', 'Thu học phí', req, {
      payments,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/payments',
      queryParams: { search, limit },
      search
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'payments', 'payments', 'Thu học phí', req, {
      payments: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/payments',
      queryParams: {},
      search: ''
    });
  }
};

const adminReports = (req, res) => {
  renderAdmin(res, 'reports', 'reports', 'Báo cáo thống kê', req, {
    headerSubtitle: 'Theo dõi doanh thu, công nợ và tình hình đăng ký'
  });
};

const adminUsers = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  const filterRole = req.query.Role || req.query.role || '';
  const where = {};

  if (search) {
    where.OR = [
      { TenDangNhap: { contains: search, mode: 'insensitive' } },
      { HoTen: { contains: search, mode: 'insensitive' } },
      { Email: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (filterRole && ['admin', 'student'].includes(filterRole)) where.Role = filterRole;

  try {
    const [accounts, total] = await Promise.all([
      prisma.TAIKHOAN.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { NgayTao: 'desc' },
        select: {
          MaTaiKhoan: true,
          TenDangNhap: true,
          Role: true,
          MaNhom: true,
          NgayTao: true,
          HoTen: true,
          MaSv: true,
          Email: true,
          TrangThai: true
        }
      }),
      prisma.TAIKHOAN.count({ where })
    ]);

    renderAdmin(res, 'users', 'users', 'Quản lý người dùng', req, {
      accounts,
      currentUserId: req.user.id || req.user.MaTaiKhoan,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/users',
      queryParams: { search, Role: filterRole, limit },
      search,
      filterRole
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'users', 'users', 'Quản lý người dùng', req, {
      accounts: [],
      currentUserId: req.user.id || req.user.MaTaiKhoan,
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/users',
      queryParams: {},
      search: '',
      filterRole: ''
    });
  }
};

const studentDashboard = (req, res) => {
  renderStudent(res, 'dashboard', 'dashboard', 'Bảng điều khiển', req);
};

const studentCourseReg = (req, res) => {
  renderStudent(res, 'course-registration', 'course-registration', 'Đăng ký môn học', req);
};

const studentMyCourses = (req, res) => {
  renderStudent(res, 'my-courses', 'my-courses', 'Môn học đã đăng ký', req);
};

const studentMyTuition = (req, res) => {
  renderStudent(res, 'my-tuition', 'my-tuition', 'Học phí', req);
};

const studentMyPayments = (req, res) => {
  renderStudent(res, 'my-payments', 'my-payments', 'Lịch sử thanh toán', req);
};

const studentMySchedule = (req, res) => {
  renderStudent(res, 'my-schedule', 'my-schedule', 'Thời khóa biểu', req);
};

const studentProfile = (req, res) => {
  renderStudent(res, 'profile', 'profile', 'Hồ sơ cá nhân', req);
};

const studentNotifications = (req, res) => {
  renderStudent(res, 'notifications', 'notifications', 'Thông báo', req);
};

module.exports = {
  requireViewAuth,
  requireViewAdmin,
  requireViewStudent,
  root,
  loginPage,
  logout,
  adminDashboard,
  adminStudents,
  adminCourses,
  adminClasses,
  adminSemesters,
  adminRegistrations,
  adminTuition,
  adminPayments,
  adminReports,
  adminUsers,
  studentDashboard,
  studentCourseReg,
  studentMyCourses,
  studentMyTuition,
  studentMyPayments,
  studentMySchedule,
  studentProfile,
  studentNotifications
};
