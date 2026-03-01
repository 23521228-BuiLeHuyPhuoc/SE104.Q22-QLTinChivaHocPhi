const { ROLE_PERMISSIONS } = require('../middleware/auth');

// Định nghĩa thông tin quyền (phân quyền bằng phần mềm, không dùng CSDL)
const ALL_PERMISSIONS = [
  { ma_quyen: 'STUDENT_VIEW', ten_quyen: 'Xem danh sách sinh viên', nhom_quyen: 'SINH_VIEN', mo_ta: 'Quyền xem thông tin sinh viên' },
  { ma_quyen: 'STUDENT_CREATE', ten_quyen: 'Thêm sinh viên', nhom_quyen: 'SINH_VIEN', mo_ta: 'Quyền tạo hồ sơ sinh viên mới' },
  { ma_quyen: 'STUDENT_EDIT', ten_quyen: 'Sửa sinh viên', nhom_quyen: 'SINH_VIEN', mo_ta: 'Quyền chỉnh sửa thông tin sinh viên' },
  { ma_quyen: 'STUDENT_DELETE', ten_quyen: 'Xóa sinh viên', nhom_quyen: 'SINH_VIEN', mo_ta: 'Quyền xóa hồ sơ sinh viên' },
  { ma_quyen: 'COURSE_VIEW', ten_quyen: 'Xem danh sách môn học', nhom_quyen: 'MON_HOC', mo_ta: 'Quyền xem thông tin môn học' },
  { ma_quyen: 'COURSE_CREATE', ten_quyen: 'Thêm môn học', nhom_quyen: 'MON_HOC', mo_ta: 'Quyền tạo môn học mới' },
  { ma_quyen: 'COURSE_EDIT', ten_quyen: 'Sửa môn học', nhom_quyen: 'MON_HOC', mo_ta: 'Quyền chỉnh sửa thông tin môn học' },
  { ma_quyen: 'COURSE_DELETE', ten_quyen: 'Xóa môn học', nhom_quyen: 'MON_HOC', mo_ta: 'Quyền xóa môn học' },
  { ma_quyen: 'CLASS_VIEW', ten_quyen: 'Xem danh sách lớp học', nhom_quyen: 'LOP_HOC', mo_ta: 'Quyền xem thông tin lớp học' },
  { ma_quyen: 'CLASS_CREATE', ten_quyen: 'Thêm lớp học', nhom_quyen: 'LOP_HOC', mo_ta: 'Quyền tạo lớp học mới' },
  { ma_quyen: 'CLASS_EDIT', ten_quyen: 'Sửa lớp học', nhom_quyen: 'LOP_HOC', mo_ta: 'Quyền chỉnh sửa thông tin lớp học' },
  { ma_quyen: 'CLASS_DELETE', ten_quyen: 'Xóa lớp học', nhom_quyen: 'LOP_HOC', mo_ta: 'Quyền xóa lớp học' },
  { ma_quyen: 'REGISTRATION_VIEW', ten_quyen: 'Xem danh sách đăng ký', nhom_quyen: 'DANG_KY', mo_ta: 'Quyền xem phiếu đăng ký' },
  { ma_quyen: 'REGISTRATION_CREATE', ten_quyen: 'Đăng ký môn học', nhom_quyen: 'DANG_KY', mo_ta: 'Quyền đăng ký môn học' },
  { ma_quyen: 'REGISTRATION_CANCEL', ten_quyen: 'Hủy đăng ký', nhom_quyen: 'DANG_KY', mo_ta: 'Quyền hủy phiếu đăng ký' },
  { ma_quyen: 'TUITION_VIEW', ten_quyen: 'Xem học phí', nhom_quyen: 'HOC_PHI', mo_ta: 'Quyền xem thông tin học phí' },
  { ma_quyen: 'TUITION_CALCULATE', ten_quyen: 'Tính học phí', nhom_quyen: 'HOC_PHI', mo_ta: 'Quyền tính toán học phí' },
  { ma_quyen: 'PAYMENT_VIEW', ten_quyen: 'Xem lịch sử thu', nhom_quyen: 'THU_HP', mo_ta: 'Quyền xem lịch sử thanh toán' },
  { ma_quyen: 'PAYMENT_CREATE', ten_quyen: 'Tạo phiếu thu', nhom_quyen: 'THU_HP', mo_ta: 'Quyền tạo phiếu thu học phí' },
  { ma_quyen: 'PAYMENT_CANCEL', ten_quyen: 'Hủy phiếu thu', nhom_quyen: 'THU_HP', mo_ta: 'Quyền hủy phiếu thu học phí' },
  { ma_quyen: 'SEMESTER_VIEW', ten_quyen: 'Xem học kỳ', nhom_quyen: 'HOC_KY', mo_ta: 'Quyền xem thông tin học kỳ' },
  { ma_quyen: 'SEMESTER_CREATE', ten_quyen: 'Thêm học kỳ', nhom_quyen: 'HOC_KY', mo_ta: 'Quyền tạo học kỳ mới' },
  { ma_quyen: 'SEMESTER_EDIT', ten_quyen: 'Sửa học kỳ', nhom_quyen: 'HOC_KY', mo_ta: 'Quyền chỉnh sửa học kỳ' },
  { ma_quyen: 'SEMESTER_DELETE', ten_quyen: 'Xóa học kỳ', nhom_quyen: 'HOC_KY', mo_ta: 'Quyền xóa học kỳ' },
  { ma_quyen: 'REPORT_VIEW', ten_quyen: 'Xem báo cáo', nhom_quyen: 'BAO_CAO', mo_ta: 'Quyền xem báo cáo thống kê' },
  { ma_quyen: 'NOTIFICATION_VIEW', ten_quyen: 'Xem thông báo', nhom_quyen: 'THONG_BAO', mo_ta: 'Quyền xem thông báo' },
  { ma_quyen: 'NOTIFICATION_CREATE', ten_quyen: 'Tạo thông báo', nhom_quyen: 'THONG_BAO', mo_ta: 'Quyền tạo thông báo mới' },
  { ma_quyen: 'NOTIFICATION_DELETE', ten_quyen: 'Xóa thông báo', nhom_quyen: 'THONG_BAO', mo_ta: 'Quyền xóa thông báo' },
  { ma_quyen: 'ROLE_VIEW', ten_quyen: 'Xem phân quyền', nhom_quyen: 'PHAN_QUYEN', mo_ta: 'Quyền xem danh sách quyền theo vai trò' }
];

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  sinh_vien: 'Sinh viên'
};

