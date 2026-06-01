const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { isSystemAdminUser } = require('../middleware/auth');
const { DEFAULT_PAGE_SIZE } = require('../utils/pagination');
const { TRASH_ENTITIES } = require('../utils/trashConfig');
const { applyPricingSearch, normalizePricingSearchScope } = require('../utils/pricingSearch');
const { applyRegistrationSearch, normalizeRegistrationSearchScope } = require('../utils/registrationSearch');
const { buildRegistrationStudentRows, buildRegistrationDistribution } = require('../utils/registrationStats');
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

const weekdayLabel = (value) => {
  const day = Number(value);
  if (day === 1) return 'Chủ nhật';
  if (day >= 2 && day <= 7) return `Thứ ${day}`;
  return value ? `Thứ ${value}` : '';
};

const periodRangeLabel = (schedule) => {
  if (!schedule) return '';
  const start = schedule.TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC?.TenTiet ||
    schedule.TIETHOC_LOP_MaTietBatDauToTIETHOC?.TenTiet ||
    schedule.MaTietBatDau;
  const end = schedule.TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC?.TenTiet ||
    schedule.TIETHOC_LOP_MaTietKetThucToTIETHOC?.TenTiet ||
    schedule.MaTietKetThuc;
  if (!start && !end) return '';
  return start === end ? start : `${start}-${end}`;
};

const classScheduleLabel = (openedClass) => {
  const schedules = (openedClass.LICHHOCLOP || []).filter((schedule) => schedule.TrangThai !== false);
  if (!schedules.length) return '-';
  return schedules.map((schedule) => {
    const parts = [weekdayLabel(schedule.ThuTrongTuan), periodRangeLabel(schedule)].filter(Boolean);
    const room = roomDisplayName(schedule.PHONGHOC) || schedule.PhongHoc || schedule.MaPhong;
    return parts.join(' ') + (room ? ` (${room})` : '');
  }).join('; ');
};

const catalogScheduleLabel = (cls) => {
  if (!cls?.ThuTrongTuan || !cls?.MaTietBatDau || !cls?.MaTietKetThuc) return cls?.LichHoc || '';
  const parts = [weekdayLabel(cls.ThuTrongTuan), periodRangeLabel(cls)].filter(Boolean);
  const room = roomDisplayName(cls.PHONGHOC) || cls.PhongHoc || cls.MaPhong;
  return parts.join(' ') + (room ? ` (${room})` : '');
};

const lecturerDisplayName = (lecturer) => {
  if (!lecturer) return '';
  return [lecturer.HocHamHocVi, lecturer.HoTen].filter(Boolean).join(' ').trim();
};

