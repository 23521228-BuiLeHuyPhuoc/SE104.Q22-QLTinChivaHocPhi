const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const prisma = require('../config/database');
const { isSystemAdminUser } = require('../middleware/auth');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { filterRowsByRegex, paginateRows } = require('../utils/searchRegex');
const { sendErrorResponse } = require('../utils/errorHandler');

const normalize = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const isStudentGroup = (MaNhom) => normalize(MaNhom).toUpperCase() === 'SINHVIEN';
const roleFromGroup = (MaNhom) => (isStudentGroup(MaNhom) ? 'student' : 'admin');
const DEFAULT_ACCOUNT_PASSWORD = process.env.DEFAULT_ACCOUNT_PASSWORD || '123456';
const RANDOM_STUDENT_PASSWORD_LENGTH = Math.max(8, Number(process.env.STUDENT_RANDOM_PASSWORD_LENGTH || 10));
const ACCOUNT_SEARCH_FIELDS = new Set(['all', 'TenDangNhap', 'HoTen', 'Email', 'MaSv']);

const getCurrentUserId = (user) => Number(user?.id || user?.MaTaiKhoan || 0) || null;

const normalizeAccountSearchField = (value) => {
  const field = normalize(value) || 'all';
  return ACCOUNT_SEARCH_FIELDS.has(field) ? field : 'all';
};

const getAccountSearchValues = (row, searchField) => {
  const field = normalizeAccountSearchField(searchField);
  const values = {
    TenDangNhap: [row.TenDangNhap, row.TAIKHOAN?.TenDangNhap],
    HoTen: [row.HoTen, row.TAIKHOAN?.HoTen],
    Email: [row.Email, row.TAIKHOAN?.Email],
    MaSv: [row.MaSv, row.TAIKHOAN?.MaSv]
  };
  return field === 'all' ? Object.values(values).flat() : (values[field] || []);
};

const generateRandomPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < RANDOM_STUDENT_PASSWORD_LENGTH; i += 1) {
    password += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return password;
};

const truncateText = (value, maxLength) => {
  const text = normalize(value);
  return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
};

const createMailer = () => {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
};

const sendStudentCredentialEmail = async (transporter, credential) => {
  if (!credential.Email) {
    return { TrangThaiGuiEmail: 'missing_email', LoiGuiEmail: 'Sinh viên chưa có email' };
  }
  if (!transporter) {
    return { TrangThaiGuiEmail: 'not_configured', LoiGuiEmail: 'Chưa cấu hình SMTP để gửi Gmail' };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com',
      to: credential.Email,
      subject: 'Tài khoản hệ thống đăng ký môn học và học phí',
      text: [
        `Xin chào ${credential.HoTen || credential.MaSv},`,
        '',
        'Tài khoản sinh viên của bạn đã được tạo.',
        `Tên đăng nhập: ${credential.TenDangNhap}`,
        `Mật khẩu: ${credential.MatKhauTam}`,
        '',
        'Vui lòng đăng nhập và đổi mật khẩu sau khi sử dụng lần đầu.'
      ].join('\n'),
      html: `
        <p>Xin chào ${credential.HoTen || credential.MaSv},</p>
        <p>Tài khoản sinh viên của bạn đã được tạo.</p>
        <p><strong>Tên đăng nhập:</strong> ${credential.TenDangNhap}</p>
        <p><strong>Mật khẩu:</strong> ${credential.MatKhauTam}</p>
        <p>Vui lòng đăng nhập và đổi mật khẩu sau khi sử dụng lần đầu.</p>
      `
    });
    return { TrangThaiGuiEmail: 'sent', LoiGuiEmail: null };
  } catch (error) {
    return { TrangThaiGuiEmail: 'failed', LoiGuiEmail: truncateText(error.message, 300) };
  }
};

