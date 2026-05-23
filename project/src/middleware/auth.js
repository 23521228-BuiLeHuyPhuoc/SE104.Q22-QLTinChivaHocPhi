const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

// Phân quyền đơn giản: chỉ có 2 vai trò admin và sinh_vien
// - admin: được truy cập tất cả trang admin, chỉnh sửa dữ liệu
// - sinh_vien: chỉ truy cập trang sinh viên, không vào được admin

const authMiddleware = (req, res, next) => {
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
    
    req.user = decoded;
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

// Phân quyền admin theo chức vụ (3 loại)
const ADMIN_PERMISSIONS = {
  'Quản trị viên hệ thống': ['*'], // Full access - cao nhất
  'Quản trị viên đào tạo': [
    '/admin/dashboard', '/admin/students', '/admin/courses',
    '/admin/classes', '/admin/semesters', '/admin/registrations',
    '/api/students', '/api/courses', '/api/classes',
    '/api/semesters', '/api/registrations'
  ],
  'Quản trị viên tài chính': [
    '/admin/dashboard', '/admin/tuition', '/admin/payments',
    '/admin/reports',
    '/api/tuition', '/api/payments'
  ]
};

const checkAdminPermission = (req, res, next) => {
  const chucVu = req.user?.ChucVu || 'Quản trị viên hệ thống';
  const allowed = ADMIN_PERMISSIONS[chucVu] || [];
  
  // Full access
  if (allowed.includes('*')) return next();
  
  // Check if current path matches any allowed route
  const currentPath = req.originalUrl || req.path;
  const isAllowed = allowed.some(route => currentPath.startsWith(route));
  
  if (isAllowed) return next();
  
  // Check if it's an API request
  if (currentPath.startsWith('/api/')) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện thao tác này'
    });
  }
  
  // Redirect to dashboard for page requests
  return res.redirect('/admin/dashboard');
};

module.exports = { 
  authMiddleware, 
  adminMiddleware,
  checkAdminPermission,
  authenticateToken: authMiddleware,
  isAdmin: adminMiddleware,
  authorizeAdmin: adminMiddleware,
  ADMIN_PERMISSIONS
};
