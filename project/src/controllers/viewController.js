const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { isSystemAdminUser } = require('../middleware/auth');
const { DEFAULT_PAGE_SIZE } = require('../utils/pagination');
const { TRASH_ENTITIES } = require('../utils/trashConfig');
require('dotenv').config();

function getTokenFromCookie(req) {
  return req.cookies && req.cookies.token ? req.cookies.token : null;
}

async function getUserFromToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    const userId = Number(decoded.MaTaiKhoan || decoded.id || 0);
    if (!userId) return null;

    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: userId },
      select: {
        MaTaiKhoan: true,
        TenDangNhap: true,
        Role: true,
        MaNhom: true,
        MaSv: true,
        HoTen: true,
        AnhDaiDien: true,
        TrangThai: true,
        TrangThaiDuyet: true,
        SINHVIEN_SINHVIEN_MaTaiKhoanToTAIKHOAN: { select: { MaSv: true, AnhDaiDien: true } },
        QUANTRIVIEN: { select: { HoTen: true, ChucVu: true, AnhDaiDien: true } }
      }
    });

    if (!account || account.TrangThai === false || account.TrangThaiDuyet !== 'approved') return null;

    return {
      ...decoded,
      id: account.MaTaiKhoan,
      MaTaiKhoan: account.MaTaiKhoan,
      username: account.TenDangNhap,
      Role: account.Role,
      MaNhom: account.MaNhom,
      MaSv: account.MaSv || account.SINHVIEN_SINHVIEN_MaTaiKhoanToTAIKHOAN?.MaSv || decoded.MaSv,
      HoTen: account.QUANTRIVIEN?.HoTen || account.HoTen || decoded.HoTen,
      ChucVu: account.QUANTRIVIEN?.ChucVu || decoded.ChucVu,
      AnhDaiDien: account.QUANTRIVIEN?.AnhDaiDien || account.SINHVIEN_SINHVIEN_MaTaiKhoanToTAIKHOAN?.AnhDaiDien || account.AnhDaiDien || decoded.AnhDaiDien
    };
  } catch (e) {
    return null;
  }
}

const toNumber = (value) => Number(value || 0);

const formatTimeValue = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 16);
};

const conditionTypeLabel = (value) => {
  if (value === 'tien_quyet') return 'Tiên quyết';
  if (value === 'hoc_truoc') return 'Học trước';
  return value || '-';
};

const getTuitionStatus = (amountDue, amountPaid, dueDate) => {
  if (amountDue <= 0) return 'Chưa phát sinh';
  if (amountPaid < amountDue && dueDate && new Date(dueDate) < new Date()) return 'Quá hạn';
  if (amountPaid <= 0) return 'Chưa đóng';
  if (amountPaid < amountDue) return 'Đóng một phần';
  return 'Đã đóng đủ';
};

const filterTuitionByStatus = (row, status) => {
  if (!status) return true;
  if (status === 'paid') return row.TrangThaiHocPhi === 'Đã đóng đủ';
  if (status === 'partial') return row.TrangThaiHocPhi === 'Đóng một phần';
  if (status === 'unpaid') return row.TrangThaiHocPhi === 'Chưa đóng';
  if (status === 'overdue') return row.TrangThaiHocPhi === 'Quá hạn';
  return row.TrangThaiHocPhi === status;
};

const attachUpdaterNames = async (rows = []) => {
  const ids = Array.from(new Set(rows.map((row) => row.NguoiCapNhat).filter(Boolean)));
  if (!ids.length) return rows;

  const users = await prisma.TAIKHOAN.findMany({
    where: { MaTaiKhoan: { in: ids } },
    select: { MaTaiKhoan: true, HoTen: true, TenDangNhap: true }
  });
  const userMap = new Map(users.map((user) => [user.MaTaiKhoan, user.HoTen || user.TenDangNhap]));
  return rows.map((row) => ({
    ...row,
    NguoiCapNhatTen: userMap.get(row.NguoiCapNhat) || row.NguoiCapNhat
  }));
};

