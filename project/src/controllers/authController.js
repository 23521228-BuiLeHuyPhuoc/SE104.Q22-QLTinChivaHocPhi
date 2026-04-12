const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });

    const user = await prisma.TAIKHOAN.findUnique({ where: { TenDangNhap: username } });
    if (!user) return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });

    const isValid = await bcrypt.compare(password, user.MatKhau);
    if (!isValid) return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });

    const token = jwt.sign({ id: user.MaTaiKhoan, MaTaiKhoan: user.MaTaiKhoan, username: user.TenDangNhap, Role: user.Role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    let studentInfo = null;
    if (user.Role === 'student') {
      studentInfo = await prisma.SINHVIEN.findFirst({ where: { MaTaiKhoan: user.MaTaiKhoan }, include: { NGANHHOC: { include: { KHOA: true } } } });
    }
    let adminInfo = null;
    if (user.Role === 'admin') {
      adminInfo = await prisma.QUANTRIVIEN.findFirst({ where: { MaTaiKhoan: user.MaTaiKhoan } });
    }

    res.json({ success: true, message: 'Đăng nhập thành công', data: { token, user: { id: user.MaTaiKhoan, MaTaiKhoan: user.MaTaiKhoan, username: user.TenDangNhap, Role: user.Role }, student: studentInfo, admin: adminInfo } });
  } catch (error) { console.error('Login error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const register = async (req, res) => {
  try {
    const { username, password, Role = 'student' } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });

    const existing = await prisma.TAIKHOAN.findUnique({ where: { TenDangNhap: username } });
    if (existing) return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const newAccount = await prisma.TAIKHOAN.create({ data: { TenDangNhap: username, MatKhau: hashed, Role } });

    res.status(201).json({ success: true, message: 'Đăng ký thành công', data: { id: newAccount.MaTaiKhoan, username: newAccount.TenDangNhap, Role: newAccount.Role } });
  } catch (error) { console.error('Register error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user.id || req.user.MaTaiKhoan;
    const user = await prisma.TAIKHOAN.findUnique({ where: { MaTaiKhoan: userId }, select: { MaTaiKhoan: true, TenDangNhap: true, Role: true, NgayTao: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    let studentInfo = null, adminInfo = null;
    if (user.Role === 'student') { studentInfo = await prisma.SINHVIEN.findFirst({ where: { MaTaiKhoan: userId }, include: { NGANHHOC: { include: { KHOA: true } } } }); }
    else if (user.Role === 'admin') { adminInfo = await prisma.QUANTRIVIEN.findFirst({ where: { MaTaiKhoan: userId } }); }

    res.json({ success: true, data: { user: { id: user.MaTaiKhoan, MaTaiKhoan: user.MaTaiKhoan, username: user.TenDangNhap, Role: user.Role, created_at: user.NgayTao }, student: studentInfo, admin: adminInfo } });
  } catch (error) { console.error('GetMe error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id || req.user.MaTaiKhoan;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });

    const account = await prisma.TAIKHOAN.findUnique({ where: { MaTaiKhoan: userId }, select: { MatKhau: true } });
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const isValid = await bcrypt.compare(currentPassword, account.MatKhau);
    if (!isValid) return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await prisma.TAIKHOAN.update({ where: { MaTaiKhoan: userId }, data: { MatKhau: hashed } });

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) { console.error('Change password error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { login, register, getMe, changePassword };
