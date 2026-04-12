const prisma = require('../config/database');

const ROLES = [
  { Role: 'admin', ten_vai_tro: 'Quản trị viên', MoTa: 'Toàn quyền truy cập hệ thống' },
  { Role: 'student', ten_vai_tro: 'Sinh viên', MoTa: 'Xem thông tin, đăng ký môn học, xem học phí' }
];

const getAllRoles = (req, res) => { res.json({ success: true, data: ROLES }); };

const getMyRole = (req, res) => {
  const Role = req.user.Role;
  const found = ROLES.find(r => r.Role === Role);
  res.json({ success: true, data: { Role, ten_vai_tro: found ? found.ten_vai_tro : Role, isAdmin: Role === 'admin' } });
};

const getAllAccounts = async (req, res) => {
  try {
    const { search, Role: filterRole, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (search) { where.OR = [{ TenDangNhap: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }]; }
    if (filterRole && ['admin', 'student'].includes(filterRole)) { where.Role = filterRole; }

    const [rows, total] = await Promise.all([
      prisma.TAIKHOAN.findMany({ where, skip, take: parseInt(limit), orderBy: { NgayTao: 'desc' }, select: { MaTaiKhoan: true, TenDangNhap: true, Role: true, NgayTao: true, HoTen: true, Email: true, MaSv: true } }),
      prisma.TAIKHOAN.count({ where })
    ]);
    res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { console.error('Get all accounts error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { Role } = req.body;
    const currentUserId = req.user.id || req.user.MaTaiKhoan;
    if (!Role || !['admin', 'student'].includes(Role)) return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    if (parseInt(id) === parseInt(currentUserId)) return res.status(400).json({ success: false, message: 'Không thể thay đổi Role của chính mình' });

    const account = await prisma.TAIKHOAN.findUnique({ where: { MaTaiKhoan: parseInt(id) } });
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    if (account.Role === Role) return res.status(400).json({ success: false, message: `Tài khoản đã có Role ${Role}` });

    await prisma.TAIKHOAN.update({ where: { MaTaiKhoan: parseInt(id) }, data: { Role } });
    res.json({ success: true, message: `Đã thay đổi Role thành "${Role}"`, data: { MaTaiKhoan: parseInt(id), old_role: account.Role, new_role: Role } });
  } catch (error) { console.error('Update user Role error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { getAllRoles, getMyRole, getAllAccounts, updateUserRole };