const getCreatableAccountGroups = async (user) => {
  const groups = await prisma.NHOMNGUOIDUNG.findMany({
    where: { DaXoa: false },
    orderBy: { MaNhom: 'asc' },
    select: { MaNhom: true, TenNhom: true }
  });

  if (isSystemAdminUser(user)) return groups;

  const allowed = new Set(['SINHVIEN']);
  if (user?.MaNhom) allowed.add(String(user.MaNhom).toUpperCase());
  return groups.filter((group) => allowed.has(String(group.MaNhom).toUpperCase()));
};

const roleFromGroupCode = (MaNhom) => (
  String(MaNhom || '').toUpperCase() === 'SINHVIEN' ? 'student' : 'admin'
);

const renderAdmin = (res, view, page, title, req, locals = {}) => {
  res.render(`pages/admin/${view}`, {
    pageTitle: title,
    activePage: page,
    headerTitle: title,
    user: req.user,
    chucVu: req.user?.ChucVu || 'Quản trị viên hệ thống',
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

const getLoginPathForRequest = (req) => (
  req.path && req.path.startsWith('/admin') ? '/admin/login' : '/login'
);

const requireViewAuth = async (req, res, next) => {
  const user = await getUserFromToken(getTokenFromCookie(req));
  if (!user) return res.redirect(getLoginPathForRequest(req));
  req.user = user;
  next();
};

const requireViewAdmin = (req, res, next) => {
  if (!req.user || req.user.Role !== 'admin') return res.redirect('/admin/login');
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

const renderLoginPage = async (req, res, loginRole) => {
  const user = await getUserFromToken(getTokenFromCookie(req));
  if (user) {
    if (user.Role === 'admin') return res.redirect('/admin/dashboard');
    return res.redirect('/student/dashboard');
  }

  const isAdminLogin = loginRole === 'admin';
  res.render('pages/login', {
    pageTitle: isAdminLogin ? 'Đăng nhập Admin' : 'Đăng nhập Sinh viên',
    loginRole,
    loginAction: isAdminLogin ? '/admin/login' : '/login',
    loginApiPath: isAdminLogin ? '/api/auth/admin/login' : '/api/auth/login',
    forgotPasswordPath: isAdminLogin ? '/admin/forgot-password' : '/forgot-password',
    loginTitle: isAdminLogin ? 'Đăng nhập Admin' : 'Đăng nhập Sinh viên',
    loginSubtitle: isAdminLogin
      ? 'Khu vực quản trị hệ thống tín chỉ và học phí'
      : 'Cổng sinh viên quản lý tín chỉ và học phí',
    brandMark: isAdminLogin ? 'AD' : 'SV'
  });
};

const loginPage = (req, res) => {
  return renderLoginPage(req, res, 'student');
};

const adminLoginPage = (req, res) => {
  return renderLoginPage(req, res, 'admin');
};

const renderForgotPasswordPage = async (req, res, forgotRole) => {
  const isAdminForgot = forgotRole === 'admin';
  res.render('pages/forgot-password', {
    pageTitle: 'Quên mật khẩu',
    forgotRole,
    forgotApiPath: '/api/auth/forgot-password',
    loginPath: isAdminForgot ? '/admin/login' : '/login',
    forgotTitle: isAdminForgot ? 'Quên mật khẩu Admin' : 'Quên mật khẩu Sinh viên',
    forgotSubtitle: 'Nhập tên đăng nhập hoặc email để nhận mã OTP đặt lại mật khẩu',
    brandMark: isAdminForgot ? 'AD' : 'SV'
  });
};

const forgotPasswordPage = (req, res) => {
  return renderForgotPasswordPage(req, res, 'student');
};

const adminForgotPasswordPage = (req, res) => {
  return renderForgotPasswordPage(req, res, 'admin');
};

const resetPasswordPage = (req, res) => {
  const resetRole = req.query.role === 'admin' ? 'admin' : 'student';
  res.render('pages/reset-password', {
    pageTitle: 'Đặt lại mật khẩu',
    resetApiPath: '/api/auth/reset-password',
    identifier: req.query.identifier || req.query.username || req.query.email || '',
    resetRole,
    loginPath: resetRole === 'admin' ? '/admin/login' : '/login',
    brandMark: 'TC'
  });
};

const logout = async (req, res) => {
  const user = await getUserFromToken(getTokenFromCookie(req));
  res.clearCookie('token');
  res.redirect(user && user.Role === 'admin' ? '/admin/login' : '/login');
};

const adminDashboard = (req, res) => {
  renderAdmin(res, 'dashboard', 'dashboard', 'Bảng điều khiển', req, {
    headerSubtitle: 'Tổng quan tình hình đăng ký tín chỉ và học phí'
  });
};

const adminStudents = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const where = { DaXoa: false };

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
          DANTOC: true,
          DOITUONGSINHVIEN: { include: { DOITUONG: true } },
          TAIKHOAN_SINHVIEN_MaTaiKhoanToTAIKHOAN: {
            select: { MaTaiKhoan: true }
          }
        }
      }),
      prisma.SINHVIEN.count({ where })
    ]);
    const displayStudents = await attachUpdaterNames(students);

    renderAdmin(res, 'students', 'students', 'Quản lý sinh viên', req, {
      students: displayStudents,
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
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const where = { DaXoa: false };

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
    const displayCourses = await attachUpdaterNames(courses);

    renderAdmin(res, 'courses', 'courses', 'Quản lý môn học', req, {
      courses: displayCourses,
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
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const where = { DaXoa: false };

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
        include: {
          MONHOC: true,
          CHITIETDANGKY: { where: { TrangThai: 'Đã đăng ký' }, select: { id: true } }
        }
      }),
      prisma.LOP.count({ where })
    ]);
    const displayClasses = await attachUpdaterNames(classes);

    renderAdmin(res, 'classes', 'classes', 'Quản lý lớp học', req, {
      classes: displayClasses,
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
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  try {
    const [semesters, total] = await Promise.all([
      prisma.HOCKY.findMany({
        where: { DaXoa: false },
        skip: (page - 1) * limit,
        take: limit,
        include: { NAMHOC: true },
        orderBy: { NgayBatDau: 'desc' }
      }),
      prisma.HOCKY.count({ where: { DaXoa: false } })
    ]);
    const displaySemesters = await attachUpdaterNames(semesters);
    renderAdmin(res, 'semesters', 'semesters', 'Quản lý học kỳ', req, {
      semesters: displaySemesters,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/semesters',
      queryParams: { limit }
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'semesters', 'semesters', 'Quản lý học kỳ', req, {
      semesters: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/semesters',
      queryParams: {}
    });
  }
};

const adminPeriods = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const where = { DaXoa: false };
  if (search) {
    where.OR = [
      { MaTiet: { contains: search, mode: 'insensitive' } },
      { TenTiet: { contains: search, mode: 'insensitive' } },
      { MoTa: { contains: search, mode: 'insensitive' } }
    ];
  }

  try {
    const [periods, total] = await Promise.all([
      prisma.TIETHOC.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ ThuTu: 'asc' }, { MaTiet: 'asc' }]
      }),
      prisma.TIETHOC.count({ where })
    ]);
    const displayPeriods = (await attachUpdaterNames(periods)).map((period) => ({
      ...period,
      GioBatDauText: formatTimeValue(period.GioBatDau),
      GioKetThucText: formatTimeValue(period.GioKetThuc)
    }));

    renderAdmin(res, 'periods', 'periods', 'Quản lý tiết học', req, {
      periods: displayPeriods,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/periods',
      queryParams: { search, limit },
      search
    });
  } catch (err) {
    console.error('adminPeriods error:', err);
    renderAdmin(res, 'periods', 'periods', 'Quản lý tiết học', req, {
      periods: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/periods',
      queryParams: {},
      search: ''
    });
  }
};