const updateCredentialEmailStatus = async (id, status) => {
  if (!id) return status;
  await prisma.MATKHAUTAMTAIKHOAN.update({
    where: { id },
    data: status,
    select: { id: true }
  }).catch(() => null);
  return status;
};

const adminTitleFromGroup = (group) => {
  const MaNhom = normalize(group?.MaNhom).toUpperCase();
  const TenNhom = normalize(group?.TenNhom);
  if (MaNhom === 'ADMIN' || MaNhom.includes('HE_THONG') || MaNhom.includes('SYSTEM')) {
    return 'Admin hệ thống';
  }
  if (!TenNhom) return 'Quản trị viên';
  const lower = TenNhom.toLowerCase();
  if (lower.includes('admin') || lower.includes('quản trị') || lower.includes('quan tri')) {
    return TenNhom;
  }
  return `Quản trị viên ${TenNhom}`;
};

const getTargetGroup = async (body) => {
  const requestedGroup = normalize(body.MaNhom || body.maNhom || body.group || body.Group);
  const requestedRole = normalize(body.Role || body.role);
  const MaNhom = requestedGroup || (requestedRole === 'student' ? 'SINHVIEN' : requestedRole === 'admin' ? 'ADMIN' : '');
  if (!MaNhom) return null;

  return prisma.NHOMNGUOIDUNG.findFirst({
    where: { MaNhom, DaXoa: false },
    select: { MaNhom: true, TenNhom: true }
  });
};

const getCreatableGroups = async (user) => {
  const groups = await prisma.NHOMNGUOIDUNG.findMany({
    where: { DaXoa: false },
    orderBy: { MaNhom: 'asc' },
    select: { MaNhom: true, TenNhom: true }
  });

  if (isSystemAdminUser(user)) return groups;

  const ownGroup = normalize(user?.MaNhom).toUpperCase();
  const allowed = new Set(['SINHVIEN']);
  if (ownGroup) allowed.add(ownGroup);
  return groups.filter((group) => allowed.has(normalize(group.MaNhom).toUpperCase()));
};

const canCreateGroup = async (user, targetGroup) => {
  const allowedGroups = await getCreatableGroups(user);
  return allowedGroups.some((group) => group.MaNhom === targetGroup.MaNhom);
};

const toRoleOption = (group) => ({
  Role: roleFromGroup(group.MaNhom),
  MaNhom: group.MaNhom,
  ten_vai_tro: group.TenNhom,
  MoTa: isStudentGroup(group.MaNhom) ? 'Tài khoản sinh viên' : 'Tài khoản quản trị',
  isAdmin: !isStudentGroup(group.MaNhom)
});

