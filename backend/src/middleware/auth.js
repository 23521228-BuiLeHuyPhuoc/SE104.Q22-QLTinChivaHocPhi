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

module.exports = { 
  authMiddleware, 
  adminMiddleware,
  authenticateToken: authMiddleware,
  isAdmin: adminMiddleware,
  authorizeAdmin: adminMiddleware
};