const adminPrerequisites = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const filterType = req.query.LoaiDieuKien || '';
  const where = { DaXoa: false };
  if (filterType) where.LoaiDieuKien = filterType;
  if (search) {
    where.OR = [
      { MaMonHoc: { contains: search, mode: 'insensitive' } },
      { MaMonDieuKien: { contains: search, mode: 'insensitive' } },
      { MoTa: { contains: search, mode: 'insensitive' } },
      {
        MONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC: {
          TenMonHoc: { contains: search, mode: 'insensitive' }
        }
      },
      {
        MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC: {
          TenMonHoc: { contains: search, mode: 'insensitive' }
        }
      }
    ];
  }

  try {
    const [prerequisites, total, courses] = await Promise.all([
      prisma.DIEUKIENMONHOC.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ MaMonHoc: 'asc' }, { LoaiDieuKien: 'asc' }, { MaMonDieuKien: 'asc' }],
        include: {
          MONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC: true,
          MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC: true
        }
      }),
      prisma.DIEUKIENMONHOC.count({ where }),
      prisma.MONHOC.findMany({
        where: { DaXoa: false, TrangThai: true },
        orderBy: { MaMonHoc: 'asc' },
        select: { MaMonHoc: true, TenMonHoc: true }
      })
    ]);
    const displayPrerequisites = (await attachUpdaterNames(prerequisites)).map((row) => ({
      ...row,
      LoaiDieuKienLabel: conditionTypeLabel(row.LoaiDieuKien)
    }));

    renderAdmin(res, 'prerequisites', 'prerequisites', 'Ràng buộc môn học trước', req, {
      prerequisites: displayPrerequisites,
      courses,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/prerequisites',
      queryParams: { search, LoaiDieuKien: filterType, limit },
      search,
      filterType
    });
  } catch (err) {
    console.error('adminPrerequisites error:', err);
    renderAdmin(res, 'prerequisites', 'prerequisites', 'Ràng buộc môn học trước', req, {
      prerequisites: [],
      courses: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/prerequisites',
      queryParams: {},
      search: '',
      filterType: ''
    });
  }
};

