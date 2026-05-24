const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const prisma = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 60);

const normalize = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const studentInfoSelect = {
  MaSv: true,
  MaTaiKhoan: true,
  HoTen: true,
  NgaySinh: true,
  GioiTinh: true,
  MaNganh: true,
  Sdt: true,
  Email: true,
  AnhDaiDien: true,
  TrangThai: true,
  NGANHHOC: {
    select: {
      MaNganh: true,
      TenNganh: true,
      MaKhoa: true,
      KHOA: {
        select: {
          MaKhoa: true,
          TenKhoa: true,
          TenVietTat: true
        }
      }
    }
  }
};

const getLoginErrorMessage = (error) => {
  const message = error && error.message ? error.message : '';
  if (message.includes('Authentication failed against database server')) {
    return 'Không kết nối được database. Kiểm tra DATABASE_URL trong file .env.';
  }
  return 'Lỗi server';
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getBaseUrl = () => (process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

const createMailer = () => {
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const auth = process.env.SMTP_USER && process.env.SMTP_PASS
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth
  });
};

const sendResetEmail = async (account, token) => {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const transporter = createMailer();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com',
    to: account.Email,
    subject: 'Đặt lại mật khẩu hệ thống tín chỉ',
    text: [
      `Xin chào ${account.HoTen || account.TenDangNhap},`,
      '',
      'Bạn vừa yêu cầu đặt lại mật khẩu.',
      `Mở liên kết sau trong vòng ${RESET_TOKEN_TTL_MINUTES} phút:`,
      resetUrl,
      '',
      'Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.'
    ].join('\n'),
    html: `
      <p>Xin chào ${account.HoTen || account.TenDangNhap},</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
      <p><a href="${resetUrl}">Đặt lại mật khẩu</a></p>
      <p>Liên kết có hiệu lực trong ${RESET_TOKEN_TTL_MINUTES} phút.</p>
      <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.</p>
    `
  });
};

const buildLoginResponse = async (user) => {
  let studentInfo = null;
  if (user.Role === 'student') {
    studentInfo = await prisma.SINHVIEN.findFirst({
      where: { MaTaiKhoan: user.MaTaiKhoan },
      select: studentInfoSelect
    });
  }

  let adminInfo = null;
  let chucVu = null;
  if (user.Role === 'admin') {
    adminInfo = await prisma.QUANTRIVIEN.findFirst({
      where: { MaTaiKhoan: user.MaTaiKhoan }
    });
    chucVu = adminInfo?.ChucVu || 'Quản trị viên hệ thống';
  }

  const displayName = adminInfo?.HoTen || studentInfo?.HoTen || user.HoTen || null;
  const token = jwt.sign(
    {
      id: user.MaTaiKhoan,
      MaTaiKhoan: user.MaTaiKhoan,
      username: user.TenDangNhap,
      Role: user.Role,
      MaNhom: user.MaNhom,
      MaSv: studentInfo?.MaSv || user.MaSv || null,
      ChucVu: chucVu,
      HoTen: displayName
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.MaTaiKhoan,
      MaTaiKhoan: user.MaTaiKhoan,
      username: user.TenDangNhap,
      Role: user.Role,
      MaNhom: user.MaNhom,
      MaSv: studentInfo?.MaSv || user.MaSv || null,
      ChucVu: chucVu,
      HoTen: displayName
    },
    student: studentInfo,
    admin: adminInfo
  };
};

const loginWithRole = (expectedRole) => async (req, res) => {
  try {
    const username = normalize(req.body.username);
    const { password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }

    const user = await prisma.TAIKHOAN.findUnique({
      where: { TenDangNhap: username },
      select: {
        MaTaiKhoan: true,
        TenDangNhap: true,
        MatKhau: true,
        Role: true,
        MaNhom: true,
        MaSv: true,
        HoTen: true,
        Email: true,
        TrangThai: true,
        TrangThaiDuyet: true
      }
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }

    if (expectedRole && user.Role !== expectedRole) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản không phù hợp với cổng đăng nhập này'
      });
    }

    if (user.TrangThai === false) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa'
      });
    }

    if (user.TrangThaiDuyet !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản chưa được phép đăng nhập'
      });
    }

    const isValid = await bcrypt.compare(password, user.MatKhau);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    }

    if (user.Role === 'student') {
      const linkedStudent = await prisma.SINHVIEN.findFirst({
        where: {
          OR: [
            { MaTaiKhoan: user.MaTaiKhoan },
            ...(user.MaSv ? [{ MaSv: user.MaSv }] : [])
          ]
        },
        select: { MaSv: true }
      });

      if (!linkedStudent) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản sinh viên chưa được liên kết hồ sơ sinh viên'
        });
      }
    }

    await prisma.TAIKHOAN.update({
      where: { MaTaiKhoan: user.MaTaiKhoan },
      data: { LanDangNhapCuoi: new Date() },
      select: { MaTaiKhoan: true }
    }).catch(() => null);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: await buildLoginResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: getLoginErrorMessage(error) });
  }
};

