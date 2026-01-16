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
      'SELECT * FROM tai_khoan WHERE ten_dang_nhap = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.mat_khau);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }

    const token = jwt.sign(
      { 
        id: user.ma_tai_khoan, 
        ma_tai_khoan: user.ma_tai_khoan,
        username: user.ten_dang_nhap, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Lấy thông tin sinh viên nếu là sinh viên
    let studentInfo = null;
    if (user.role === 'student') {
      const studentResult = await pool.query(
        `SELECT sv.*, nh.ten_nganh as ten_nganh, kh.ten_khoa
         FROM sinh_vien sv
         LEFT JOIN nganh_hoc nh ON sv.ma_nganh = nh.ma_nganh
         LEFT JOIN khoa kh ON nh.ma_khoa = kh.ma_khoa
         WHERE sv.ma_tai_khoan = $1`,
        [user.ma_tai_khoan]
      );
      if (studentResult.rows.length > 0) {
        const sv = studentResult.rows[0];
        studentInfo = {
          id: sv.ma_sv,
          ma_sv: sv.ma_sv,
          student_code: sv.ma_sv,
          ho_ten: sv.ho_ten,
          full_name: sv.ho_ten,
          ngay_sinh: sv.ngay_sinh,
          gioi_tinh: sv.gioi_tinh,
          email: sv.email,
          so_dien_thoai: sv.so_dien_thoai,
          dia_chi: sv.dia_chi,
          ma_nganh: sv.ma_nganh,
          ten_nganh: sv.ten_nganh,
          ten_khoa: sv.ten_khoa,
          nam_nhap_hoc: sv.nam_nhap_hoc,
          trang_thai: sv.trang_thai,
          avatar: sv.avatar
        };
      }
    }

    // Lấy thông tin admin nếu là admin
    let adminInfo = null;
    if (user.role === 'admin') {
      const adminResult = await pool.query(
        'SELECT * FROM quan_tri_vien WHERE ma_tai_khoan = $1',
        [user.ma_tai_khoan]
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
          id: user.ma_tai_khoan,
          ma_tai_khoan: user.ma_tai_khoan,
          username: user.ten_dang_nhap,
          role: user.role
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
    const { username, password, role = 'student' } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    // Kiểm tra tên đăng nhập đã tồn tại
    const existingUser = await pool.query(
      'SELECT ma_tai_khoan FROM tai_khoan WHERE ten_dang_nhap = $1',
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
      'INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, role) VALUES ($1, $2, $3) RETURNING ma_tai_khoan, ten_dang_nhap, role',
      [username, hashedPassword, role]
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        id: result.rows[0].ma_tai_khoan,
        username: result.rows[0].ten_dang_nhap,
        role: result.rows[0].role
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
    const userId = req.user.id || req.user.ma_tai_khoan;
    
    const result = await pool.query(
      'SELECT ma_tai_khoan, ten_dang_nhap, role, ngay_tao FROM tai_khoan WHERE ma_tai_khoan = $1',
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

    if (user.role === 'student') {
      const studentResult = await pool.query(
        `SELECT sv.*, nh.ten_nganh, kh.ten_khoa
         FROM sinh_vien sv
         LEFT JOIN nganh_hoc nh ON sv.ma_nganh = nh.ma_nganh
         LEFT JOIN khoa kh ON nh.ma_khoa = kh.ma_khoa
         WHERE sv.ma_tai_khoan = $1`,
        [userId]
      );
      if (studentResult.rows.length > 0) {
        const sv = studentResult.rows[0];
        studentInfo = {
          id: sv.ma_sv,
          ma_sv: sv.ma_sv,
          student_code: sv.ma_sv,
          ho_ten: sv.ho_ten,
          full_name: sv.ho_ten,
          ngay_sinh: sv.ngay_sinh,
          gioi_tinh: sv.gioi_tinh,
          email: sv.email,
          so_dien_thoai: sv.so_dien_thoai,
          dia_chi: sv.dia_chi,
          ma_nganh: sv.ma_nganh,
          ten_nganh: sv.ten_nganh,
          ten_khoa: sv.ten_khoa,
          nam_nhap_hoc: sv.nam_nhap_hoc,
          trang_thai: sv.trang_thai,
          avatar: sv.avatar
        };
      }
    } else if (user.role === 'admin') {
      const adminResult = await pool.query(
        'SELECT * FROM quan_tri_vien WHERE ma_tai_khoan = $1',
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
          id: user.ma_tai_khoan,
          ma_tai_khoan: user.ma_tai_khoan,
          username: user.ten_dang_nhap,
          role: user.role,
          created_at: user.ngay_tao
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
    const userId = req.user.id || req.user.ma_tai_khoan;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    const result = await pool.query(
      'SELECT mat_khau FROM tai_khoan WHERE ma_tai_khoan = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].mat_khau);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE tai_khoan SET mat_khau = $1 WHERE ma_tai_khoan = $2',
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