const roomDisplayName = (room) => {
  if (!room) return '';
  const code = String(room.MaPhong || '').trim();
  const name = String(room.TenPhong || '').trim();
  if (!code) return name;
  if (!name) return code;
  if (name.toLowerCase().includes(code.toLowerCase())) return name;
  return `${code} - ${name}`;
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
      ? 'Khu vực quản trị việc đăng ký môn học và thu học phí'
      : 'Cổng sinh viên quản lý việc đăng ký môn học và theo dõi học phí',
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
    headerSubtitle: 'Tổng quan việc đăng ký môn học và thu học phí'
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
  const filterKhoa = req.query.MaKhoa || '';
  const filterLoaiMon = req.query.LoaiMon || '';
  const where = { DaXoa: false };

  if (search) {
    where.OR = [
      { MaMonHoc: { contains: search, mode: 'insensitive' } },
      { TenMonHoc: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (filterKhoa) where.MaKhoa = filterKhoa;
  if (filterLoaiMon) where.LoaiMon = filterLoaiMon;

  try {
    const [courses, total, faculties] = await Promise.all([
      prisma.MONHOC.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { MaMonHoc: 'asc' },
        include: { KHOA: true }
      }),
      prisma.MONHOC.count({ where }),
      prisma.KHOA.findMany({ where: { DaXoa: false }, orderBy: { TenKhoa: 'asc' }, select: { MaKhoa: true, TenKhoa: true } })
    ]);
    const displayCourses = await attachUpdaterNames(courses);

    renderAdmin(res, 'courses', 'courses', 'Quản lý môn học', req, {
      courses: displayCourses,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/courses',
      queryParams: { search, MaKhoa: filterKhoa, LoaiMon: filterLoaiMon, limit },
      search,
      faculties,
      filterKhoa,
      filterLoaiMon
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'courses', 'courses', 'Quản lý môn học', req, {
      courses: [],
      faculties: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/courses',
      queryParams: {},
      search: '',
      filterKhoa: '',
      filterLoaiMon: ''
    });
  }
};

const adminClasses = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const searchScope = ['classCode', 'className', 'course', 'lecturer'].includes(req.query.searchScope) ? req.query.searchScope : 'classCode';
  const selectedSemester = req.query.MaHocKy || '';
  const openStatus = req.query.openStatus || '';
  const where = { DaXoa: false };

  if (selectedSemester && openStatus === 'not_open') {
    where.LOPMO = { none: { MaHocKy: selectedSemester } };
  } else if (selectedSemester) {
    where.LOPMO = {
      some: {
        MaHocKy: selectedSemester,
        HOCKY: { DaXoa: false },
        ...(openStatus === 'open' ? { TrangThai: true } : {}),
        ...(openStatus === 'closed' ? { TrangThai: false } : {})
      }
    };
  } else if (openStatus === 'open') {
    where.LOPMO = { some: { TrangThai: true, HOCKY: { DaXoa: false } } };
  } else if (openStatus === 'closed') {
    where.LOPMO = { some: { TrangThai: false, HOCKY: { DaXoa: false } } };
  } else if (openStatus === 'not_open') {
    where.LOPMO = { none: {} };
  }

  if (search) {
    const scopedSearch = {
      class: [
        { MaLop: { contains: search, mode: 'insensitive' } },
        { TenLop: { contains: search, mode: 'insensitive' } }
      ],
      classCode: [
        { MaLop: { contains: search, mode: 'insensitive' } }
      ],
      className: [
        { TenLop: { contains: search, mode: 'insensitive' } }
      ],
      course: [
        { MaMonHoc: { contains: search, mode: 'insensitive' } },
        { MONHOC: { TenMonHoc: { contains: search, mode: 'insensitive' } } }
      ],
      lecturer: [
        { MaGiangVien: { contains: search, mode: 'insensitive' } },
        { GiangVien: { contains: search, mode: 'insensitive' } },
        { GIANGVIEN: { is: { HoTen: { contains: search, mode: 'insensitive' } } } },
        { LOPMO: { some: { MaGiangVien: { contains: search, mode: 'insensitive' } } } },
        { LOPMO: { some: { GiangVien: { contains: search, mode: 'insensitive' } } } },
        { LOPMO: { some: { GIANGVIEN: { is: { HoTen: { contains: search, mode: 'insensitive' } } } } } }
      ]
    };
    where.OR = scopedSearch[searchScope];
  }

  try {
    const [classes, total, courses, semesters, periods, lecturers, rooms] = await Promise.all([
      prisma.LOP.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { MaLop: 'asc' },
        include: {
          MONHOC: { include: { KHOA: true } },
          GIANGVIEN: true,
          PHONGHOC: true,
          TIETHOC_LOP_MaTietBatDauToTIETHOC: true,
          TIETHOC_LOP_MaTietKetThucToTIETHOC: true,
          CHITIETDANGKY: { where: { TrangThai: 'Đã đăng ký' }, select: { id: true } },
          LOPMO: {
            include: {
              HOCKY: { include: { NAMHOC: true } },
              GIANGVIEN: true,
              LICHHOCLOP: {
                where: { TrangThai: true },
                include: {
                  PHONGHOC: true,
                  TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC: true,
                  TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC: true
                },
                orderBy: [{ ThuTrongTuan: 'asc' }, { MaTietBatDau: 'asc' }]
              }
            },
            orderBy: { NgayTao: 'desc' }
          }
        }
      }),
      prisma.LOP.count({ where }),
      prisma.MONHOC.findMany({
        where: { DaXoa: false, TrangThai: true },
        orderBy: { MaMonHoc: 'asc' },
        select: { MaMonHoc: true, TenMonHoc: true }
      }),
      prisma.HOCKY.findMany({
        where: { DaXoa: false },
        orderBy: [{ NgayBatDau: 'desc' }, { MaHocKy: 'desc' }],
        include: { NAMHOC: true }
      }),
      prisma.TIETHOC.findMany({
        where: { DaXoa: false, TrangThai: true },
        orderBy: [{ ThuTu: 'asc' }, { MaTiet: 'asc' }]
      }),
      prisma.GIANGVIEN.findMany({
        where: { DaXoa: false, TrangThai: true },
        orderBy: { MaGiangVien: 'asc' },
        include: { KHOA: true }
      }),
      prisma.PHONGHOC.findMany({
        where: { DaXoa: false, TrangThai: true },
        orderBy: { MaPhong: 'asc' }
      })
    ]);
    const displayClasses = (await attachUpdaterNames(classes)).map((cls) => {
      const openedForSemester = selectedSemester
        ? cls.LOPMO.find((item) => item.MaHocKy === selectedSemester)
        : null;
      const activeOpened = cls.LOPMO.find((item) => item.TrangThai !== false);
      const currentOpened = openedForSemester || activeOpened || cls.LOPMO[0] || null;
      const registeredCount = currentOpened ? Number(currentOpened.SoLuongDaDangKy || 0) : cls.CHITIETDANGKY.length;
      let statusLabel = 'Chưa mở';
      let statusClass = 'badge-secondary';
      if (currentOpened) {
        statusLabel = currentOpened.TrangThai === false ? 'Đã đóng' : 'Đang mở';
        statusClass = currentOpened.TrangThai === false ? 'badge-warning' : 'badge-success';
      }
      const roomSchedule = currentOpened
        ? (currentOpened.LICHHOCLOP || []).find((schedule) => schedule.TrangThai !== false && (schedule.PHONGHOC || schedule.MaPhong || schedule.PhongHoc))
        : null;
      const openedScheduleLabel = currentOpened ? classScheduleLabel(currentOpened) : '';
      const catalogRoomLabel = roomDisplayName(cls.PHONGHOC) || cls.PhongHoc || cls.MaPhong || '';
      const catalogSchedule = catalogScheduleLabel(cls);

      return {
        ...cls,
        GiangVienDisplay: currentOpened
          ? (lecturerDisplayName(currentOpened.GIANGVIEN) || currentOpened.GiangVien || '')
          : (lecturerDisplayName(cls.GIANGVIEN) || cls.GiangVien || ''),
        PhongHocDisplay: currentOpened
          ? (roomDisplayName(roomSchedule?.PHONGHOC) || roomSchedule?.PhongHoc || roomSchedule?.MaPhong || catalogRoomLabel)
          : catalogRoomLabel,
        LichHocDisplay: openedScheduleLabel && openedScheduleLabel !== '-' ? openedScheduleLabel : catalogSchedule,
        SoLuongDaDangKy: registeredCount,
        LopMoHienTaiId: currentOpened && currentOpened.TrangThai !== false ? currentOpened.id : null,
        MaHocKyDangMo: currentOpened ? currentOpened.MaHocKy : '',
        TenHocKyDangMo: currentOpened ? currentOpened.HOCKY?.TenHocKy : '',
        TrangThaiMoLabel: statusLabel,
        TrangThaiMoClass: statusClass
      };
    });

    renderAdmin(res, 'classes', 'classes', 'Quản lý lớp học', req, {
      classes: displayClasses,
      courseOptions: courses,
      semesterOptions: semesters.map((semester) => ({
        MaHocKy: semester.MaHocKy,
        TenHocKy: semester.TenHocKy,
        TenNamHoc: semester.NAMHOC?.TenNamHoc || ''
      })),
      periodOptions: periods.map((period) => ({
        MaTiet: period.MaTiet,
        TenTiet: period.TenTiet,
        ThuTu: period.ThuTu,
        GioBatDauText: formatTimeValue(period.GioBatDau),
        GioKetThucText: formatTimeValue(period.GioKetThuc)
      })),
      lecturerOptions: lecturers.map((lecturer) => ({
        MaGiangVien: lecturer.MaGiangVien,
        HoTen: lecturer.HoTen,
        HocHamHocVi: lecturer.HocHamHocVi,
        TenKhoa: lecturer.KHOA?.TenKhoa || ''
      })),
      roomOptions: rooms.map((room) => ({
        MaPhong: room.MaPhong,
        TenPhong: room.TenPhong,
        ToaNha: room.ToaNha,
        SucChua: room.SucChua,
        LoaiPhong: room.LoaiPhong
      })),
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/classes',
      queryParams: { search, searchScope, MaHocKy: selectedSemester, openStatus, limit },
      search,
      searchScope,
      selectedSemester,
      openStatus
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'classes', 'classes', 'Quản lý lớp học', req, {
      classes: [],
      courseOptions: [],
      semesterOptions: [],
      periodOptions: [],
      lecturerOptions: [],
      roomOptions: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/classes',
      queryParams: {},
      search: '',
      searchScope: 'classCode',
      selectedSemester: '',
      openStatus: ''
    });
  }
};

