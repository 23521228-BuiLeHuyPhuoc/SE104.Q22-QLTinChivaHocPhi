const pool = require('../config/database');

// Lấy tất cả quyền
const getAllPermissions = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quyen ORDER BY nhom_quyen, ma_quyen'
    );

    // Nhóm theo nhom_quyen
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.nhom_quyen]) {
        grouped[row.nhom_quyen] = [];
      }
      grouped[row.nhom_quyen].push(row);
    });

    res.json({
      success: true,
      data: result.rows,
      grouped
    });
  } catch (error) {
    console.error('Get all permissions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Lấy tất cả vai trò và quyền
const getAllRoles = async (req, res) => {
  try {
    const roles = ['admin', 'sinh_vien'];
    const rolesData = [];

    for (const role of roles) {
      const permResult = await pool.query(
        `SELECT q.* FROM quyen q
         INNER JOIN vai_tro_quyen vtq ON q.ma_quyen = vtq.ma_quyen
         WHERE vtq.role = $1
         ORDER BY q.nhom_quyen, q.ma_quyen`,
        [role]
      );
      rolesData.push({
        role,
        ten_vai_tro: role === 'admin' ? 'Quản trị viên' : 'Sinh viên',
        permissions: permResult.rows
      });
    }

    res.json({
      success: true,
      data: rolesData
    });
  } catch (error) {
    console.error('Get all roles error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Lấy quyền theo vai trò
const getRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    
    const validRoles = ['admin', 'sinh_vien'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ'
      });
    }

    const result = await pool.query(
      `SELECT q.* FROM quyen q
       INNER JOIN vai_tro_quyen vtq ON q.ma_quyen = vtq.ma_quyen
       WHERE vtq.role = $1
       ORDER BY q.nhom_quyen, q.ma_quyen`,
      [role]
    );

    res.json({
      success: true,
      data: {
        role,
        ten_vai_tro: role === 'admin' ? 'Quản trị viên' : 'Sinh viên',
        permissions: result.rows
      }
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Cập nhật quyền cho vai trò
const updateRolePermissions = async (req, res) => {
  const client = await pool.connect();
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    const validRoles = ['admin', 'sinh_vien'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ'
      });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách quyền không hợp lệ'
      });
    }

    await client.query('BEGIN');

    // Xóa tất cả quyền cũ
    await client.query('DELETE FROM vai_tro_quyen WHERE role = $1', [role]);

    // Thêm quyền mới
    for (const maQuyen of permissions) {
      // Validate permission exists
      const permExists = await client.query(
        'SELECT 1 FROM quyen WHERE ma_quyen = $1',
        [maQuyen]
      );
      if (permExists.rows.length > 0) {
        await client.query(
          'INSERT INTO vai_tro_quyen (role, ma_quyen) VALUES ($1, $2)',
          [role, maQuyen]
        );
      }
    }

    await client.query('COMMIT');

    // Trả về quyền mới
    const result = await pool.query(
      `SELECT q.* FROM quyen q
       INNER JOIN vai_tro_quyen vtq ON q.ma_quyen = vtq.ma_quyen
       WHERE vtq.role = $1
       ORDER BY q.nhom_quyen, q.ma_quyen`,
      [role]
    );

    res.json({
      success: true,
      message: 'Cập nhật quyền thành công',
      data: {
        role,
        permissions: result.rows
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update role permissions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  } finally {
    client.release();
  }
};

// Lấy quyền của người dùng hiện tại
const getMyPermissions = async (req, res) => {
  try {
    const role = req.user.role;
    
    const result = await pool.query(
      `SELECT q.ma_quyen, q.ten_quyen, q.nhom_quyen FROM quyen q
       INNER JOIN vai_tro_quyen vtq ON q.ma_quyen = vtq.ma_quyen
       WHERE vtq.role = $1
       ORDER BY q.nhom_quyen, q.ma_quyen`,
      [role]
    );

    res.json({
      success: true,
      data: result.rows.map(r => r.ma_quyen)
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  getAllPermissions,
  getAllRoles,
  getRolePermissions,
  updateRolePermissions,
  getMyPermissions
};