const getAllRoles = async (req, res) => {
  try {
    const groups = await getCreatableGroups(req.user);
    res.json({ success: true, data: groups.map(toRoleOption) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get all roles error:');
  }
};

const getMyRole = async (req, res) => {
  try {
    const group = await prisma.NHOMNGUOIDUNG.findUnique({
      where: { MaNhom: req.user.MaNhom || (req.user.Role === 'admin' ? 'ADMIN' : 'SINHVIEN') }
    });
    const fallback = {
      MaNhom: req.user.MaNhom,
      TenNhom: req.user.Role === 'admin' ? 'Quản trị viên' : 'Sinh viên'
    };
    res.json({ success: true, data: toRoleOption(group || fallback) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get my role error:');
  }
};

const getAllAccounts = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query);
    const { search, searchField, Role: filterRole, role, MaNhom } = req.query;
    const where = {};
    const allowedGroups = await getCreatableGroups(req.user);
    const allowedGroupCodes = allowedGroups.map((group) => group.MaNhom);

    if (MaNhom && !allowedGroupCodes.includes(MaNhom)) {
      return res.json({ success: true, data: [], pagination: getPaginationMeta(0, page, limit) });
    }

    const roleFilter = filterRole || role;
    if (roleFilter && ['admin', 'student'].includes(roleFilter)) where.Role = roleFilter;
    where.MaNhom = MaNhom || { in: allowedGroupCodes };

    const rows = await prisma.TAIKHOAN.findMany({
      where,
      orderBy: { NgayTao: 'desc' },
      select: {
        MaTaiKhoan: true,
        TenDangNhap: true,
        Role: true,
        MaNhom: true,
        NgayTao: true,
        HoTen: true,
        Email: true,
        MaSv: true,
        TrangThai: true,
        QUANTRIVIEN: { select: { ChucVu: true, PhongBan: true } }
      }
    });
    const filtered = filterRowsByRegex(rows, search, (row) => getAccountSearchValues(row, searchField));
    const pageRows = paginateRows(filtered, page, limit);

    res.json({
      success: true,
      data: pageRows,
      pagination: getPaginationMeta(filtered.length, page, limit)
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'L?i server', 'Get all accounts error:');
  }
};

const createAccount = async (req, res) => {
  try {
    const targetGroup = await getTargetGroup(req.body);
    if (!targetGroup) {
      return res.status(400).json({ success: false, message: 'Nhóm người dùng không hợp lệ' });
    }

    if (!(await canCreateGroup(req.user, targetGroup))) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo tài khoản ở nhóm này'
      });
    }

    const targetRole = roleFromGroup(targetGroup.MaNhom);
    const rawPassword = String(req.body.password || req.body.MatKhau || '');
    const confirmPassword = String(req.body.passwordConfirm || req.body.confirmPassword || req.body.XacNhanMatKhau || '');
    if (rawPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    if (confirmPassword && confirmPassword !== rawPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp' });
    }

    const currentUserId = getCurrentUserId(req.user);
    const hashed = await bcrypt.hash(rawPassword, 10);

    if (targetRole === 'student') {
      const MaSv = normalize(req.body.MaSv || req.body.maSv);
      if (!MaSv) {
        return res.status(400).json({ success: false, message: 'Tạo tài khoản sinh viên bắt buộc nhập MSSV' });
      }

      const student = await prisma.SINHVIEN.findFirst({
        where: { MaSv, DaXoa: false },
        select: {
          MaSv: true,
          MaTaiKhoan: true,
          HoTen: true,
          Email: true,
          Sdt: true,
          AnhDaiDien: true
        }
      });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên để liên kết tài khoản' });
      }
      if (student.MaTaiKhoan) {
        return res.status(400).json({ success: false, message: 'Sinh viên này đã có tài khoản liên kết' });
      }

      const existingStudentAccount = await prisma.TAIKHOAN.findFirst({
        where: { MaSv },
        select: { MaTaiKhoan: true }
      });
      if (existingStudentAccount) {
        return res.status(400).json({ success: false, message: 'MSSV này đã được gán với tài khoản khác' });
      }

      const username = normalize(req.body.username || req.body.TenDangNhap || MaSv);
      const email = normalizeEmail(req.body.Email || req.body.email || student.Email);
      const existing = await prisma.TAIKHOAN.findFirst({
        where: {
          OR: [
            { TenDangNhap: username },
            ...(email ? [{ Email: { equals: email, mode: 'insensitive' } }] : [])
          ]
        },
        select: { MaTaiKhoan: true }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc email đã tồn tại' });
      }

      const studentAccountResult = await prisma.$transaction(async (tx) => {
        const created = await tx.TAIKHOAN.create({
          data: {
            TenDangNhap: username,
            MatKhau: hashed,
            Role: 'student',
            MaNhom: targetGroup.MaNhom,
            MaSv: student.MaSv,
            HoTen: student.HoTen,
            Email: email || null,
            Sdt: normalize(req.body.Sdt || req.body.phone || student.Sdt) || null,
            AnhDaiDien: student.AnhDaiDien || null,
            TrangThai: true,
            TrangThaiDuyet: 'approved',
            NgayDuyet: new Date(),
            NguoiDuyet: currentUserId
          },
          select: {
            MaTaiKhoan: true,
            TenDangNhap: true,
            Role: true,
            MaNhom: true,
            MaSv: true,
            HoTen: true,
            Email: true
          }
        });

        await tx.SINHVIEN.update({
          where: { MaSv: student.MaSv },
          data: {
            MaTaiKhoan: created.MaTaiKhoan,
            NguoiCapNhat: currentUserId,
            NgayCapNhat: new Date()
          },
          select: { MaSv: true }
        });

        const credential = await tx.MATKHAUTAMTAIKHOAN.create({
          data: {
            MaTaiKhoan: created.MaTaiKhoan,
            MaSv: student.MaSv,
            TenDangNhap: created.TenDangNhap,
            MatKhauTam: rawPassword,
            Email: email || null,
            TrangThaiGuiEmail: 'pending',
            NguoiTao: currentUserId
          },
          select: { id: true }
        });

        return { account: created, credentialId: credential.id };
      });

      const emailStatus = await updateCredentialEmailStatus(
        studentAccountResult.credentialId,
        await sendStudentCredentialEmail(createMailer(), {
          ...student,
          Email: email || student.Email,
          TenDangNhap: studentAccountResult.account.TenDangNhap,
          MatKhauTam: rawPassword
        })
      );

      return res.status(201).json({
        success: true,
        message: 'Tạo tài khoản sinh viên thành công',
        data: {
          ...studentAccountResult.account,
          temporaryPassword: rawPassword,
          emailStatus: emailStatus.TrangThaiGuiEmail,
          emailError: emailStatus.LoiGuiEmail
        }
      });
    }

    const username = normalize(req.body.username || req.body.TenDangNhap);
    const HoTen = normalize(req.body.HoTen || req.body.fullName);
    const Email = normalizeEmail(req.body.Email || req.body.email);
    const Sdt = normalize(req.body.Sdt || req.body.phone);
    const ChucVu = normalize(req.body.ChucVu) || adminTitleFromGroup(targetGroup);
    const PhongBan = normalize(req.body.PhongBan);

    if (!username || !HoTen) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và họ tên' });
    }

    const existing = await prisma.TAIKHOAN.findFirst({
      where: {
        OR: [
          { TenDangNhap: username },
          ...(Email ? [{ Email: { equals: Email, mode: 'insensitive' } }] : [])
        ]
      },
      select: { MaTaiKhoan: true }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc email đã tồn tại' });
    }

    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.TAIKHOAN.create({
        data: {
          TenDangNhap: username,
          MatKhau: hashed,
          Role: 'admin',
          MaNhom: targetGroup.MaNhom,
          HoTen,
          Email: Email || null,
          Sdt: Sdt || null,
          TrangThai: true,
          TrangThaiDuyet: 'approved',
          NgayDuyet: new Date(),
          NguoiDuyet: currentUserId
        },
        select: {
          MaTaiKhoan: true,
          TenDangNhap: true,
          Role: true,
          MaNhom: true,
          HoTen: true,
          Email: true
        }
      });

      await tx.QUANTRIVIEN.create({
        data: {
          MaTaiKhoan: created.MaTaiKhoan,
          HoTen,
          Email: Email || null,
          Sdt: Sdt || null,
          ChucVu,
          PhongBan: PhongBan || null,
          TrangThai: true
        }
      });

      return created;
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản admin thành công',
      data: account
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Tài khoản đã tồn tại hoặc dữ liệu bị trùng' });
    }
        return sendErrorResponse(res, error, 'Lỗi server', 'Create account error:');
  }
};