const adminRooms = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const type = req.query.type || '';
  const status = req.query.status || '';
  const where = { DaXoa: false };

  if (type) where.LoaiPhong = type;
  if (status === 'active') where.TrangThai = true;
  if (status === 'inactive') where.TrangThai = false;
  if (search) {
    where.OR = [
      { MaPhong: { contains: search, mode: 'insensitive' } },
      { TenPhong: { contains: search, mode: 'insensitive' } },
      { ToaNha: { contains: search, mode: 'insensitive' } },
      { LoaiPhong: { contains: search, mode: 'insensitive' } }
    ];
  }

  try {
    const [rooms, total] = await Promise.all([
      prisma.PHONGHOC.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { MaPhong: 'asc' },
        include: { _count: { select: { LOP: true, LICHHOCLOP: true } } }
      }),
      prisma.PHONGHOC.count({ where })
    ]);

    renderAdmin(res, 'rooms', 'rooms', 'Quản lý phòng học', req, {
      rooms: await attachUpdaterNames(rooms),
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/rooms',
      queryParams: { search, type, status, limit },
      search,
      type,
      status
    });
  } catch (err) {
    console.error('adminRooms error:', err);
    renderAdmin(res, 'rooms', 'rooms', 'Quản lý phòng học', req, {
      rooms: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/rooms',
      queryParams: {},
      search: '',
      type: '',
      status: ''
    });
  }
};

