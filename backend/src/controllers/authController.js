const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }

    // Query từ bảng tai_khoan (accounts)
    const result = await pool.query(
      'SELECT * FROM "TAIKHOAN" WHERE "TenDangNhap" = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.MatKhau);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }

    const token = jwt.sign(
      { 
        id: user.MaTaiKhoan, 
        MaTaiKhoan: user.MaTaiKhoan,
        username: user.TenDangNhap, 
        Role: user.Role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Lấy thông tin sinh viên nếu là sinh viên
    let studentInfo = null;
    if (user.Role === 'student') {
      const studentResult = await pool.query(
        `SELECT sv.*, nh."TenNganh" as "TenNganh", kh."TenKhoa"
         FROM "SINHVIEN" sv
         LEFT JOIN "NGANHHOC" nh ON sv."MaNganh" = nh."MaNganh"
         LEFT JOIN "KHOA" kh ON nh."MaKhoa" = kh."MaKhoa"
         WHERE sv."MaTaiKhoan" = $1`,
        [user.MaTaiKhoan]
      );
      if (studentResult.rows.length > 0) {
        const sv = studentResult.rows[0];
        studentInfo = {
          id: sv.MaSv,
          MaSv: sv.MaSv,
          student_code: sv.MaSv,
          HoTen: sv.HoTen,
          full_name: sv.HoTen,
          NgaySinh: sv.NgaySinh,
          GioiTinh: sv.GioiTinh,
          Email: sv.Email,
          so_dien_thoai: sv.so_dien_thoai,
          DiaChi: sv.DiaChi,
          MaNganh: sv.MaNganh,
          TenNganh: sv.TenNganh,
          TenKhoa: sv.TenKhoa,
          nam_nhap_hoc: sv.nam_nhap_hoc,
          TrangThai: sv.TrangThai,
          avatar: sv.avatar
        };
      }
    }

    // Lấy thông tin admin nếu là admin
    let adminInfo = null;
    if (user.Role === 'admin') {
      const adminResult = await pool.query(
        'SELECT * FROM "QUANTRIVIEN" WHERE "MaTaiKhoan" = $1',
        [user.MaTaiKhoan]
      );
      if (adminResult.rows.length > 0) {
        adminInfo = adminResult.rows[0];
      }
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user.MaTaiKhoan,
          MaTaiKhoan: user.MaTaiKhoan,
          username: user.TenDangNhap,
          Role: user.Role
        },
        student: studentInfo,
        admin: adminInfo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Register new user
const register = async (req, res) => {
  try {
    const { username, password, Role = 'student' } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    // Kiểm tra tên đăng nhập đã tồn tại
    const existingUser = await pool.query(
      'SELECT "MaTaiKhoan" FROM "TAIKHOAN" WHERE "TenDangNhap" = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập đã tồn tại'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo tài khoản
    const result = await pool.query(
      'INSERT INTO "TAIKHOAN" ("TenDangNhap", "MatKhau", "Role") VALUES ($1, $2, $3) RETURNING "MaTaiKhoan", "TenDangNhap", "Role"',
      [username, hashedPassword, Role]
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        id: result.rows[0].MaTaiKhoan,
        username: result.rows[0].TenDangNhap,
        Role: result.rows[0].Role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Get current user info
const getMe = async (req, res) => {
  try {
    const userId = req.user.id || req.user.MaTaiKhoan;
    
    const result = await pool.query(
      'SELECT "MaTaiKhoan", "TenDangNhap", "Role", "NgayTao" FROM "TAIKHOAN" WHERE "MaTaiKhoan" = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const user = result.rows[0];
    let studentInfo = null;
    let adminInfo = null;

    if (user.Role === 'student') {
      const studentResult = await pool.query(
        `SELECT sv.*, nh."TenNganh", kh."TenKhoa"
         FROM "SINHVIEN" sv
         LEFT JOIN "NGANHHOC" nh ON sv."MaNganh" = nh."MaNganh"
         LEFT JOIN "KHOA" kh ON nh."MaKhoa" = kh."MaKhoa"
         WHERE sv."MaTaiKhoan" = $1`,
        [userId]
      );
      if (studentResult.rows.length > 0) {
        const sv = studentResult.rows[0];
        studentInfo = {
          id: sv.MaSv,
          MaSv: sv.MaSv,
          student_code: sv.MaSv,
          HoTen: sv.HoTen,
          full_name: sv.HoTen,
          NgaySinh: sv.NgaySinh,
          GioiTinh: sv.GioiTinh,
          Email: sv.Email,
          so_dien_thoai: sv.so_dien_thoai,
          DiaChi: sv.DiaChi,
          MaNganh: sv.MaNganh,
          TenNganh: sv.TenNganh,
          TenKhoa: sv.TenKhoa,
          nam_nhap_hoc: sv.nam_nhap_hoc,
          TrangThai: sv.TrangThai,
          avatar: sv.avatar
        };
      }
    } else if (user.Role === 'admin') {
      const adminResult = await pool.query(
        'SELECT * FROM "QUANTRIVIEN" WHERE "MaTaiKhoan" = $1',
        [userId]
      );
      if (adminResult.rows.length > 0) {
        adminInfo = adminResult.rows[0];
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.MaTaiKhoan,
          MaTaiKhoan: user.MaTaiKhoan,
          username: user.TenDangNhap,
          Role: user.Role,
          created_at: user.NgayTao
        },
        student: studentInfo,
        admin: adminInfo
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id || req.user.MaTaiKhoan;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    const result = await pool.query(
      'SELECT "MatKhau" FROM "TAIKHOAN" WHERE "MaTaiKhoan" = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].MatKhau);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE "TAIKHOAN" SET "MatKhau" = $1 WHERE "MaTaiKhoan" = $2',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  login,
  register,
  getMe,
  changePassword
};
