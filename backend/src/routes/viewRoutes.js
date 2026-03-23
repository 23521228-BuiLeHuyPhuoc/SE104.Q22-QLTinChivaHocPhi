const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ==========================================
// Middleware: Check token from cookie
// ==========================================
function getTokenFromCookie(req) {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

async function getUserFromToken(token) {
  if (!token) return null;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (e) {
    return null;
  }
}

// Middleware: require auth for view routes
async function requireViewAuth(req, res, next) {
  const token = getTokenFromCookie(req);
  const user = await getUserFromToken(token);
  if (!user) {
    return res.redirect('/login');
  }
  req.user = user;
  next();
}

// Middleware: require admin
function requireViewAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  next();
}

// Middleware: require student
function requireViewStudent(req, res, next) {
  if (!req.user || req.user.role !== 'sinh_vien') {
    return res.redirect('/login');
  }
  next();
}

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Root -> redirect based on auth
router.get('/', async (req, res) => {
  const token = getTokenFromCookie(req);
  const user = await getUserFromToken(token);
  if (user) {
    if (user.role === 'admin') return res.redirect('/admin/dashboard');
    return res.redirect('/student/dashboard');
  }
  res.redirect('/login');
});

// Login page
router.get('/login', (req, res) => {
  res.render('pages/login', { pageTitle: 'Đăng nhập' });
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// ==========================================
// ADMIN ROUTES
// ==========================================

router.get('/admin/dashboard', requireViewAuth, requireViewAdmin, (req, res) => {
  res.render('pages/admin/dashboard', {
    pageTitle: 'Admin Dashboard',
    currentPage: 'dashboard',
    headerTitle: 'Dashboard',
    user: req.user
  });
});

router.get('/admin/students', requireViewAuth, requireViewAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let query = `SELECT sv.*, nh.ten_nganh, k.ten_khoa
                 FROM sinh_vien sv
                 LEFT JOIN nganh_hoc nh ON sv.ma_nganh = nh.ma_nganh
                 LEFT JOIN khoa k ON nh.ma_khoa = k.ma_khoa
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM sinh_vien sv WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      query += ` AND (sv.ma_sv ILIKE $${params.length} OR sv.ho_ten ILIKE $${params.length})`;
      countQuery += ` AND (sv.ma_sv ILIKE $${countParams.length} OR sv.ho_ten ILIKE $${countParams.length})`;
    }
    if (status) {
      params.push(status);
      countParams.push(status);
      query += ` AND sv.trang_thai = $${params.length}`;
      countQuery += ` AND sv.trang_thai = $${countParams.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY sv.ma_sv LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    res.render('pages/admin/students', {
      pageTitle: 'Quản lý Sinh viên',
      currentPage: 'students',
      headerTitle: 'Quản lý Sinh viên',
      user: req.user,
      students: result.rows,
      currentPage: page,
      totalPages: totalPages,
      baseUrl: '/admin/students',
      queryParams: { search, status, limit },
      search,
      status
    });
  } catch (err) {
    console.error('Error loading students:', err);
    res.render('pages/admin/students', {
      pageTitle: 'Quản lý Sinh viên',
      currentPage: 'students',
      headerTitle: 'Quản lý Sinh viên',
      user: req.user,
      students: [],
      totalPages: 0,
      search: '',
      status: ''
    });
  }
});

router.get('/admin/courses', requireViewAuth, requireViewAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `SELECT mh.*, k.ten_khoa
                 FROM mon_hoc mh
                 LEFT JOIN khoa k ON mh.ma_khoa = k.ma_khoa
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM mon_hoc mh WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      query += ` AND (mh.ma_mon_hoc ILIKE $${params.length} OR mh.ten_mon_hoc ILIKE $${params.length})`;
      countQuery += ` AND (mh.ma_mon_hoc ILIKE $${countParams.length} OR mh.ten_mon_hoc ILIKE $${countParams.length})`;
    }

    params.push(limit, offset);
    query += ` ORDER BY mh.ma_mon_hoc LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    res.render('pages/admin/courses', {
      pageTitle: 'Quản lý Môn học',
      currentPage: 'courses',
      headerTitle: 'Quản lý Môn học',
      user: req.user,
      courses: result.rows,
      currentPage: page,
      totalPages,
      baseUrl: '/admin/courses',
      queryParams: { search, limit },
      search
    });
  } catch (err) {
    console.error('Error loading courses:', err);
    res.render('pages/admin/courses', {
      pageTitle: 'Quản lý Môn học',
      currentPage: 'courses',
      headerTitle: 'Quản lý Môn học',
      user: req.user,
      courses: [],
      totalPages: 0,
      search: ''
    });
  }
});