const resetPassword = async (req, res) => {
  try {
    const accountId = Number(req.params.id);
    if (!Number.isInteger(accountId) || accountId <= 0) {
      return res.status(400).json({ success: false, message: 'Tài khoản không hợp lệ' });
    }

    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: accountId },
      select: { MaTaiKhoan: true, TenDangNhap: true }
    });
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

    const password = normalize(req.body.password || req.body.defaultPassword) || DEFAULT_ACCOUNT_PASSWORD;
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mặc định phải có ít nhất 6 ký tự' });
    }

    await prisma.TAIKHOAN.update({
      where: { MaTaiKhoan: accountId },
      data: {
        MatKhau: await bcrypt.hash(password, 10),
        RefreshToken: null,
        NgayCapNhat: new Date()
      }
    });

    res.json({
      success: true,
      message: `Đã reset mật khẩu cho ${account.TenDangNhap}`,
      data: { defaultPassword: password }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Reset password error:');
  }
};

const batchCreateStudentAccounts = async (req, res) => {
  try {
    const MaNganh = normalize(req.body.MaNganh || req.body.major);
    const MaKhoa = normalize(req.body.MaKhoa || req.body.faculty);

    if (!MaNganh && !MaKhoa) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn khoa hoặc ngành để tạo tài khoản sinh viên hàng loạt' });
    }

    const studentWhere = { DaXoa: false };
    if (MaNganh) studentWhere.MaNganh = MaNganh;
    if (MaKhoa) studentWhere.NGANHHOC = { MaKhoa };

    const [studentGroup, students] = await Promise.all([
      prisma.NHOMNGUOIDUNG.findFirst({ where: { MaNhom: 'SINHVIEN', DaXoa: false }, select: { MaNhom: true } }),
      prisma.SINHVIEN.findMany({
        where: studentWhere,
        orderBy: { MaSv: 'asc' },
        select: {
          MaSv: true,
          MaTaiKhoan: true,
          HoTen: true,
          Email: true,
          Sdt: true,
          AnhDaiDien: true,
          NGANHHOC: { select: { MaNganh: true, TenNganh: true, KHOA: { select: { MaKhoa: true, TenKhoa: true } } } }
        }
      })
    ]);

    if (!studentGroup) return res.status(400).json({ success: false, message: 'Không tìm thấy nhóm SINHVIEN' });
    if (!students.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên phù hợp' });

    const currentUserId = getCurrentUserId(req.user);
    const result = await prisma.$transaction(async (tx) => {
      const created = [];
      const skipped = [];

      for (const student of students) {
        if (student.MaTaiKhoan) {
          skipped.push({ MaSv: student.MaSv, reason: 'Sinh viên đã có tài khoản liên kết' });
          continue;
        }

        const existing = await tx.TAIKHOAN.findFirst({
          where: { OR: [{ TenDangNhap: student.MaSv }, { MaSv: student.MaSv }] },
          select: { MaTaiKhoan: true }
        });
        if (existing) {
          skipped.push({ MaSv: student.MaSv, reason: 'Tài khoản đã tồn tại' });
          continue;
        }

        const password = generateRandomPassword();
        const hashed = await bcrypt.hash(password, 10);
        const account = await tx.TAIKHOAN.create({
          data: {
            TenDangNhap: student.MaSv,
            MatKhau: hashed,
            Role: 'student',
            MaNhom: studentGroup.MaNhom,
            MaSv: student.MaSv,
            HoTen: student.HoTen,
            Email: student.Email || null,
            Sdt: student.Sdt || null,
            AnhDaiDien: student.AnhDaiDien || null,
            TrangThai: true,
            TrangThaiDuyet: 'approved',
            NgayDuyet: new Date(),
            NguoiDuyet: currentUserId
          },
          select: { MaTaiKhoan: true, TenDangNhap: true, MaSv: true, HoTen: true, Email: true }
        });

        await tx.SINHVIEN.update({
          where: { MaSv: student.MaSv },
          data: { MaTaiKhoan: account.MaTaiKhoan, NguoiCapNhat: currentUserId, NgayCapNhat: new Date() }
        });
        const credential = await tx.MATKHAUTAMTAIKHOAN.create({
          data: {
            MaTaiKhoan: account.MaTaiKhoan,
            MaSv: student.MaSv,
            TenDangNhap: account.TenDangNhap,
            MatKhauTam: password,
            Email: student.Email || null,
            TrangThaiGuiEmail: 'pending',
            NguoiTao: currentUserId
          },
          select: { id: true }
        });

        created.push({
          ...account,
          HoTen: student.HoTen,
          Email: student.Email || null,
          MatKhauTam: password,
          credentialId: credential.id,
          TenNganh: student.NGANHHOC?.TenNganh || '',
          TenKhoa: student.NGANHHOC?.KHOA?.TenKhoa || ''
        });
      }

      return { created, skipped };
    });

    const transporter = createMailer();
    const createdWithEmail = [];
    for (const credential of result.created) {
      const emailStatus = await updateCredentialEmailStatus(
        credential.credentialId,
        await sendStudentCredentialEmail(transporter, credential)
      );
      createdWithEmail.push({
        ...credential,
        emailStatus: emailStatus.TrangThaiGuiEmail,
        emailError: emailStatus.LoiGuiEmail
      });
    }

    const sentCount = createdWithEmail.filter((item) => item.emailStatus === 'sent').length;

    res.status(201).json({
      success: true,
      message: `Đã tạo ${result.created.length} tài khoản sinh viên`,
      data: {
        createdCount: result.created.length,
        skippedCount: result.skipped.length,
        emailSentCount: sentCount,
        created: createdWithEmail,
        skipped: result.skipped,
        passwordMode: 'random'
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Có tài khoản sinh viên bị trùng dữ liệu' });
    }
        return sendErrorResponse(res, error, 'Lỗi server', 'Batch create student accounts error:');
  }
};

const getTemporaryStudentCredentials = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query);
    const { search, searchField } = req.query;
    const where = {};

    const rows = await prisma.MATKHAUTAMTAIKHOAN.findMany({
      where,
      orderBy: { NgayTao: 'desc' },
      select: {
        id: true,
        MaTaiKhoan: true,
        MaSv: true,
        TenDangNhap: true,
        MatKhauTam: true,
        Email: true,
        TrangThaiGuiEmail: true,
        LoiGuiEmail: true,
        NgayTao: true,
        TAIKHOAN: { select: { HoTen: true, Email: true, MaSv: true, TenDangNhap: true } }
      }
    });
    const filtered = filterRowsByRegex(rows, search, (row) => getAccountSearchValues(row, searchField));
    const pageRows = paginateRows(filtered, page, limit);

    res.json({
      success: true,
      data: pageRows.map((row) => ({
        id: row.id,
        MaTaiKhoan: row.MaTaiKhoan,
        MaSv: row.MaSv,
        HoTen: row.TAIKHOAN?.HoTen || '',
        TenDangNhap: row.TenDangNhap,
        MatKhauTam: row.MatKhauTam,
        Email: row.Email || row.TAIKHOAN?.Email || '',
        TrangThaiGuiEmail: row.TrangThaiGuiEmail,
        LoiGuiEmail: row.LoiGuiEmail,
        NgayTao: row.NgayTao
      })),
      pagination: getPaginationMeta(filtered.length, page, limit)
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'L?i server', 'Get temporary student credentials error:');
  }
};