const adminRegistrations = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const where = {};

  if (status) where.TrangThai = status;
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
        HOCKY: { include: { NAMHOC: true } },
        CHITIETDANGKY: {
          where: { TrangThai: 'Đã đăng ký' },
          select: { id: true, SoTinChi: true }
        },
        PHIEUTHUHOCPHI: { where: { TrangThai: 'Thành công' } }
      }
    });

    const grouped = Array.from(registrations.reduce((map, registration) => {
      const key = registration.MaSv;
      if (!map.has(key)) {
        map.set(key, {
          MaSv: registration.MaSv,
          SINHVIEN: registration.SINHVIEN,
          latestRegistration: registration,
          soPhieu: 0,
          soMon: 0,
          TongTinChi: 0,
          TongTienPhaiDong: 0,
          DaThu: 0,
          statuses: new Set(),
          semesters: new Set()
        });
      }

      const row = map.get(key);
      row.soPhieu += 1;
      row.soMon += registration.CHITIETDANGKY.length;
      row.TongTinChi += Number(registration.TongTinChi || registration.CHITIETDANGKY.reduce((sum, item) => sum + Number(item.SoTinChi || 0), 0));
      row.TongTienPhaiDong += Number(registration.TongTienPhaiDong || registration.TongTienDangKy || 0);
      row.DaThu += registration.PHIEUTHUHOCPHI.reduce((sum, item) => sum + Number(item.SoTienThu || 0), 0);
      if (registration.TrangThai) row.statuses.add(registration.TrangThai);
      const semesterName = registration.HOCKY
        ? `${registration.HOCKY.TenHocKy}${registration.HOCKY.NAMHOC ? ' - ' + registration.HOCKY.NAMHOC.TenNamHoc : ''}`
        : registration.MaHocKy;
      row.semesters.add(semesterName);
      return map;
    }, new Map()).values()).map((row) => ({
      ...row,
      TrangThaiTongHop: Array.from(row.statuses).join(', ') || 'Đã đăng ký',
      HocKyGanNhat: row.latestRegistration?.HOCKY
        ? `${row.latestRegistration.HOCKY.TenHocKy}${row.latestRegistration.HOCKY.NAMHOC ? ' - ' + row.latestRegistration.HOCKY.NAMHOC.TenNamHoc : ''}`
        : row.latestRegistration?.MaHocKy,
      DanhSachHocKy: Array.from(row.semesters).join(', ')
    }));

    const total = grouped.length;
    const registrationStudents = grouped.slice((page - 1) * limit, page * limit);

    renderAdmin(res, 'registrations', 'registrations', 'Quản lý đăng ký tín chỉ', req, {
      registrations: registrationStudents,
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
  const limit = DEFAULT_PAGE_SIZE;
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
        HOCKY: { include: { NAMHOC: true } },
        CHITIETDANGKY: true,
        PHIEUTHUHOCPHI: { where: { TrangThai: 'Thành công' } }
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
        SoMonHocMoi: registration.SoMonHocMoi || 0,
        SoMonHocLai: registration.SoMonHocLai || 0,
        SoMonHocCaiThien: registration.SoMonHocCaiThien || 0,
        TongTienPhaiDong: amountDue,
        TongTienDaDong: amountPaid,
        ConNo: debt,
        TrangThaiHocPhi: getTuitionStatus(amountDue, amountPaid, registration.HOCKY?.HanDongHocPhi),
        HanDongHocPhi: registration.HOCKY?.HanDongHocPhi,
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
  const limit = DEFAULT_PAGE_SIZE;
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
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const filterRole = req.query.Role || req.query.role || '';
  const filterGroup = req.query.MaNhom || req.query.group || '';
  const where = {};

  try {
    const groupOptions = await getCreatableAccountGroups(req.user);
    const allowedGroupCodes = groupOptions.map((group) => group.MaNhom);
    const filterGroupAllowed = !filterGroup || allowedGroupCodes.includes(filterGroup);

    if (search) {
      where.OR = [
        { TenDangNhap: { contains: search, mode: 'insensitive' } },
        { HoTen: { contains: search, mode: 'insensitive' } },
        { Email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (filterRole && ['admin', 'student'].includes(filterRole)) where.Role = filterRole;
    where.MaNhom = filterGroupAllowed && filterGroup ? filterGroup : { in: allowedGroupCodes };

    const [accounts, total] = filterGroupAllowed ? await Promise.all([
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
          TrangThai: true,
          QUANTRIVIEN: { select: { ChucVu: true, PhongBan: true } }
        }
      }),
      prisma.TAIKHOAN.count({ where })
    ]) : [[], 0];

    renderAdmin(res, 'users', 'users', 'Quản lý người dùng', req, {
      accounts,
      groupOptions,
      creatableGroups: groupOptions.map((group) => ({ ...group, Role: roleFromGroupCode(group.MaNhom) })),
      currentUserId: req.user.id || req.user.MaTaiKhoan,
      canManageAccounts: isSystemAdminUser(req.user),
      canCreateAccounts: groupOptions.length > 0,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/users',
      queryParams: { search, Role: filterRole, MaNhom: filterGroup, limit },
      search,
      filterRole,
      filterGroup
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'users', 'users', 'Quản lý người dùng', req, {
      accounts: [],
      groupOptions: [],
      creatableGroups: [],
      currentUserId: req.user.id || req.user.MaTaiKhoan,
      canManageAccounts: isSystemAdminUser(req.user),
      canCreateAccounts: false,
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/users',
      queryParams: {},
      search: '',
      filterRole: '',
      filterGroup: ''
    });
  }
};

// ══════════════════════════════════════════════
// NEW ADMIN PAGES
// ══════════════════════════════════════════════

const adminFaculties = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const where = { DaXoa: false };
  if (search) {
    where.OR = [
      { MaKhoa: { contains: search, mode: 'insensitive' } },
      { TenKhoa: { contains: search, mode: 'insensitive' } }
    ];
  }
  try {
    const [faculties, total] = await Promise.all([
      prisma.KHOA.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { MaKhoa: 'asc' }, include: { _count: { select: { MONHOC: true, NGANHHOC: true } } } }),
      prisma.KHOA.count({ where })
    ]);
    const displayFaculties = await attachUpdaterNames(faculties);
    renderAdmin(res, 'faculties', 'faculties', 'Quản lý khoa', req, { faculties: displayFaculties, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/faculties', queryParams: { search, limit }, search });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'faculties', 'faculties', 'Quản lý khoa', req, { faculties: [], currentPage: 1, totalPages: 0, baseUrl: '/admin/faculties', queryParams: {}, search: '' });
  }
};

const adminMajors = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const filterKhoa = req.query.MaKhoa || '';
  const where = { DaXoa: false };
  if (search) { where.OR = [{ MaNganh: { contains: search, mode: 'insensitive' } }, { TenNganh: { contains: search, mode: 'insensitive' } }]; }
  if (filterKhoa) where.MaKhoa = filterKhoa;
  try {
    const [majors, total, faculties] = await Promise.all([
      prisma.NGANHHOC.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { MaNganh: 'asc' }, include: { KHOA: true, _count: { select: { SINHVIEN: true } } } }),
      prisma.NGANHHOC.count({ where }),
      prisma.KHOA.findMany({ where: { DaXoa: false }, orderBy: { TenKhoa: 'asc' } })
    ]);
    const displayMajors = await attachUpdaterNames(majors);
    renderAdmin(res, 'majors', 'majors', 'Quản lý ngành học', req, { majors: displayMajors, faculties, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/majors', queryParams: { search, MaKhoa: filterKhoa, limit }, search, filterKhoa });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'majors', 'majors', 'Quản lý ngành học', req, { majors: [], faculties: [], currentPage: 1, totalPages: 0, baseUrl: '/admin/majors', queryParams: {}, search: '', filterKhoa: '' });
  }
};