const adminLecturers = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const faculty = req.query.MaKhoa || '';
  const status = req.query.status || '';
  const where = { DaXoa: false };

  if (faculty) where.MaKhoa = faculty;
  if (status === 'active') where.TrangThai = true;
  if (status === 'inactive') where.TrangThai = false;
  if (search) {
    where.OR = [
      { MaGiangVien: { contains: search, mode: 'insensitive' } },
      { HoTen: { contains: search, mode: 'insensitive' } },
      { HocHamHocVi: { contains: search, mode: 'insensitive' } },
      { Email: { contains: search, mode: 'insensitive' } },
      { Sdt: { contains: search, mode: 'insensitive' } },
      { KHOA: { is: { TenKhoa: { contains: search, mode: 'insensitive' } } } }
    ];
  }

  try {
    const [lecturers, total, faculties] = await Promise.all([
      prisma.GIANGVIEN.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { MaGiangVien: 'asc' },
        include: {
          KHOA: true,
          _count: { select: { LOPMO: true } }
        }
      }),
      prisma.GIANGVIEN.count({ where }),
      prisma.KHOA.findMany({
        where: { DaXoa: false, TrangThai: true },
        orderBy: { MaKhoa: 'asc' },
        select: { MaKhoa: true, TenKhoa: true }
      })
    ]);

    renderAdmin(res, 'lecturers', 'lecturers', 'Quản lý giảng viên', req, {
      lecturers: await attachUpdaterNames(lecturers),
      facultyOptions: faculties,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/lecturers',
      queryParams: { search, MaKhoa: faculty, status, limit },
      search,
      selectedFaculty: faculty,
      status
    });
  } catch (err) {
    console.error('adminLecturers error:', err);
    renderAdmin(res, 'lecturers', 'lecturers', 'Quản lý giảng viên', req, {
      lecturers: [],
      facultyOptions: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/lecturers',
      queryParams: {},
      search: '',
      selectedFaculty: '',
      status: ''
    });
  }
};

