const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

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
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }

      const result = await pool.query(
        'SELECT 1 FROM vai_tro_quyen WHERE role = $1 AND ma_quyen = $2',
        [req.user.role, permission]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thực hiện hành động này'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi kiểm tra quyền'
      });
    }
  };
};

module.exports = { 
  authMiddleware, 
  adminMiddleware,
  requirePermission,
  authenticateToken: authMiddleware,
  isAdmin: adminMiddleware,
  authorizeAdmin: adminMiddleware
};