const adminCompletedCourses = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const filterHocKy = req.query.MaHocKy || '';
  const filterResult = req.query.KetQua || '';
  const where = { DaXoa: false };
  if (filterHocKy) where.MaHocKy = filterHocKy;
  if (filterResult) where.KetQua = filterResult;
  if (search) { where.SINHVIEN = { OR: [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }] }; }
  try {
    const [completedRows, semesters] = await Promise.all([
      prisma.MONDAHOC.findMany({
        where,
        orderBy: [{ NgayCapNhat: 'desc' }, { NgayTao: 'desc' }, { id: 'desc' }],
        include: {
          SINHVIEN: { select: { MaSv: true, HoTen: true } },
          MONHOC: { select: { MaMonHoc: true, SoTinChi: true } },
          TAIKHOAN: { select: { HoTen: true, TenDangNhap: true } }
        }
      }),
      prisma.HOCKY.findMany({ where: { DaXoa: false }, orderBy: { NgayBatDau: 'desc' } })
    ]);

    const studentMap = new Map();
    completedRows.forEach((row) => {
      if (!studentMap.has(row.MaSv)) {
        studentMap.set(row.MaSv, {
          MaSv: row.MaSv,
          HoTen: row.SINHVIEN?.HoTen || '',
          totalAttempts: 0,
          passedCount: 0,
          failedCount: 0,
          passedCreditsByCourse: new Map(),
          passedCredits: 0,
          NgayCapNhatGanNhat: null,
          NguoiCapNhatTen: '-'
        });
      }

      const item = studentMap.get(row.MaSv);
      item.totalAttempts += 1;
      if (row.KetQua === 'qua_mon') {
        item.passedCount += 1;
        item.passedCreditsByCourse.set(row.MaMonHoc, Number(row.MONHOC?.SoTinChi || 0));
      } else if (row.KetQua === 'rot') {
        item.failedCount += 1;
      }

      const updatedAt = row.NgayCapNhat || row.NgayTao;
      if (updatedAt && (!item.NgayCapNhatGanNhat || new Date(updatedAt) > new Date(item.NgayCapNhatGanNhat))) {
        item.NgayCapNhatGanNhat = updatedAt;
        item.NguoiCapNhatTen = row.TAIKHOAN ? (row.TAIKHOAN.HoTen || row.TAIKHOAN.TenDangNhap) : '-';
      }
    });

    const completedStudentRows = Array.from(studentMap.values()).map((item) => ({
      ...item,
      passedCredits: Array.from(item.passedCreditsByCourse.values()).reduce((sum, credits) => sum + credits, 0),
      passedCreditsByCourse: undefined
    })).sort((a, b) => {
      const dateDiff = new Date(b.NgayCapNhatGanNhat || 0) - new Date(a.NgayCapNhatGanNhat || 0);
      return dateDiff || String(a.MaSv).localeCompare(String(b.MaSv));
    });

    const total = completedStudentRows.length;
    const completedStudents = completedStudentRows.slice((page - 1) * limit, page * limit);

    renderAdmin(res, 'completed-courses', 'completed-courses', 'Quản lý môn đã học', req, { completedStudents, semesters, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/completed-courses', queryParams: { search, MaHocKy: filterHocKy, KetQua: filterResult, limit }, search, filterHocKy, filterResult });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'completed-courses', 'completed-courses', 'Quản lý môn đã học', req, { completedStudents: [], semesters: [], currentPage: 1, totalPages: 0, baseUrl: '/admin/completed-courses', queryParams: {}, search: '', filterHocKy: '', filterResult: '' });
  }
};

const adminPricing = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const filterLoaiMon = req.query.LoaiMon || '';
  const filterHocKy = req.query.MaHocKy || '';
  const where = { DaXoa: false };
  if (filterLoaiMon) where.LoaiMon = filterLoaiMon;
  if (filterHocKy) where.MaHocKy = filterHocKy;
  try {
    const [pricing, total, semesters] = await Promise.all([
      prisma.DONGIATINCHI.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' }, include: { HOCKY: true } }),
      prisma.DONGIATINCHI.count({ where }),
      prisma.HOCKY.findMany({ where: { DaXoa: false }, orderBy: { NgayBatDau: 'desc' } })
    ]);
    const displayPricing = await attachUpdaterNames(pricing);
    renderAdmin(res, 'pricing', 'pricing', 'Đơn giá tín chỉ', req, {
      pricing: displayPricing,
      semesters,
      filterLoaiMon,
      filterHocKy,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/pricing',
      queryParams: { LoaiMon: filterLoaiMon, MaHocKy: filterHocKy, limit }
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'pricing', 'pricing', 'Đơn giá tín chỉ', req, {
      pricing: [],
      semesters: [],
      filterLoaiMon: '',
      filterHocKy: '',
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/pricing',
      queryParams: {}
    });
  }
};

const adminBeneficiaries = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  try {
    const [beneficiaries, total] = await Promise.all([
      prisma.DOITUONG.findMany({ where: { DaXoa: false }, skip: (page - 1) * limit, take: limit, orderBy: { DoUuTien: 'asc' }, include: { _count: { select: { DOITUONGSINHVIEN: true } } } }),
      prisma.DOITUONG.count({ where: { DaXoa: false } })
    ]);
    const displayBeneficiaries = await attachUpdaterNames(beneficiaries);
    renderAdmin(res, 'beneficiaries', 'beneficiaries', 'Đối tượng ưu tiên', req, {
      beneficiaries: displayBeneficiaries,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/beneficiaries',
      queryParams: { limit }
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'beneficiaries', 'beneficiaries', 'Đối tượng ưu tiên', req, {
      beneficiaries: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/beneficiaries',
      queryParams: {}
    });
  }
};

const adminPermissions = async (req, res) => {
  const groupPage = parseInt(req.query.groupPage, 10) || 1;
  const functionPage = parseInt(req.query.functionPage, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  try {
    const [groups, groupTotal, functions, functionTotal] = await Promise.all([
      prisma.NHOMNGUOIDUNG.findMany({
        where: { DaXoa: false },
        skip: (groupPage - 1) * limit,
        take: limit,
        orderBy: { MaNhom: 'asc' },
        include: { _count: { select: { TAIKHOAN: true, PHANQUYEN: true } } }
      }),
      prisma.NHOMNGUOIDUNG.count({ where: { DaXoa: false } }),
      prisma.CHUCNANG.findMany({
        where: { DaXoa: false },
        skip: (functionPage - 1) * limit,
        take: limit,
        orderBy: { MaChucNang: 'asc' },
        include: { _count: { select: { PHANQUYEN: true } } }
      }),
      prisma.CHUCNANG.count({ where: { DaXoa: false } })
    ]);
    renderAdmin(res, 'permissions', 'permissions', 'Phân quyền hệ thống', req, {
      groups,
      functions,
      groupPage,
      functionPage,
      groupTotalPages: Math.ceil(groupTotal / limit),
      functionTotalPages: Math.ceil(functionTotal / limit)
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'permissions', 'permissions', 'Phân quyền hệ thống', req, {
      groups: [],
      functions: [],
      groupPage: 1,
      functionPage: 1,
      groupTotalPages: 0,
      functionTotalPages: 0
    });
  }
};

const adminNotifications = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const filterLoai = req.query.Loai || '';
  const where = { DaXoa: false };
  if (filterLoai) where.Loai = filterLoai;
  try {
    const [notifications, total] = await Promise.all([
      prisma.THONGBAO.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { NgayTao: 'desc' } }),
      prisma.THONGBAO.count({ where })
    ]);
    renderAdmin(res, 'notifications', 'notifications', 'Quản lý thông báo', req, {
      notifications,
      filterLoai,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/notifications',
      queryParams: { Loai: filterLoai, limit }
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'notifications', 'notifications', 'Quản lý thông báo', req, {
      notifications: [],
      filterLoai: '',
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/notifications',
      queryParams: {}
    });
  }
};

const adminSettings = async (req, res) => {
  try {
    const settings = await prisma.THAMSO.findFirst();
    renderAdmin(res, 'settings', 'settings', 'Tham số hệ thống', req, { settings });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'settings', 'settings', 'Tham số hệ thống', req, { settings: null });
  }
};

