// Phân quyền đơn giản: admin và sinh_vien
// Admin: truy cập toàn bộ chức năng quản trị
// Sinh viên: chỉ truy cập phần dành cho sinh viên

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

module.exports = {
  getAllRoles,
  getMyRole
};
