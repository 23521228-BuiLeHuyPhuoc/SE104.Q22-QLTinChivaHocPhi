const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

const normalizeRoleText = (value) => String(value || '').toLowerCase();

const isSystemAdminUser = (user) => {
  if (!user || user.Role !== 'admin') return false;
  const maNhom = normalizeRoleText(user.MaNhom || user.maNhom);
  if (['admin', 'admin_he_thong', 'system_admin'].includes(maNhom)) return true;
  const chucVu = normalizeRoleText(user.ChucVu || user.chucVu);
  return !chucVu ||
    chucVu === 'admin' ||
    chucVu.includes('hệ thống') ||
    chucVu.includes('he thong') ||
    chucVu.includes('system');
};

const getTokenUser = async (decoded) => {
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
      SINHVIEN_SINHVIEN_MaTaiKhoanToTAIKHOAN: {
        select: { MaSv: true, AnhDaiDien: true }
      },
      QUANTRIVIEN: {
        select: {
          HoTen: true,
          ChucVu: true,
          AnhDaiDien: true
        }
      }
    }
  });

  if (!account || account.TrangThai === false || account.TrangThaiDuyet !== 'approved') {
    return null;
  }

  return {
    ...decoded,
    id: account.MaTaiKhoan,
    MaTaiKhoan: account.MaTaiKhoan,
    username: account.TenDangNhap,
    Role: account.Role,
    role: account.Role,
    MaNhom: account.MaNhom,
    MaSv: account.MaSv || account.SINHVIEN_SINHVIEN_MaTaiKhoanToTAIKHOAN?.MaSv || decoded.MaSv,
    HoTen: account.QUANTRIVIEN?.HoTen || account.HoTen || decoded.HoTen,
    ChucVu: account.QUANTRIVIEN?.ChucVu || decoded.ChucVu,
    AnhDaiDien: account.QUANTRIVIEN?.AnhDaiDien || account.SINHVIEN_SINHVIEN_MaTaiKhoanToTAIKHOAN?.AnhDaiDien || account.AnhDaiDien || decoded.AnhDaiDien
  };
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không có token xác thực'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getTokenUser(decoded);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không còn hiệu lực'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && (req.user.Role === 'admin' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập. Chỉ admin mới được phép.'
    });
  }
};

const systemAdminMiddleware = (req, res, next) => {
  if (isSystemAdminUser(req.user)) return next();
  return res.status(403).json({
    success: false,
    message: 'Chỉ admin hệ thống mới được phép thực hiện thao tác này'
  });
};

const getAdminRole = (chucVu) => {
  const lower = normalizeRoleText(chucVu);
  if (lower.includes('đào tạo') || lower.includes('dao tao') || lower.includes('training')) return 'training';
  if (lower.includes('tài chính') || lower.includes('tai chinh') || lower.includes('finance')) return 'finance';
  return 'system';
};

const ROLE_PERMISSIONS = {
  system: ['*'],
  training: [
    '/admin/dashboard', '/admin/students', '/admin/courses',
    '/admin/classes', '/admin/semesters', '/admin/registrations',
    '/admin/academic-years',
    '/admin/faculties', '/admin/majors', '/admin/completed-courses',
    '/admin/periods', '/admin/prerequisites', '/admin/profile',
    '/api/students', '/api/courses', '/api/classes',
    '/api/semesters', '/api/registrations',
    '/api/faculties', '/api/majors', '/api/completed-courses',
    '/api/periods', '/api/prerequisites', '/api/auth/me', '/api/auth/avatar'
  ],
  finance: [
    '/admin/dashboard', '/admin/tuition', '/admin/payments',
    '/admin/reports', '/admin/pricing', '/admin/beneficiaries',
    '/api/tuition', '/api/payments',
    '/api/pricing', '/api/beneficiaries'
  ]
};

const ADMIN_PERMISSIONS = {
  'Quản trị viên hệ thống': ['*'],
  'Admin hệ thống': ['*'],
  'Quản trị viên đào tạo': ROLE_PERMISSIONS.training,
  'Quản trị viên tài chính': ROLE_PERMISSIONS.finance
};

const checkAdminPermission = (req, res, next) => {
  const chucVu = req.user?.ChucVu || '';
  const role = getAdminRole(chucVu);
  const allowed = ROLE_PERMISSIONS[role] || [];

  if (allowed.includes('*')) return next();

  const currentPath = req.originalUrl || req.path;
  const isAllowed = allowed.some(route => currentPath.startsWith(route));
  if (isAllowed) return next();

  if (currentPath.startsWith('/api/')) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện thao tác này'
    });
  }

  return res.redirect('/admin/dashboard');
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  systemAdminMiddleware,
  checkAdminPermission,
  isSystemAdminUser,
  authenticateToken: authMiddleware,
  isAdmin: adminMiddleware,
  authorizeAdmin: adminMiddleware,
  ADMIN_PERMISSIONS
};