router.get('/admin/classes', requireViewAuth, requireViewAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `SELECT l.*, mh.ten_mon_hoc
                 FROM lop l
                 LEFT JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM lop l WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      query += ` AND (l.ma_lop ILIKE $${params.length} OR l.ten_lop ILIKE $${params.length})`;
      countQuery += ` AND (l.ma_lop ILIKE $${countParams.length} OR l.ten_lop ILIKE $${countParams.length})`;
    }

    params.push(limit, offset);
    query += ` ORDER BY l.ma_lop LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    res.render('pages/admin/classes', {
      pageTitle: 'Quản lý Lớp học',
      currentPage: 'classes',
      headerTitle: 'Quản lý Lớp học',
      user: req.user,
      classes: result.rows,
      currentPage: page,
      totalPages,
      baseUrl: '/admin/classes',
      queryParams: { search, limit },
      search
    });
  } catch (err) {
    console.error('Error loading classes:', err);
    res.render('pages/admin/classes', {
      pageTitle: 'Quản lý Lớp học',
      currentPage: 'classes',
      headerTitle: 'Quản lý Lớp học',
      user: req.user,
      classes: [],
      totalPages: 0,
      search: ''
    });
  }
});

router.get('/admin/semesters', requireViewAuth, requireViewAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hk.*, nh.ten_nam_hoc
      FROM hoc_ky hk
      LEFT JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
      ORDER BY hk.ngay_bat_dau DESC
    `);

    res.render('pages/admin/semesters', {
      pageTitle: 'Quản lý Học kỳ',
      currentPage: 'semesters',
      headerTitle: 'Quản lý Học kỳ',
      user: req.user,
      semesters: result.rows
    });
  } catch (err) {
    console.error('Error loading semesters:', err);
    res.render('pages/admin/semesters', {
      pageTitle: 'Quản lý Học kỳ',
      currentPage: 'semesters',
      headerTitle: 'Quản lý Học kỳ',
      user: req.user,
      semesters: []
    });
  }
});

router.get('/admin/registrations', requireViewAuth, requireViewAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let query = `SELECT ctdk.*, sv.ma_sv, sv.ho_ten AS ho_ten_sv, mh.ten_mon_hoc, lm.ma_lop,
                        pdk.ngay_dang_ky
                 FROM chi_tiet_dang_ky ctdk
                 LEFT JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
                 LEFT JOIN sinh_vien sv ON pdk.ma_sv = sv.ma_sv
                 LEFT JOIN lop_mo lm ON ctdk.ma_lop_mo = lm.ma_lop_mo
                 LEFT JOIN lop l ON lm.ma_lop = l.ma_lop
                 LEFT JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM chi_tiet_dang_ky ctdk
                      LEFT JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
                      LEFT JOIN sinh_vien sv ON pdk.ma_sv = sv.ma_sv
                      WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      query += ` AND (sv.ma_sv ILIKE $${params.length} OR sv.ho_ten ILIKE $${params.length})`;
      countQuery += ` AND (sv.ma_sv ILIKE $${countParams.length} OR sv.ho_ten ILIKE $${countParams.length})`;
    }
    if (status) {
      params.push(status);
      countParams.push(status);
      query += ` AND ctdk.trang_thai = $${params.length}`;
      countQuery += ` AND ctdk.trang_thai = $${countParams.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY pdk.ngay_dang_ky DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    res.render('pages/admin/registrations', {
      pageTitle: 'Quản lý Đăng ký',
      currentPage: 'registrations',
      headerTitle: 'Quản lý Đăng ký',
      user: req.user,
      registrations: result.rows,
      currentPage: page,
      totalPages,
      baseUrl: '/admin/registrations',
      queryParams: { search, status, limit },
      search,
      status
    });
  } catch (err) {
    console.error('Error loading registrations:', err);
    res.render('pages/admin/registrations', {
      pageTitle: 'Quản lý Đăng ký',
      currentPage: 'registrations',
      headerTitle: 'Quản lý Đăng ký',
      user: req.user,
      registrations: [],
      totalPages: 0,
      search: '',
      status: ''
    });
  }
});

router.get('/admin/tuition', requireViewAuth, requireViewAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let query = `SELECT pthp.*, sv.ma_sv, sv.ho_ten AS ho_ten_sv, hk.ten_hoc_ky
                 FROM phieu_thu_hoc_phi pthp
                 LEFT JOIN sinh_vien sv ON pthp.ma_sv = sv.ma_sv
                 LEFT JOIN hoc_ky hk ON pthp.ma_hoc_ky = hk.ma_hoc_ky
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM phieu_thu_hoc_phi pthp
                      LEFT JOIN sinh_vien sv ON pthp.ma_sv = sv.ma_sv WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      query += ` AND (sv.ma_sv ILIKE $${params.length} OR sv.ho_ten ILIKE $${params.length})`;
      countQuery += ` AND (sv.ma_sv ILIKE $${countParams.length} OR sv.ho_ten ILIKE $${countParams.length})`;
    }
    if (status) {
      params.push(status);
      countParams.push(status);
      query += ` AND pthp.trang_thai = $${params.length}`;
      countQuery += ` AND pthp.trang_thai = $${countParams.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY pthp.ngay_tao DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    res.render('pages/admin/tuition', {
      pageTitle: 'Quản lý Học phí',
      currentPage: 'tuition',
      headerTitle: 'Quản lý Học phí',
      user: req.user,
      tuitions: result.rows,
      currentPage: page,
      totalPages,
      baseUrl: '/admin/tuition',
      queryParams: { search, status, limit },
      search,
      status
    });
  } catch (err) {
    console.error('Error loading tuition:', err);
    res.render('pages/admin/tuition', {
      pageTitle: 'Quản lý Học phí',
      currentPage: 'tuition',
      headerTitle: 'Quản lý Học phí',
      user: req.user,
      tuitions: [],
      totalPages: 0,
      search: '',
      status: ''
    });
  }
});

router.get('/admin/payments', requireViewAuth, requireViewAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `SELECT pthp.*, sv.ma_sv, sv.ho_ten AS ho_ten_sv
                 FROM phieu_thu_hoc_phi pthp
                 LEFT JOIN sinh_vien sv ON pthp.ma_sv = sv.ma_sv
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM phieu_thu_hoc_phi pthp
                      LEFT JOIN sinh_vien sv ON pthp.ma_sv = sv.ma_sv WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      query += ` AND (sv.ma_sv ILIKE $${params.length} OR sv.ho_ten ILIKE $${params.length})`;
      countQuery += ` AND (sv.ma_sv ILIKE $${countParams.length} OR sv.ho_ten ILIKE $${countParams.length})`;
    }

    params.push(limit, offset);
    query += ` ORDER BY pthp.ngay_tao DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    res.render('pages/admin/payments', {
      pageTitle: 'Thu Học phí',
      currentPage: 'payments',
      headerTitle: 'Thu Học phí',
      user: req.user,
      payments: result.rows,
      currentPage: page,
      totalPages,
      baseUrl: '/admin/payments',
      queryParams: { search, limit },
      search
    });
  } catch (err) {
    console.error('Error loading payments:', err);
    res.render('pages/admin/payments', {
      pageTitle: 'Thu Học phí',
      currentPage: 'payments',
      headerTitle: 'Thu Học phí',
      user: req.user,
      payments: [],
      totalPages: 0,
      search: ''
    });
  }
});

router.get('/admin/reports', requireViewAuth, requireViewAdmin, (req, res) => {
  res.render('pages/admin/reports', {
    pageTitle: 'Báo cáo Thống kê',
    currentPage: 'reports',
    headerTitle: 'Báo cáo Thống kê',
    user: req.user
  });
});

router.get('/admin/users', requireViewAuth, requireViewAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const filterRole = req.query.role || '';
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(tk.ten_dang_nhap ILIKE $${paramIndex} OR sv.ho_ten ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (filterRole && ['admin', 'sinh_vien'].includes(filterRole)) {
      whereConditions.push(`tk.role = $${paramIndex}`);
      params.push(filterRole);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tai_khoan tk LEFT JOIN sinh_vien sv ON tk.ma_tai_khoan = sv.ma_tai_khoan ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query(
      `SELECT tk.ma_tai_khoan, tk.ten_dang_nhap, tk.role, tk.ngay_tao,
              sv.ho_ten, sv.ma_sv, sv.email
       FROM tai_khoan tk
       LEFT JOIN sinh_vien sv ON tk.ma_tai_khoan = sv.ma_tai_khoan
       ${whereClause}
       ORDER BY tk.ngay_tao DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.render('pages/admin/users', {
      pageTitle: 'Quản lý Tài khoản',
      currentPage: 'users',
      headerTitle: 'Quản lý Tài khoản',
      user: req.user,
      accounts: result.rows,
      currentUserId: req.user.id || req.user.ma_tai_khoan,
      currentPage: page,
      totalPages,
      baseUrl: '/admin/users',
      queryParams: { search, role: filterRole, limit },
      search,
      filterRole
    });
  } catch (err) {
    console.error('Error loading users:', err);
    res.render('pages/admin/users', {
      pageTitle: 'Quản lý Tài khoản',
      currentPage: 'users',
      headerTitle: 'Quản lý Tài khoản',
      user: req.user,
      accounts: [],
      currentUserId: req.user.id || req.user.ma_tai_khoan,
      totalPages: 0,
      search: '',
      filterRole: ''
    });
  }
});