const login = loginWithRole();
const loginStudent = loginWithRole('student');
const loginAdmin = loginWithRole('admin');

const forgotPassword = async (req, res) => {
  try {
    const identifier = normalize(req.body.identifier || req.body.username || req.body.email);
    const role = normalize(req.body.role);
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập hoặc email' });
    }

    const account = await prisma.TAIKHOAN.findFirst({
      where: {
        ...(role && ['admin', 'student'].includes(role) ? { Role: role } : {}),
        OR: [
          { TenDangNhap: identifier },
          { MaSv: identifier },
          { Email: { equals: identifier, mode: 'insensitive' } }
        ]
      },
      select: {
        MaTaiKhoan: true,
        TenDangNhap: true,
        HoTen: true,
        Email: true,
        TrangThai: true,
        TrangThaiDuyet: true
      }
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản phù hợp' });
    }
    if (account.TrangThai === false || account.TrangThaiDuyet !== 'approved') {
      return res.status(403).json({ success: false, message: 'Tài khoản chưa được phép đặt lại mật khẩu' });
    }
    if (!account.Email) {
      return res.status(400).json({ success: false, message: 'Tài khoản chưa có email để đặt lại mật khẩu' });
    }
    if (!process.env.SMTP_HOST) {
      return res.status(500).json({ success: false, message: 'Chưa cấu hình SMTP để gửi email đặt lại mật khẩu' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.$transaction([
      prisma.DATLAIMATKHAU.updateMany({
        where: { MaTaiKhoan: account.MaTaiKhoan, DaSuDung: false },
        data: { DaSuDung: true, NgaySuDung: new Date() }
      }),
      prisma.DATLAIMATKHAU.create({
        data: {
          MaTaiKhoan: account.MaTaiKhoan,
          TokenHash: tokenHash,
          HetHanLuc: expiresAt,
          DaSuDung: false
        }
      })
    ]);

    await sendResetEmail(account, token);

    res.json({
      success: true,
      message: 'Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (error.message === 'SMTP_NOT_CONFIGURED') {
      return res.status(500).json({ success: false, message: 'Chưa cấu hình SMTP để gửi email đặt lại mật khẩu' });
    }
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = normalize(req.body.token);
    const { newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập token và mật khẩu mới' });
    }

    const tokenHash = hashResetToken(token);
    const reset = await prisma.DATLAIMATKHAU.findFirst({
      where: {
        TokenHash: tokenHash,
        DaSuDung: false,
        HetHanLuc: { gt: new Date() }
      },
      include: {
        TAIKHOAN: {
          select: {
            MaTaiKhoan: true,
            TrangThai: true,
            TrangThaiDuyet: true
          }
        }
      }
    });

    if (!reset || !reset.TAIKHOAN || reset.TAIKHOAN.TrangThai === false || reset.TAIKHOAN.TrangThaiDuyet !== 'approved') {
      return res.status(400).json({ success: false, message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.TAIKHOAN.update({
        where: { MaTaiKhoan: reset.MaTaiKhoan },
        data: { MatKhau: hashed, NgayCapNhat: new Date() },
        select: { MaTaiKhoan: true }
      }),
      prisma.DATLAIMATKHAU.update({
        where: { MaToken: reset.MaToken },
        data: { DaSuDung: true, NgaySuDung: new Date() },
        select: { MaToken: true }
      })
    ]);

    res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user.id || req.user.MaTaiKhoan;
    const user = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: userId },
      select: {
        MaTaiKhoan: true,
        TenDangNhap: true,
        Role: true,
        MaNhom: true,
        TrangThai: true,
        NgayTao: true
      }
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    let studentInfo = null;
    let adminInfo = null;
    if (user.Role === 'student') {
      studentInfo = await prisma.SINHVIEN.findFirst({
        where: { MaTaiKhoan: userId },
        select: studentInfoSelect
      });
    } else if (user.Role === 'admin') {
      adminInfo = await prisma.QUANTRIVIEN.findFirst({
        where: { MaTaiKhoan: userId }
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.MaTaiKhoan,
          MaTaiKhoan: user.MaTaiKhoan,
          username: user.TenDangNhap,
          Role: user.Role,
          MaNhom: user.MaNhom,
          TrangThai: user.TrangThai,
          created_at: user.NgayTao
        },
        student: studentInfo,
        admin: adminInfo
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

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

    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: userId },
      select: { MatKhau: true }
    });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isValid = await bcrypt.compare(currentPassword, account.MatKhau);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    await prisma.TAIKHOAN.update({
      where: { MaTaiKhoan: userId },
      data: { MatKhau: await hashPassword(newPassword), NgayCapNhat: new Date() },
      select: { MaTaiKhoan: true }
    });

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  login,
  loginStudent,
  loginAdmin,
  forgotPassword,
  resetPassword,
  getMe,
  changePassword
};