const adminSemesters = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = String(req.query.search || '').trim();
  const dateSearchFields = new Set(['NgayBatDau', 'NgayKetThuc', 'NgayBatDauDangKy', 'NgayKetThucDangKy', 'HanDongHocPhi']);
  const validSearchFields = new Set(['all', 'MaHocKy', 'TenHocKy', 'MaNamHoc', 'HocKy', 'LoaiHocKy', 'TrangThai', ...dateSearchFields]);
  const searchField = validSearchFields.has(req.query.searchField) ? req.query.searchField : 'all';
  const containsSearch = (field) => ({ [field]: { contains: search, mode: 'insensitive' } });
  const normalizedSearch = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const getSemesterKindSearchClauses = () => {
    const clauses = [containsSearch('LoaiHocKy')];
    if (/\b(i|1)\b/.test(normalizedSearch)) clauses.push({ ThuTu: 1 });
    if (/\b(ii|2)\b/.test(normalizedSearch)) clauses.push({ ThuTu: 2 });
    if (/\b(he|3)\b/.test(normalizedSearch)) clauses.push({ ThuTu: 3 });
    return clauses;
  };
  const parseSearchDate = (value) => {
    const raw = String(value || '').trim();
    const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const vi = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!iso && !vi) return null;

    const year = Number(iso ? iso[1] : vi[3]);
    const month = Number(iso ? iso[2] : vi[2]);
    const day = Number(iso ? iso[3] : vi[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  };
  const searchDate = parseSearchDate(search);
  const containsDate = (field) => {
    const nextDay = new Date(searchDate.getTime());
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return { [field]: { gte: searchDate, lt: nextDay } };
  };
  const semesterSearchWhere = {};

  if (search) {
    if (searchField === 'all') {
      semesterSearchWhere.OR = [
        containsSearch('MaHocKy'),
        containsSearch('TenHocKy'),
        containsSearch('MaNamHoc'),
        containsSearch('LoaiHocKy'),
        containsSearch('TrangThai'),
        { NAMHOC: { TenNamHoc: { contains: search, mode: 'insensitive' } } }
      ];
      if (searchDate) {
        dateSearchFields.forEach((field) => semesterSearchWhere.OR.push(containsDate(field)));
      }
    } else if (searchField === 'MaNamHoc') {
      semesterSearchWhere.OR = [
        containsSearch('MaNamHoc'),
        { NAMHOC: { TenNamHoc: { contains: search, mode: 'insensitive' } } }
      ];
    } else if (searchField === 'HocKy' || searchField === 'LoaiHocKy') {
      semesterSearchWhere.OR = getSemesterKindSearchClauses();
    } else if (dateSearchFields.has(searchField)) {
      Object.assign(semesterSearchWhere, searchDate ? containsDate(searchField) : { MaHocKy: '__NO_DATE_MATCH__' });
    } else {
      Object.assign(semesterSearchWhere, containsSearch(searchField));
    }
  }

  const where = { DaXoa: false, ...semesterSearchWhere };

  try {
    const [semesters, total] = await Promise.all([
      prisma.HOCKY.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          NAMHOC: true,
          _count: {
            select: {
              LOPMO: true,
              PHIEUDANGKY: true
            }
          }
        },
        orderBy: { NgayBatDau: 'desc' }
      }),
      prisma.HOCKY.count({ where })
    ]);
    const semestersWithStats = semesters.map((semester) => ({
      ...semester,
      SoLopMo: semester._count?.LOPMO || 0,
      SoSinhVienDangKy: semester._count?.PHIEUDANGKY || 0
    }));
    const displaySemesters = await attachUpdaterNames(semestersWithStats);
    renderAdmin(res, 'semesters', 'semesters', 'Quản lý học kỳ', req, {
      semesters: displaySemesters,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      pageSize: limit,
      baseUrl: '/admin/semesters',
      queryParams: { search, searchField, limit },
      search,
      searchField
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'semesters', 'semesters', 'Quản lý học kỳ', req, {
      semesters: [],
      currentPage: 1,
      totalPages: 0,
      totalRecords: 0,
      pageSize: limit,
      baseUrl: '/admin/semesters',
      queryParams: {},
      search: '',
      searchField: 'all'
    });
  }
};