// ==========================================
// STUDENT ROUTES
// ==========================================

router.get('/student/dashboard', requireViewAuth, requireViewStudent, (req, res) => {
  res.render('pages/student/dashboard', {
    pageTitle: 'Dashboard Sinh viên',
    currentPage: 'dashboard',
    headerTitle: 'Dashboard',
    user: req.user
  });
});

router.get('/student/course-registration', requireViewAuth, requireViewStudent, (req, res) => {
  res.render('pages/student/course-registration', {
    pageTitle: 'Đăng ký Môn học',
    currentPage: 'course-registration',
    headerTitle: 'Đăng ký Môn học',
    user: req.user
  });
});

router.get('/student/my-courses', requireViewAuth, requireViewStudent, (req, res) => {
  res.render('pages/student/my-courses', {
    pageTitle: 'Môn học đã ĐK',
    currentPage: 'my-courses',
    headerTitle: 'Môn học đã Đăng ký',
    user: req.user
  });
});

router.get('/student/my-tuition', requireViewAuth, requireViewStudent, (req, res) => {
  res.render('pages/student/my-tuition', {
    pageTitle: 'Học phí',
    currentPage: 'my-tuition',
    headerTitle: 'Học phí',
    user: req.user
  });
});

router.get('/student/my-payments', requireViewAuth, requireViewStudent, (req, res) => {
  res.render('pages/student/my-payments', {
    pageTitle: 'Lịch sử Thanh toán',
    currentPage: 'my-payments',
    headerTitle: 'Lịch sử Thanh toán',
    user: req.user
  });
});

router.get('/student/my-schedule', requireViewAuth, requireViewStudent, (req, res) => {
  res.render('pages/student/my-schedule', {
    pageTitle: 'Thời khóa biểu',
    currentPage: 'my-schedule',
    headerTitle: 'Thời khóa biểu',
    user: req.user
  });
});

router.get('/student/profile', requireViewAuth, requireViewStudent, (req, res) => {
  res.render('pages/student/profile', {
    pageTitle: 'Hồ sơ Sinh viên',
    currentPage: 'profile',
    headerTitle: 'Hồ sơ cá nhân',
    user: req.user
  });
});

router.get('/student/notifications', requireViewAuth, requireViewStudent, (req, res) => {
  res.render('pages/student/notifications', {
    pageTitle: 'Thông báo',
    currentPage: 'notifications',
    headerTitle: 'Thông báo',
    user: req.user
  });
});

module.exports = router;
