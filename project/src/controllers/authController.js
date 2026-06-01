const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const prisma = require('../config/database');
const { uploadAvatarBuffer } = require('../utils/cloudinary');
const redisClient = require('../utils/redisClient');
const { sendErrorResponse } = require('../utils/errorHandler');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const RESET_OTP_TTL_MINUTES = Number(process.env.RESET_OTP_TTL_MINUTES || 10);
const RESET_OTP_LENGTH = Math.min(8, Math.max(4, Number(process.env.RESET_OTP_LENGTH || 6)));
const RESET_OTP_MAX_ATTEMPTS = Math.max(1, Number(process.env.RESET_OTP_MAX_ATTEMPTS || 5));

const normalize = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const studentInfoSelect = {
  MaSv: true,
  MaTaiKhoan: true,
  HoTen: true,
  NgaySinh: true,
  GioiTinh: true,
  Cccd: true,
  DiaChiLienHe: true,
  MaPhuongXa: true,
  MaDanToc: true,
  MaNganh: true,
  Sdt: true,
  Email: true,
  AnhDaiDien: true,
  NgayNhapHoc: true,
  TrangThai: true,
  DANTOC: {
    select: {
      MaDanToc: true,
      TenDanToc: true
    }
  },
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

const getResetOtpTtlSeconds = () => Math.max(60, Math.floor(RESET_OTP_TTL_MINUTES * 60));
const getResetOtpKey = (accountId) => `password-reset:otp:${accountId}`;
const normalizeOtp = (value) => normalize(value).replace(/\s+/g, '');
const hashResetOtp = (accountId, otp) => crypto
  .createHash('sha256')
  .update(`${accountId}:${otp}:${JWT_SECRET}`)
  .digest('hex');

const generateOtp = () => {
  const upperBound = 10 ** RESET_OTP_LENGTH;
  return String(crypto.randomInt(0, upperBound)).padStart(RESET_OTP_LENGTH, '0');
};

const isRedisConnectionError = (error) => {
  const message = String(error?.message || '');
  return ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(error?.code)
    || message.includes('Socket closed unexpectedly')
    || message.includes('The client is closed');
};

const getRedisUnavailableMessage = () => 'Không thể kết nối Redis để lưu hoặc kiểm tra mã OTP. Kiểm tra REDIS_URL và Redis server.';

const storeResetOtp = async (accountId, otp) => {
  const ttlSeconds = getResetOtpTtlSeconds();
  await redisClient.setJson(getResetOtpKey(accountId), {
    otpHash: hashResetOtp(accountId, otp),
    attempts: 0,
    expiresAt: Date.now() + ttlSeconds * 1000
  }, ttlSeconds);
};

const clearResetOtp = async (accountId) => {
  await redisClient.deleteKey(getResetOtpKey(accountId));
};

const verifyResetOtp = async (accountId, otp) => {
  const key = getResetOtpKey(accountId);
  const payload = await redisClient.getJson(key);
  if (!payload || !payload.otpHash || Number(payload.expiresAt || 0) <= Date.now()) {
    await redisClient.deleteKey(key).catch(() => null);
    return { success: false, message: 'Ma OTP khong hop le hoac da het han' };
  }

  const attempts = Number(payload.attempts || 0);
  if (attempts >= RESET_OTP_MAX_ATTEMPTS) {
    await redisClient.deleteKey(key).catch(() => null);
    return { success: false, message: 'Ma OTP da bi khoa do nhap sai qua nhieu lan. Vui long yeu cau ma moi.' };
  }

  if (payload.otpHash !== hashResetOtp(accountId, otp)) {
    const nextAttempts = attempts + 1;
    if (nextAttempts >= RESET_OTP_MAX_ATTEMPTS) {
      await redisClient.deleteKey(key).catch(() => null);
      return { success: false, message: 'Ma OTP da bi khoa do nhap sai qua nhieu lan. Vui long yeu cau ma moi.' };
    }

    const ttlSeconds = Math.max(1, Math.ceil((Number(payload.expiresAt) - Date.now()) / 1000));
    await redisClient.setJson(key, { ...payload, attempts: nextAttempts }, ttlSeconds);
    return { success: false, message: 'Ma OTP khong dung' };
  }

  return { success: true };
};

const getBaseUrl = () => (process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

const getCloudinaryUploadErrorMessage = (error) => {
  const rawMessage = String(error?.message || '');
  if (error?.http_code === 401 && /invalid cloud_name/i.test(rawMessage)) {
    return 'Cloudinary cloud name không hợp lệ. Kiểm tra CLOUDINARY_CLOUD_NAME trong .env, dùng đúng Cloud name trong Cloudinary dashboard.';
  }
  if (error?.http_code === 401) {
    return 'Cloudinary từ chối xác thực. Kiểm tra lại CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET trong .env.';
  }
  if (error?.http_code) {
    return `Cloudinary trả lỗi ${error.http_code}: ${rawMessage || 'Không thể upload ảnh đại diện'}`;
  }
  return 'Không thể upload ảnh đại diện lên Cloudinary';
};

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

const getResetPath = (account) => {
  const query = new URLSearchParams({
    identifier: account.TenDangNhap || account.Email,
    role: account.Role || 'student'
  });
  return `/reset-password?${query.toString()}`;
};

const findResetAccount = (identifier, role) => prisma.TAIKHOAN.findFirst({
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
    Role: true,
    HoTen: true,
    Email: true,
    TrangThai: true,
    TrangThaiDuyet: true
  }
});

const sendResetEmail = async (account, otp) => {
  const resetUrl = `${getBaseUrl()}${getResetPath(account)}`;
  const transporter = createMailer();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com',
    to: account.Email,
    subject: 'Mã OTP đặt lại mật khẩu hệ thống đăng ký môn học',
    text: [
      `Xin chào ${account.HoTen || account.TenDangNhap},`,
      '',
      'Bạn vừa yêu cầu đặt lại mật khẩu.',
      `Mã OTP của bạn là: ${otp}`,
      `Mã có hiệu lực trong ${RESET_OTP_TTL_MINUTES} phút.`,
      '',
      'Nhập mã OTP tại liên kết sau:',
      resetUrl,
      '',
      'Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.'
    ].join('\n'),
    html: `
      <p>Xin chào ${account.HoTen || account.TenDangNhap},</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
      <p>Mã OTP của bạn là: <strong style="font-size: 20px; letter-spacing: 2px;">${otp}</strong></p>
      <p>Mã có hiệu lực trong ${RESET_OTP_TTL_MINUTES} phút.</p>
      <p><a href="${resetUrl}">Nhập mã OTP và đặt lại mật khẩu</a></p>
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
  const avatarUrl = adminInfo?.AnhDaiDien || studentInfo?.AnhDaiDien || user.AnhDaiDien || null;
  const token = jwt.sign(
    {
      id: user.MaTaiKhoan,
      MaTaiKhoan: user.MaTaiKhoan,
      username: user.TenDangNhap,
      Role: user.Role,
      MaNhom: user.MaNhom,
      MaSv: studentInfo?.MaSv || user.MaSv || null,
      ChucVu: chucVu,
      HoTen: displayName,
      AnhDaiDien: avatarUrl
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
      HoTen: displayName,
      AnhDaiDien: avatarUrl
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
        message: 'Vui long nhap ten dang nhap va mat khau'
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
        AnhDaiDien: true,
        TrangThai: true,
        TrangThaiDuyet: true
      }
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Ten dang nhap hoac mat khau khong dung'
      });
    }

    if (expectedRole && user.Role !== expectedRole) {
      return res.status(403).json({
        success: false,
        message: 'Tai khoan khong phu hop voi cong dang nhap nay'
      });
    }

    if (user.TrangThai === false) {
      return res.status(403).json({
        success: false,
        message: 'Tai khoan da bi khoa'
      });
    }

    if (user.TrangThaiDuyet !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Tai khoan chua duoc phep dang nhap'
      });
    }

    const isValid = await bcrypt.compare(password, user.MatKhau);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Ten dang nhap hoac mat khau khong dung'
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
          message: 'Tai khoan sinh vien chua duoc lien ket ho so sinh vien'
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
      message: 'Dang nhap thanh cong',
      data: await buildLoginResponse(user)
    });
  } catch (error) {
        return sendErrorResponse(res, error, getLoginErrorMessage(error), 'Login error:');
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
      return res.status(400).json({ success: false, message: 'Vui long nhap ten dang nhap hoac email' });
    }

    const account = await findResetAccount(identifier, role);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan phu hop' });
    }
    if (account.TrangThai === false || account.TrangThaiDuyet !== 'approved') {
      return res.status(403).json({ success: false, message: 'Tai khoan chua duoc phep dat lai mat khau' });
    }
    if (!account.Email) {
      return res.status(400).json({ success: false, message: 'Tai khoan chua co email de dat lai mat khau' });
    }
    if (!process.env.SMTP_HOST) {
      return res.status(500).json({ success: false, message: 'Chua cau hinh SMTP de gui email dat lai mat khau' });
    }

    const otp = generateOtp();
    await storeResetOtp(account.MaTaiKhoan, otp);
    try {
      await sendResetEmail(account, otp);
    } catch (emailError) {
      await clearResetOtp(account.MaTaiKhoan).catch(() => null);
      throw emailError;
    }

    res.json({
      success: true,
      message: `Da gui ma OTP dat lai mat khau. Ma co hieu luc trong ${RESET_OTP_TTL_MINUTES} phut.`,
      data: {
        resetPath: getResetPath(account)
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (error.message === 'SMTP_NOT_CONFIGURED') {
      return res.status(500).json({ success: false, message: 'Chua cau hinh SMTP de gui email dat lai mat khau' });
    }
    if (isRedisConnectionError(error)) {
      return res.status(500).json({ success: false, message: getRedisUnavailableMessage() });
    }
    return sendErrorResponse(res, error, 'Loi server');
  }
};

const resetPassword = async (req, res) => {
  try {
    const identifier = normalize(req.body.identifier || req.body.username || req.body.email);
    const role = normalize(req.body.role);
    const otp = normalizeOtp(req.body.otp || req.body.code);
    const { newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui long nhap tai khoan, ma OTP va mat khau moi' });
    }
    if (!/^\d+$/.test(otp) || otp.length !== RESET_OTP_LENGTH) {
      return res.status(400).json({ success: false, message: `Ma OTP phai gom ${RESET_OTP_LENGTH} chu so` });
    }

    const account = await findResetAccount(identifier, role);
    if (!account || account.TrangThai === false || account.TrangThaiDuyet !== 'approved') {
      return res.status(400).json({ success: false, message: 'Ma OTP khong hop le hoac da het han' });
    }

    const verification = await verifyResetOtp(account.MaTaiKhoan, otp);
    if (!verification.success) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.TAIKHOAN.update({
      where: { MaTaiKhoan: account.MaTaiKhoan },
      data: { MatKhau: hashed, NgayCapNhat: new Date() },
      select: { MaTaiKhoan: true }
    });
    await clearResetOtp(account.MaTaiKhoan).catch(() => null);

    res.json({ success: true, message: 'Dat lai mat khau thanh cong' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (isRedisConnectionError(error)) {
      return res.status(500).json({ success: false, message: getRedisUnavailableMessage() });
    }
    return sendErrorResponse(res, error, 'Loi server');
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
        AnhDaiDien: true,
        NgayTao: true
      }
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay nguoi dung'
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
          AnhDaiDien: adminInfo?.AnhDaiDien || studentInfo?.AnhDaiDien || user.AnhDaiDien || null,
          created_at: user.NgayTao
        },
        student: studentInfo,
        admin: adminInfo
      }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'GetMe error:');
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    if ((req.user.Role || req.user.role) !== 'student') {
      return res.status(403).json({ success: false, message: 'Chi sinh vien moi duoc cap nhat ho so ca nhan' });
    }

    const forbiddenFields = {
      MaSv: 'MSSV',
      maSv: 'MSSV',
      mssv: 'MSSV',
      HoTen: 'họ tên',
      hoTen: 'họ tên',
      Email: 'email',
      email: 'email',
      Gmail: 'email',
      gmail: 'email',
      NgaySinh: 'ngày sinh',
      ngaySinh: 'ngày sinh',
      Cccd: 'CCCD',
      cccd: 'CCCD',
      CMND: 'CCCD',
      cmnd: 'CCCD',
      MaDanToc: 'dân tộc',
      maDanToc: 'dân tộc',
      DanToc: 'dân tộc',
      danToc: 'dân tộc',
      MaNganh: 'ngành',
      maNganh: 'ngành',
      Nganh: 'ngành',
      nganh: 'ngành',
      Khoa: 'khoa',
      khoa: 'khoa',
      TenKhoa: 'khoa',
      TrangThai: 'trạng thái',
      trangThai: 'trạng thái',
      NgayNhapHoc: 'khóa',
      ngayNhapHoc: 'khóa',
      KhoaHoc: 'khóa',
      khoaHoc: 'khóa'
    };
    const blocked = Object.keys(req.body || {}).find((key) => Object.prototype.hasOwnProperty.call(forbiddenFields, key));
    if (blocked) {
      return res.status(400).json({
        success: false,
        message: `${forbiddenFields[blocked]} khong duoc phep chinh sua`
      });
    }

    const userId = Number(req.user.id || req.user.MaTaiKhoan || 0);
    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: userId },
      select: { MaTaiKhoan: true, MaSv: true }
    });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan' });
    }

    const student = await prisma.SINHVIEN.findFirst({
      where: {
        OR: [
          { MaTaiKhoan: account.MaTaiKhoan },
          ...(account.MaSv ? [{ MaSv: account.MaSv }] : [])
        ],
        DaXoa: false
      },
      select: { MaSv: true }
    });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Khong tim thay ho so sinh vien' });
    }

    const data = {};
    if (req.body.Sdt !== undefined) data.Sdt = normalize(req.body.Sdt) || null;
    if (req.body.GioiTinh !== undefined) {
      const gender = normalize(req.body.GioiTinh);
      const validGenders = ['', 'Nam', 'Nữ', 'Nu', 'Khác', 'Khac'];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({ success: false, message: 'Gioi tinh khong hop le' });
      }
      data.GioiTinh = gender === 'Nu' ? 'Nữ' : gender === 'Khac' ? 'Khác' : gender;
    }
    if (req.body.DiaChiLienHe !== undefined) {
      const address = normalize(req.body.DiaChiLienHe);
      if (!address) {
        return res.status(400).json({ success: false, message: 'Dia chi lien he khong duoc de trong' });
      }
      data.DiaChiLienHe = address;
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({ success: false, message: 'Khong co thong tin hop le de cap nhat' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.SINHVIEN.update({
        where: { MaSv: student.MaSv },
        data: {
          ...data,
          NguoiCapNhat: account.MaTaiKhoan,
          NgayCapNhat: new Date()
        },
        select: studentInfoSelect
      });

      if (data.Sdt !== undefined) {
        await tx.TAIKHOAN.update({
          where: { MaTaiKhoan: account.MaTaiKhoan },
          data: { Sdt: data.Sdt, NgayCapNhat: new Date() },
          select: { MaTaiKhoan: true }
        });
      }

      return row;
    });

    res.json({
      success: true,
      message: 'Cap nhat ho so ca nhan thanh cong',
      data: { student: updated }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Khong the cap nhat ho so ca nhan', 'Update student profile error:');
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui long chon anh dai dien' });
    }

    const userId = Number(req.user.id || req.user.MaTaiKhoan || 0);
    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: userId },
      select: {
        MaTaiKhoan: true,
        Role: true,
        MaSv: true
      }
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Khong tim thay tai khoan' });
    }

    const uploadResult = await uploadAvatarBuffer(req.file.buffer, {
      publicId: `${account.Role || 'user'}-${account.MaTaiKhoan}`
    });
    const avatarUrl = uploadResult.secure_url || uploadResult.url;

    await prisma.$transaction(async (tx) => {
      await tx.TAIKHOAN.update({
        where: { MaTaiKhoan: account.MaTaiKhoan },
        data: { AnhDaiDien: avatarUrl, NgayCapNhat: new Date() },
        select: { MaTaiKhoan: true }
      });

      if (account.Role === 'student') {
        await tx.SINHVIEN.updateMany({
          where: {
            OR: [
              { MaTaiKhoan: account.MaTaiKhoan },
              ...(account.MaSv ? [{ MaSv: account.MaSv }] : [])
            ]
          },
          data: {
            AnhDaiDien: avatarUrl,
            NguoiCapNhat: account.MaTaiKhoan,
            NgayCapNhat: new Date()
          }
        });
      } else if (account.Role === 'admin') {
        await tx.QUANTRIVIEN.updateMany({
          where: { MaTaiKhoan: account.MaTaiKhoan },
          data: { AnhDaiDien: avatarUrl, NgayCapNhat: new Date() }
        });
      }
    });

    res.json({
      success: true,
      message: 'Cap nhat anh dai dien thanh cong',
      data: {
        avatarUrl,
        publicId: uploadResult.public_id
      }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    if (error.code === 'CLOUDINARY_NOT_CONFIGURED') {
      const missing = Array.isArray(error.missing) && error.missing.length
        ? ` Thiếu: ${error.missing.join(', ')}.`
        : '';
      return res.status(500).json({
        success: false,
        message: `Chua cau hinh du CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY va CLOUDINARY_API_SECRET.${missing}`
      });
    }
    return sendErrorResponse(res, error, getCloudinaryUploadErrorMessage(error));
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id || req.user.MaTaiKhoan;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui long nhap day du thong tin'
      });
    }

    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: userId },
      select: { MatKhau: true }
    });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay nguoi dung'
      });
    }

    const isValid = await bcrypt.compare(currentPassword, account.MatKhau);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Mat khau hien tai khong dung'
      });
    }

    await prisma.TAIKHOAN.update({
      where: { MaTaiKhoan: userId },
      data: { MatKhau: await hashPassword(newPassword), NgayCapNhat: new Date() },
      select: { MaTaiKhoan: true }
    });

    res.json({ success: true, message: 'Doi mat khau thanh cong' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Change password error:');
  }
};

module.exports = {
  login,
  loginStudent,
  loginAdmin,
  forgotPassword,
  resetPassword,
  getMe,
  updateStudentProfile,
  uploadAvatar,
  changePassword
};
