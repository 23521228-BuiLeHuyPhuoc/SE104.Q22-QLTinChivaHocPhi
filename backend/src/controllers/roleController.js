// Phân quyền đơn giản: admin và sinh_vien
// Admin: truy cập toàn bộ chức năng quản trị, có thể thay đổi Role người dùng
// Sinh viên: chỉ truy cập phần dành cho sinh viên

const pool = require('../config/database');

const ROLES = [
  {
    Role: 'admin',
    ten_vai_tro: 'Quản trị viên',
    MoTa: 'Toàn quyền truy cập và chỉnh sửa hệ thống quản lý'
  },
  {
    Role: 'sinh_vien',
    ten_vai_tro: 'Sinh viên',
    MoTa: 'Xem thông tin cá nhân, đăng ký môn học, xem học phí'
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
  const Role = req.user.Role;
  const found = ROLES.find(r => r.Role === Role);

  res.json({
    success: true,
    data: {
      Role,
      ten_vai_tro: found ? found.ten_vai_tro : Role,
      isAdmin: Role === 'admin'
    }
  });
};

// Lấy danh sách tất cả tài khoản (admin only)
const getAllAccounts = async (req, res) => {
  try {
    const { search, Role: filterRole, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(tk."TenDangNhap" ILIKE ${paramIndex} OR sv."HoTen" ILIKE ${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (filterRole && VALID_ROLES.includes(filterRole)) {
      whereConditions.push(`tk."Role" = ${paramIndex}`);
      params.push(filterRole);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM "TAIKHOAN" tk LEFT JOIN "SINHVIEN" sv ON tk."MaTaiKhoan" = sv."MaTaiKhoan" ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get accounts
    const result = await pool.query(
      `SELECT tk."MaTaiKhoan", tk."TenDangNhap", tk."Role", tk."NgayTao",
              sv."HoTen", sv."MaSv", sv."Email"
       FROM "TAIKHOAN" tk
       LEFT JOIN "SINHVIEN" sv ON tk."MaTaiKhoan" = sv."MaTaiKhoan"
       ${whereClause}
       ORDER BY tk."NgayTao" DESC
       LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`,
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

// Cập nhật Role của tài khoản (admin only)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { Role } = req.body;
    const currentUserId = req.user.id || req.user.MaTaiKhoan;

    if (!Role || !VALID_ROLES.includes(Role)) {
      return res.status(400).json({
        success: false,
        message: 'Role không hợp lệ. Chỉ chấp nhận: admin, sinh_vien'
      });
    }

    // Không cho phép tự đổi Role chính mình
    if (parseInt(id) === parseInt(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể thay đổi Role của chính mình'
      });
    }

    // Kiểm tra tài khoản tồn tại
    const checkResult = await pool.query(
      'SELECT "MaTaiKhoan", "TenDangNhap", "Role" FROM "TAIKHOAN" WHERE "MaTaiKhoan" = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản'
      });
    }

    const oldRole = checkResult.rows[0].Role;

    if (oldRole === Role) {
      return res.status(400).json({
        success: false,
        message: `Tài khoản đã có "Role" ${"Role"}`
      });
    }

    // Cập nhật Role
    await pool.query(
      'UPDATE "TAIKHOAN" SET "Role" = $1 WHERE "MaTaiKhoan" = $2',
      [Role, id]
    );

    res.json({
      success: true,
      message: `Đã thay đổi "Role" từ "${oldRole}" thành "${"Role"}"`,
      data: {
        MaTaiKhoan: parseInt(id),
        TenDangNhap: checkResult.rows[0].TenDangNhap,
        old_role: oldRole,
        new_role: Role
      }
    });
  } catch (error) {
    console.error('Update user "Role" error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  getAllRoles,
  getMyRole,
  getAllAccounts,
  updateUserRole
};
