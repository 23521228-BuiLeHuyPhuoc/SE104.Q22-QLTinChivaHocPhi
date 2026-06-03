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
const MIN_PASSWORD_LENGTH = 6;

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
  },
  DOITUONGSINHVIEN: {
    select: {
      id: true,
      MaDoiTuong: true,
      GhiChu: true,
      DOITUONG: {
        select: {
          MaDoiTuong: true,
          TenDoiTuong: true,
          TiLeGiamHocPhi: true,
          DoUuTien: true,
          MoTa: true,
          TrangThai: true
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
  return 'Lỗi máy chủ';
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
    return { success: false, message: 'Mã OTP không hợp lệ hoặc đã hết hạn' };
  }

  const attempts = Number(payload.attempts || 0);
  if (attempts >= RESET_OTP_MAX_ATTEMPTS) {
    await redisClient.deleteKey(key).catch(() => null);
    return { success: false, message: 'Mã OTP đã bị khóa do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.' };
  }

  if (payload.otpHash !== hashResetOtp(accountId, otp)) {
    const nextAttempts = attempts + 1;
    if (nextAttempts >= RESET_OTP_MAX_ATTEMPTS) {
      await redisClient.deleteKey(key).catch(() => null);
      return { success: false, message: 'Mã OTP đã bị khóa do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.' };
    }

    const ttlSeconds = Math.max(1, Math.ceil((Number(payload.expiresAt) - Date.now()) / 1000));
    await redisClient.setJson(key, { ...payload, attempts: nextAttempts }, ttlSeconds);
    return { success: false, message: 'Mã OTP không đúng' };
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
        AnhDaiDien: true,
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
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập hoặc email' });
    }

    const account = await findResetAccount(identifier, role);
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
      message: `Đã gửi mã OTP đặt lại mật khẩu. Mã có hiệu lực trong ${RESET_OTP_TTL_MINUTES} phut.`,
      data: {
        resetPath: getResetPath(account)
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (error.message === 'SMTP_NOT_CONFIGURED') {
      return res.status(500).json({ success: false, message: 'Chưa cấu hình SMTP để gửi email đặt lại mật khẩu' });
    }
    if (isRedisConnectionError(error)) {
      return res.status(500).json({ success: false, message: getRedisUnavailableMessage() });
    }
    return sendErrorResponse(res, error, 'Lỗi máy chủ');
  }
};

const resetPassword = async (req, res) => {
  try {
    const identifier = normalize(req.body.identifier || req.body.username || req.body.email);
    const role = normalize(req.body.role);
    const otp = normalizeOtp(req.body.otp || req.body.code);
    const { newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản, mã OTP và mật khẩu mới' });
    }
    if (!/^\d+$/.test(otp) || otp.length !== RESET_OTP_LENGTH) {
      return res.status(400).json({ success: false, message: `Mã OTP phải gồm ${RESET_OTP_LENGTH} chữ số` });
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, message: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự` });
    }

    const account = await findResetAccount(identifier, role);
    if (!account || account.TrangThai === false || account.TrangThaiDuyet !== 'approved') {
      return res.status(400).json({ success: false, message: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
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

    res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (isRedisConnectionError(error)) {
      return res.status(500).json({ success: false, message: getRedisUnavailableMessage() });
    }
    return sendErrorResponse(res, error, 'Lỗi máy chủ');
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
          AnhDaiDien: adminInfo?.AnhDaiDien || studentInfo?.AnhDaiDien || user.AnhDaiDien || null,
          created_at: user.NgayTao
        },
        student: studentInfo,
        admin: adminInfo
      }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'GetMe error:');
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    if ((req.user.Role || req.user.role) !== 'student') {
      return res.status(403).json({ success: false, message: 'Chỉ sinh viên mới được cập nhật hồ sơ cá nhân' });
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
        message: `${forbiddenFields[blocked]} không được phép chỉnh sửa`
      });
    }

    const userId = Number(req.user.id || req.user.MaTaiKhoan || 0);
    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: userId },
      select: { MaTaiKhoan: true, MaSv: true }
    });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
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
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sinh viên' });
    }

    const data = {};
    if (req.body.Sdt !== undefined) data.Sdt = normalize(req.body.Sdt) || null;
    if (req.body.GioiTinh !== undefined) {
      const gender = normalize(req.body.GioiTinh);
      const validGenders = ['', 'Nam', 'Nữ', 'Nu', 'Khác', 'Khac'];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({ success: false, message: 'Giới tính không hợp lệ' });
      }
      data.GioiTinh = gender === 'Nu' ? 'Nữ' : gender === 'Khac' ? 'Khác' : gender;
    }
    if (req.body.DiaChiLienHe !== undefined) {
      const address = normalize(req.body.DiaChiLienHe);
      if (!address) {
        return res.status(400).json({ success: false, message: 'Địa chỉ liên hệ không được để trống' });
      }
      data.DiaChiLienHe = address;
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({ success: false, message: 'Không có thông tin hợp lệ để cập nhật' });
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
      message: 'Cập nhật hồ sơ cá nhân thành công',
      data: { student: updated }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Không thể cập nhật hồ sơ cá nhân', 'Update student profile error:');
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    if ((req.user.Role || req.user.role) !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ quản trị viên mới được cập nhật hồ sơ quản trị' });
    }

    const allowedFields = new Set(['HoTen', 'Email', 'Sdt', 'PhongBan']);
    const blocked = Object.keys(req.body || {}).find((key) => !allowedFields.has(key));
    if (blocked) {
      return res.status(400).json({ success: false, message: 'Trường này không được phép chỉnh sửa trong hồ sơ quản trị viên' });
    }

    const data = {};
    if (req.body.HoTen !== undefined) {
      data.HoTen = normalize(req.body.HoTen);
      if (!data.HoTen) return res.status(400).json({ success: false, message: 'Họ tên không được để trống' });
    }
    if (req.body.Email !== undefined) {
      data.Email = normalizeEmail(req.body.Email);
      if (!data.Email) return res.status(400).json({ success: false, message: 'Email không được để trống' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) {
        return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
      }
    }
    if (req.body.Sdt !== undefined) data.Sdt = normalize(req.body.Sdt) || null;
    if (req.body.PhongBan !== undefined) data.PhongBan = normalize(req.body.PhongBan) || null;

    if (!Object.keys(data).length) {
      return res.status(400).json({ success: false, message: 'Không có thông tin hợp lệ để cập nhật' });
    }

    const userId = Number(req.user.id || req.user.MaTaiKhoan || 0);
    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: userId },
      select: {
        MaTaiKhoan: true,
        TenDangNhap: true,
        Role: true,
        HoTen: true,
        Email: true,
        Sdt: true,
        QUANTRIVIEN: true
      }
    });
    if (!account || account.Role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ quản trị viên' });
    }

    if (data.Email) {
      const duplicate = await prisma.TAIKHOAN.findFirst({
        where: {
          MaTaiKhoan: { not: account.MaTaiKhoan },
          Email: { equals: data.Email, mode: 'insensitive' }
        },
        select: { MaTaiKhoan: true }
      });
      if (duplicate) return res.status(400).json({ success: false, message: 'Email đã được sử dụng bởi tài khoản khác' });
    }

    const accountData = {};
    if (Object.prototype.hasOwnProperty.call(data, 'HoTen')) accountData.HoTen = data.HoTen;
    if (Object.prototype.hasOwnProperty.call(data, 'Email')) accountData.Email = data.Email;
    if (Object.prototype.hasOwnProperty.call(data, 'Sdt')) accountData.Sdt = data.Sdt;

    const adminData = {};
    ['HoTen', 'Email', 'Sdt', 'PhongBan'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(data, field)) adminData[field] = data[field];
    });

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(accountData).length) {
        await tx.TAIKHOAN.update({
          where: { MaTaiKhoan: account.MaTaiKhoan },
          data: { ...accountData, NgayCapNhat: new Date() },
          select: { MaTaiKhoan: true }
        });
      }

      return tx.QUANTRIVIEN.upsert({
        where: { MaTaiKhoan: account.MaTaiKhoan },
        create: {
          MaTaiKhoan: account.MaTaiKhoan,
          HoTen: data.HoTen || account.HoTen || account.TenDangNhap,
          Email: Object.prototype.hasOwnProperty.call(data, 'Email') ? data.Email : account.Email,
          Sdt: Object.prototype.hasOwnProperty.call(data, 'Sdt') ? data.Sdt : account.Sdt,
          PhongBan: Object.prototype.hasOwnProperty.call(data, 'PhongBan') ? data.PhongBan : null,
          ChucVu: account.QUANTRIVIEN?.ChucVu || req.user.ChucVu || 'Quản trị viên',
          TrangThai: true,
          NgayCapNhat: new Date()
        },
        update: { ...adminData, NgayCapNhat: new Date() }
      });
    });

    res.json({
      success: true,
      message: 'Cập nhật hồ sơ quản trị viên thành công',
      data: { admin: updated }
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Không thể cập nhật hồ sơ quản trị viên', 'Update admin profile error:');
  }
};

const updateProfile = (req, res) => {
  if ((req.user.Role || req.user.role) === 'admin') return updateAdminProfile(req, res);
  return updateStudentProfile(req, res);
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh đại diện' });
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
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
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
      message: 'Cập nhật ảnh đại diện thành công',
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
        message: `Chưa cấu hình đủ CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET.${missing}`
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
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`
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
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Change password error:');
  }
};

module.exports = {
  login,
  loginStudent,
  loginAdmin,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  updateStudentProfile,
  updateAdminProfile,
  uploadAvatar,
  changePassword
};
