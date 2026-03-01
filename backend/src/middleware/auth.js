const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

// Định nghĩa quyền cho từng vai trò (phân quyền bằng phần mềm)
const ROLE_PERMISSIONS = {
  admin: [
    'STUDENT_VIEW', 'STUDENT_CREATE', 'STUDENT_EDIT', 'STUDENT_DELETE',
    'COURSE_VIEW', 'COURSE_CREATE', 'COURSE_EDIT', 'COURSE_DELETE',
    'CLASS_VIEW', 'CLASS_CREATE', 'CLASS_EDIT', 'CLASS_DELETE',
    'REGISTRATION_VIEW', 'REGISTRATION_CREATE', 'REGISTRATION_CANCEL',
    'TUITION_VIEW', 'TUITION_CALCULATE',
    'PAYMENT_VIEW', 'PAYMENT_CREATE', 'PAYMENT_CANCEL',
    'SEMESTER_VIEW', 'SEMESTER_CREATE', 'SEMESTER_EDIT', 'SEMESTER_DELETE',
    'REPORT_VIEW',
    'NOTIFICATION_VIEW', 'NOTIFICATION_CREATE', 'NOTIFICATION_DELETE',
    'ROLE_VIEW'
  ],
  sinh_vien: [
    'COURSE_VIEW',
    'CLASS_VIEW',
    'REGISTRATION_VIEW', 'REGISTRATION_CREATE', 'REGISTRATION_CANCEL',
    'TUITION_VIEW',
    'PAYMENT_VIEW',
    'SEMESTER_VIEW',
    'NOTIFICATION_VIEW'
  ]
};

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
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Không có quyền truy cập' 
    });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }

    const permissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này'
      });
    }

    next();
  };
};

module.exports = { 
  authMiddleware, 
  adminMiddleware,
  requirePermission,
  ROLE_PERMISSIONS,
  authenticateToken: authMiddleware,
  isAdmin: adminMiddleware,
  authorizeAdmin: adminMiddleware
};