const deleteAccount = async (req, res) => {
  try {
    const accountId = Number(req.params.id);
    const currentUserId = Number(req.user.id || req.user.MaTaiKhoan || 0);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return res.status(400).json({ success: false, message: 'Tài khoản không hợp lệ' });
    }
    if (accountId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản đang đăng nhập' });
    }

    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: accountId },
      select: {
        MaTaiKhoan: true,
        TenDangNhap: true,
        Role: true,
        MaSv: true
      }
    });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.THONGBAO.deleteMany({ where: { MaTaiKhoanNhan: accountId } });
      await tx.THONGBAO.updateMany({ where: { NguoiTao: accountId }, data: { NguoiTao: null } });
      await tx.THONGBAO.updateMany({ where: { NguoiCapNhat: accountId }, data: { NguoiCapNhat: null } });
      await tx.THONGBAO.updateMany({ where: { NguoiXoa: accountId }, data: { NguoiXoa: null } });
      await tx.MONDAHOC.updateMany({ where: { NguoiCapNhat: accountId }, data: { NguoiCapNhat: null } });
      await tx.TAIKHOAN.updateMany({ where: { NguoiDuyet: accountId }, data: { NguoiDuyet: null } });
      await tx.SINHVIEN.updateMany({
        where: { MaTaiKhoan: accountId },
        data: {
          MaTaiKhoan: null,
          NguoiCapNhat: currentUserId || null,
          NgayCapNhat: new Date()
        }
      });
      await tx.QUANTRIVIEN.deleteMany({ where: { MaTaiKhoan: accountId } });
      await tx.TAIKHOAN.delete({ where: { MaTaiKhoan: accountId } });
    });

    res.json({
      success: true,
      message: `Đã xóa tài khoản ${account.TenDangNhap}`
    });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản vì còn dữ liệu liên kết'
      });
    }
        return sendErrorResponse(res, error, 'Lỗi server', 'Delete account error:');
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id || req.user.MaTaiKhoan;
    if (parseInt(id, 10) === parseInt(currentUserId, 10)) {
      return res.status(400).json({ success: false, message: 'Không thể thay đổi nhóm của chính mình' });
    }

    const targetGroup = await getTargetGroup(req.body);
    if (!targetGroup) {
      return res.status(400).json({ success: false, message: 'Nhóm người dùng không hợp lệ' });
    }

    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: parseInt(id, 10) },
      select: {
        MaTaiKhoan: true,
        TenDangNhap: true,
        Role: true,
        MaNhom: true,
        HoTen: true,
        Email: true,
        Sdt: true
      }
    });
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    if (account.MaNhom === targetGroup.MaNhom) {
      return res.status(400).json({ success: false, message: `Tài khoản đã thuộc nhóm ${targetGroup.TenNhom}` });
    }

    const newRole = roleFromGroup(targetGroup.MaNhom);
    await prisma.$transaction(async (tx) => {
      await tx.TAIKHOAN.update({
        where: { MaTaiKhoan: account.MaTaiKhoan },
        data: { Role: newRole, MaNhom: targetGroup.MaNhom, NgayCapNhat: new Date() },
        select: { MaTaiKhoan: true }
      });

      if (newRole === 'admin') {
        await tx.QUANTRIVIEN.upsert({
          where: { MaTaiKhoan: account.MaTaiKhoan },
          create: {
            MaTaiKhoan: account.MaTaiKhoan,
            HoTen: account.HoTen || account.TenDangNhap,
            Email: account.Email || null,
            Sdt: account.Sdt || null,
            ChucVu: adminTitleFromGroup(targetGroup),
            TrangThai: true
          },
          update: {
            HoTen: account.HoTen || account.TenDangNhap,
            Email: account.Email || null,
            Sdt: account.Sdt || null,
            ChucVu: adminTitleFromGroup(targetGroup),
            TrangThai: true,
            NgayCapNhat: new Date()
          }
        });
      } else {
        await tx.QUANTRIVIEN.deleteMany({ where: { MaTaiKhoan: account.MaTaiKhoan } });
      }
    });

    res.json({
      success: true,
      message: `Đã chuyển tài khoản sang nhóm "${targetGroup.TenNhom}"`,
      data: {
        MaTaiKhoan: account.MaTaiKhoan,
        old_role: account.Role,
        old_group: account.MaNhom,
        new_role: newRole,
        MaNhom: targetGroup.MaNhom,
        TenNhom: targetGroup.TenNhom
      }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Update user role error:');
  }
};

module.exports = { getAllRoles, getMyRole, getAllAccounts, createAccount, resetPassword, batchCreateStudentAccounts, getTemporaryStudentCredentials, deleteAccount, updateUserRole };
