// Phân quyền đơn giản: admin và sinh_vien
// Admin: truy cập toàn bộ chức năng quản trị, có thể thay đổi role người dùng
// Sinh viên: chỉ truy cập phần dành cho sinh viên

const pool = require('../config/database');

const ROLES = [
  {
    role: 'admin',
    ten_vai_tro: 'Quản trị viên',
    mo_ta: 'Toàn quyền truy cập và chỉnh sửa hệ thống quản lý'
  },
  {
    role: 'sinh_vien',
    ten_vai_tro: 'Sinh viên',
    mo_ta: 'Xem thông tin cá nhân, đăng ký môn học, xem học phí'
  }
];

const VALID_ROLES = ['admin', 'sinh_vien'];

// Lấy danh sách vai trò
const getAllRoles = (req, res) => {
  res.json({
    success: true,
    data: ROLES
  });
};

// Lấy vai trò hiện tại của user
const getMyRole = (req, res) => {
  const role = req.user.role;
  const found = ROLES.find(r => r.role === role);

  res.json({
    success: true,
    data: {
      role,
      ten_vai_tro: found ? found.ten_vai_tro : role,
      isAdmin: role === 'admin'
    }
  });
};

// Lấy danh sách tất cả tài khoản (admin only)
const getAllAccounts = async (req, res) => {
  try {
    const { search, role: filterRole, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(tk.ten_dang_nhap ILIKE $${paramIndex} OR sv.ho_ten ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (filterRole && VALID_ROLES.includes(filterRole)) {
      whereConditions.push(`tk.role = $${paramIndex}`);
      params.push(filterRole);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tai_khoan tk LEFT JOIN sinh_vien sv ON tk.ma_tai_khoan = sv.ma_tai_khoan ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get accounts
    const result = await pool.query(
      `SELECT tk.ma_tai_khoan, tk.ten_dang_nhap, tk.role, tk.ngay_tao,
              sv.ho_ten, sv.ma_sv, sv.email
       FROM tai_khoan tk
       LEFT JOIN sinh_vien sv ON tk.ma_tai_khoan = sv.ma_tai_khoan
       ${whereClause}
       ORDER BY tk.ngay_tao DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all accounts error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Cập nhật role của tài khoản (admin only)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id || req.user.ma_tai_khoan;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role không hợp lệ. Chỉ chấp nhận: admin, sinh_vien'
      });
    }

    // Không cho phép tự đổi role chính mình
    if (parseInt(id) === parseInt(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể thay đổi role của chính mình'
      });
    }

    // Kiểm tra tài khoản tồn tại
    const checkResult = await pool.query(
      'SELECT ma_tai_khoan, ten_dang_nhap, role FROM tai_khoan WHERE ma_tai_khoan = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản'
      });
    }

    const oldRole = checkResult.rows[0].role;

    if (oldRole === role) {
      return res.status(400).json({
        success: false,
        message: `Tài khoản đã có role ${role}`
      });
    }

    // Cập nhật role
    await pool.query(
      'UPDATE tai_khoan SET role = $1 WHERE ma_tai_khoan = $2',
      [role, id]
    );

    res.json({
      success: true,
      message: `Đã thay đổi role từ "${oldRole}" thành "${role}"`,
      data: {
        ma_tai_khoan: parseInt(id),
        ten_dang_nhap: checkResult.rows[0].ten_dang_nhap,
        old_role: oldRole,
        new_role: role
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  getAllRoles,
  getMyRole,
  getAllAccounts,
  updateUserRole
};