// Nhóm quyền theo nhom_quyen
const groupPermissions = (permissions) => {
  const grouped = {};
  permissions.forEach(p => {
    if (!grouped[p.nhom_quyen]) {
      grouped[p.nhom_quyen] = [];
    }
    grouped[p.nhom_quyen].push(p);
  });
  return grouped;
};

// Lấy tất cả quyền
const getAllPermissions = (req, res) => {
  const grouped = groupPermissions(ALL_PERMISSIONS);
  res.json({
    success: true,
    data: ALL_PERMISSIONS,
    grouped
  });
};

// Lấy tất cả vai trò và quyền
const getAllRoles = (req, res) => {
  const rolesData = Object.keys(ROLE_PERMISSIONS).map(role => {
    const permCodes = ROLE_PERMISSIONS[role] || [];
    const permissions = ALL_PERMISSIONS.filter(p => permCodes.includes(p.ma_quyen));
    return {
      role,
      ten_vai_tro: ROLE_LABELS[role] || role,
      permissions
    };
  });

  res.json({
    success: true,
    data: rolesData
  });
};

// Lấy quyền theo vai trò
const getRolePermissions = (req, res) => {
  const { role } = req.params;
  
  if (!ROLE_PERMISSIONS[role]) {
    return res.status(400).json({
      success: false,
      message: 'Vai trò không hợp lệ'
    });
  }

  const permCodes = ROLE_PERMISSIONS[role];
  const permissions = ALL_PERMISSIONS.filter(p => permCodes.includes(p.ma_quyen));

  res.json({
    success: true,
    data: {
      role,
      ten_vai_tro: ROLE_LABELS[role] || role,
      permissions
    }
  });
};

// Lấy quyền của người dùng hiện tại
const getMyPermissions = (req, res) => {
  const role = req.user.role;
  const permissions = ROLE_PERMISSIONS[role] || [];

  res.json({
    success: true,
    data: permissions
  });
};

module.exports = {
  getAllPermissions,
  getAllRoles,
  getRolePermissions,
  getMyPermissions
};