const adminAcademicYears = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const where = {};

  if (status === 'active') where.TrangThai = true;
  if (status === 'inactive') where.TrangThai = false;
  if (search) {
    where.OR = [
      { MaNamHoc: { contains: search, mode: 'insensitive' } },
      { TenNamHoc: { contains: search, mode: 'insensitive' } }
    ];
  }

  try {
    const [academicYears, total] = await Promise.all([
      prisma.NAMHOC.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              HOCKY: { where: { DaXoa: false } }
            }
          }
        },
        orderBy: [{ NamBatDau: 'desc' }, { MaNamHoc: 'desc' }]
      }),
      prisma.NAMHOC.count({ where })
    ]);

    renderAdmin(res, 'academic-years', 'academic-years', 'Quản lý năm học', req, {
      academicYears: academicYears.map((year) => ({
        ...year,
        SoHocKy: year._count?.HOCKY || 0
      })),
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/academic-years',
      queryParams: { search, status, limit },
      search,
      status
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'academic-years', 'academic-years', 'Quản lý năm học', req, {
      academicYears: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/academic-years',
      queryParams: {},
      search: '',
      status: ''
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
  const registrationSearchScope = normalizeRegistrationSearchScope(req.query.searchScope);
  const selectedSemester = req.query.MaHocKy || '';
  const where = {};

  if (status) where.TrangThai = status;
  if (selectedSemester) where.MaHocKy = selectedSemester;
  applyRegistrationSearch(where, registrationSearchScope, search);

  try {
    const registrations = await prisma.PHIEUDANGKY.findMany({
      where,
      orderBy: { NgayLap: 'desc' },
      include: {
        SINHVIEN: {
          include: {
            NGANHHOC: { include: { KHOA: true } }
          }
        },
        HOCKY: { include: { NAMHOC: true } },
        CHITIETDANGKY: {
          where: { TrangThai: 'Đã đăng ký' },
          select: { id: true, SoTinChi: true }
        }
      }
    });

    const grouped = buildRegistrationStudentRows(registrations);

    const total = grouped.length;
    const registrationStudents = grouped.slice((page - 1) * limit, page * limit);
    const registrationStatsByFaculty = buildRegistrationDistribution(grouped, 'faculty');
    const registrationStatsByMajor = buildRegistrationDistribution(grouped, 'major');

    renderAdmin(res, 'registrations', 'registrations', 'Quản lý đăng ký môn học', req, {
      registrations: registrationStudents,
      totalRegistrationStudents: total,
      registrationStatsByFaculty,
      registrationStatsByMajor,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/registrations',
      queryParams: { search, searchScope: registrationSearchScope, status, MaHocKy: selectedSemester, limit },
      search,
      status,
      registrationSearchScope,
      selectedSemester
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'registrations', 'registrations', 'Quản lý đăng ký môn học', req, {
      registrations: [],
      totalRegistrationStudents: 0,
      registrationStatsByFaculty: [],
      registrationStatsByMajor: [],
      currentPage: 1,
      totalPages: 0,
      baseUrl: '/admin/registrations',
      queryParams: {},
      search: '',
      status: '',
      registrationSearchScope: 'studentId',
      selectedSemester: ''
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
  const filterKhoa = req.query.MaKhoa || '';
  const filterLoaiMon = req.query.LoaiMon || '';
  const filterTinChi = req.query.SoTinChi || '';
  const where = { DaXoa: false };
  if (filterHocKy) where.MaHocKy = filterHocKy;
  if (filterResult) where.KetQua = filterResult;
  if (filterKhoa || filterLoaiMon || filterTinChi) where.MONHOC = { ...(filterKhoa ? { MaKhoa: filterKhoa } : {}), ...(filterLoaiMon ? { LoaiMon: filterLoaiMon } : {}), ...(filterTinChi ? { SoTinChi: parseInt(filterTinChi, 10) } : {}) };
  if (search) {
    where.OR = [
      { MaSv: { contains: search, mode: 'insensitive' } },
      { SINHVIEN: { HoTen: { contains: search, mode: 'insensitive' } } },
      { MaMonHoc: { contains: search, mode: 'insensitive' } },
      { MONHOC: { TenMonHoc: { contains: search, mode: 'insensitive' } } },
      { MONHOC: { KHOA: { TenKhoa: { contains: search, mode: 'insensitive' } } } },
      { MaLop: { contains: search, mode: 'insensitive' } },
      { LOP: { GiangVien: { contains: search, mode: 'insensitive' } } }
    ];
  }
  try {
    const [completedRows, semesters, faculties, courses, classes] = await Promise.all([
      prisma.MONDAHOC.findMany({
        where,
        orderBy: [{ NgayCapNhat: 'desc' }, { NgayTao: 'desc' }, { id: 'desc' }],
        include: {
          SINHVIEN: { select: { MaSv: true, HoTen: true } },
          MONHOC: { select: { MaMonHoc: true, TenMonHoc: true, SoTinChi: true, LoaiMon: true, KHOA: true } },
          LOP: { select: { MaLop: true, TenLop: true, GiangVien: true } },
          TAIKHOAN: { select: { HoTen: true, TenDangNhap: true } }
        }
      }),
      prisma.HOCKY.findMany({ where: { DaXoa: false }, orderBy: { NgayBatDau: 'desc' } }),
      prisma.KHOA.findMany({ where: { DaXoa: false }, orderBy: { TenKhoa: 'asc' }, select: { MaKhoa: true, TenKhoa: true } }),
      prisma.MONHOC.findMany({ where: { DaXoa: false }, orderBy: { MaMonHoc: 'asc' }, select: { MaMonHoc: true, TenMonHoc: true } }),
      prisma.LOP.findMany({ where: { DaXoa: false }, orderBy: { MaLop: 'asc' }, select: { MaLop: true, TenLop: true, MaMonHoc: true } })
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

    renderAdmin(res, 'completed-courses', 'completed-courses', 'Quản lý môn đã học', req, { completedStudents, semesters, faculties, courses, classes, currentPage: page, totalPages: Math.ceil(total / limit), baseUrl: '/admin/completed-courses', queryParams: { search, MaHocKy: filterHocKy, KetQua: filterResult, MaKhoa: filterKhoa, LoaiMon: filterLoaiMon, SoTinChi: filterTinChi, limit }, search, filterHocKy, filterResult, filterKhoa, filterLoaiMon, filterTinChi });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'completed-courses', 'completed-courses', 'Quản lý môn đã học', req, { completedStudents: [], semesters: [], faculties: [], courses: [], classes: [], currentPage: 1, totalPages: 0, baseUrl: '/admin/completed-courses', queryParams: {}, search: '', filterHocKy: '', filterResult: '', filterKhoa: '', filterLoaiMon: '', filterTinChi: '' });
  }
};

const adminPricing = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const filterLoaiMon = req.query.LoaiMon || '';
  const filterLoaiHoc = req.query.LoaiHoc || '';
  const filterHocKy = req.query.MaHocKy || '';
  const filterTrangThai = req.query.TrangThai || '';
  const pricingSearchScope = normalizePricingSearchScope(req.query.searchScope);
  const pricingSearch = String(req.query.search || '').trim();
  const where = { DaXoa: false };
  if (filterLoaiMon) where.LoaiMon = filterLoaiMon;
  if (filterLoaiHoc) where.LoaiHoc = filterLoaiHoc;
  if (filterHocKy === '__all__') where.MaHocKy = null;
  else if (filterHocKy) where.MaHocKy = filterHocKy;
  if (filterTrangThai === 'active') where.TrangThai = true;
  if (filterTrangThai === 'inactive') where.TrangThai = false;
  applyPricingSearch(where, pricingSearchScope, pricingSearch);
  try {
    const [pricing, total, semesters] = await Promise.all([
      prisma.DONGIATINCHI.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' }, include: { HOCKY: { include: { NAMHOC: true } } } }),
      prisma.DONGIATINCHI.count({ where }),
      prisma.HOCKY.findMany({ where: { DaXoa: false }, orderBy: { NgayBatDau: 'desc' }, include: { NAMHOC: true } })
    ]);
    const displayPricing = await attachUpdaterNames(pricing);
    renderAdmin(res, 'pricing', 'pricing', 'Đơn giá tín chỉ', req, {
      pricing: displayPricing,
      semesters,
      filterLoaiMon,
      filterLoaiHoc,
      filterHocKy,
      filterTrangThai,
      pricingSearchScope,
      pricingSearch,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      baseUrl: '/admin/pricing',
      queryParams: { searchScope: pricingSearchScope, search: pricingSearch, LoaiMon: filterLoaiMon, LoaiHoc: filterLoaiHoc, MaHocKy: filterHocKy, TrangThai: filterTrangThai, limit }
    });
  } catch (err) {
    console.error('Error:', err);
    renderAdmin(res, 'pricing', 'pricing', 'Đơn giá tín chỉ', req, {
      pricing: [],
      semesters: [],
      filterLoaiMon: '',
      filterLoaiHoc: '',
      filterHocKy: '',
      filterTrangThai: '',
      pricingSearchScope: 'loai_mon',
      pricingSearch: '',
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

const adminCurriculumPrograms = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = DEFAULT_PAGE_SIZE;
  const search = req.query.search || '';
  const major = req.query.major || '';
  const status = req.query.status || '';
  const where = {
    NGANHHOC: { DaXoa: false },
    MONHOC: { DaXoa: false }
  };

  if (major) where.MaNganh = major;
  if (status === 'active') where.TrangThai = true;
  if (status === 'inactive') where.TrangThai = false;
  if (search) {
    where.OR = [
      { MaNganh: { contains: search, mode: 'insensitive' } },
      { MaMonHoc: { contains: search, mode: 'insensitive' } },
      { NGANHHOC: { TenNganh: { contains: search, mode: 'insensitive' } } },
      { MONHOC: { TenMonHoc: { contains: search, mode: 'insensitive' } } }
    ];
  }

  try {
    const [rows, total, majors] = await Promise.all([
      prisma.CHUONGTRINHHOC.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ MaNganh: 'asc' }, { HocKyDuKien: 'asc' }, { MaMonHoc: 'asc' }],
        include: {
          NGANHHOC: { include: { KHOA: true } },
          MONHOC: { include: { KHOA: true } }
        }
      }),
      prisma.CHUONGTRINHHOC.count({ where }),
      prisma.NGANHHOC.findMany({
        where: { DaXoa: false },
        orderBy: { TenNganh: 'asc' },
        select: { MaNganh: true, TenNganh: true }
      })
    ]);

    renderAdmin(res, 'curriculum-programs', 'curriculum-programs', 'Quản lý chương trình học', req, {
      curriculumPrograms: rows.map((row) => ({
        ...row,
        TenNganh: row.NGANHHOC?.TenNganh || row.MaNganh,
        TenKhoa: row.NGANHHOC?.KHOA?.TenKhoa || '-',
        TenMonHoc: row.MONHOC?.TenMonHoc || row.MaMonHoc,
        SoTinChi: row.MONHOC?.SoTinChi || 0,
        LoaiMon: row.MONHOC?.LoaiMon || '-',
        BatBuocLabel: row.BatBuoc === false ? 'Tự chọn' : 'Bắt buộc',
        TrangThaiLabel: row.TrangThai === false ? 'Tạm ngưng' : 'Đang áp dụng',
        TrangThaiClass: row.TrangThai === false ? 'badge-secondary' : 'badge-success'
      })),
      majors,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      baseUrl: '/admin/curriculum-programs',
      queryParams: { search, major, status, limit },
      search,
      major,
      status
    });
  } catch (err) {
    console.error('adminCurriculumPrograms error:', err);
    renderAdmin(res, 'curriculum-programs', 'curriculum-programs', 'Quản lý chương trình học', req, {
      curriculumPrograms: [],
      majors: [],
      currentPage: 1,
      totalPages: 0,
      totalRecords: 0,
      baseUrl: '/admin/curriculum-programs',
      queryParams: {},
      search: '',
      major: '',
      status: ''
    });
  }
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
  adminRooms,
  adminLecturers,
  adminSemesters,
  adminAcademicYears,
  adminPeriods,
  adminPrerequisites,
  adminRegistrations,
  adminTuition,
  adminPayments,
  adminReports,
  adminUsers,
  adminFaculties,
  adminMajors,
  adminCurriculumPrograms,
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