const adminTrash = (req, res) => {
  renderAdmin(res, 'trash', 'trash', 'Thùng rác', req, {
    entities: Object.entries(TRASH_ENTITIES).map(([key, config]) => ({
      key,
      label: config.label
    }))
  });
};

const adminProfile = (req, res) => {
  renderAdmin(res, 'profile', 'profile', 'Hồ sơ quản trị viên', req);
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

const studentCompletedCourses = (req, res) => {
  renderStudent(res, 'completed-courses', 'completed-courses', 'Môn đã học', req);
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

const studentCurriculum = (req, res) => {
  renderStudent(res, 'curriculum', 'curriculum', 'Chương trình đào tạo', req);
};

module.exports = {
  requireViewAuth,
  requireViewAdmin,
  requireViewStudent,
  root,
  loginPage,
  adminLoginPage,
  forgotPasswordPage,
  adminForgotPasswordPage,
  resetPasswordPage,
  logout,
  adminDashboard,
  adminStudents,
  adminCourses,
  adminClasses,
  adminSemesters,
  adminPeriods,
  adminPrerequisites,
  adminRegistrations,
  adminTuition,
  adminPayments,
  adminReports,
  adminUsers,
  adminFaculties,
  adminMajors,
  adminCompletedCourses,
  adminPricing,
  adminBeneficiaries,
  adminPermissions,
  adminNotifications,
  adminSettings,
  adminTrash,
  adminProfile,
  studentDashboard,
  studentCourseReg,
  studentMyCourses,
  studentCompletedCourses,
  studentMyTuition,
  studentMyPayments,
  studentMySchedule,
  studentProfile,
  studentNotifications,
  studentCurriculum
};
