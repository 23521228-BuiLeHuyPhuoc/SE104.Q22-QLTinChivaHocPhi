const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { isSystemAdminUser } = require('../middleware/auth');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

const normalize = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const isStudentGroup = (MaNhom) => normalize(MaNhom).toUpperCase() === 'SINHVIEN';
const roleFromGroup = (MaNhom) => (isStudentGroup(MaNhom) ? 'student' : 'admin');

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
    console.error('Get all roles error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
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
    console.error('Get my role error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getAllAccounts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, Role: filterRole, role, MaNhom } = req.query;
    const where = {};
    const allowedGroups = await getCreatableGroups(req.user);
    const allowedGroupCodes = allowedGroups.map((group) => group.MaNhom);

    if (MaNhom && !allowedGroupCodes.includes(MaNhom)) {
      return res.json({ success: true, data: [], pagination: getPaginationMeta(0, page, limit) });
    }

    if (search) {
      where.OR = [
        { TenDangNhap: { contains: search, mode: 'insensitive' } },
        { HoTen: { contains: search, mode: 'insensitive' } },
        { Email: { contains: search, mode: 'insensitive' } }
      ];
    }
    const roleFilter = filterRole || role;
    if (roleFilter && ['admin', 'student'].includes(roleFilter)) where.Role = roleFilter;
    where.MaNhom = MaNhom || { in: allowedGroupCodes };

    const [rows, total] = await Promise.all([
      prisma.TAIKHOAN.findMany({
        where,
        skip,
        take: limit,
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
      }),
      prisma.TAIKHOAN.count({ where })
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Get all accounts error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
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
    if (rawPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const currentUserId = Number(req.user.id || req.user.MaTaiKhoan || 0) || null;
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
        return res.status(400).json({ success: false, message: 'MSSV này đã được gắn với tài khoản khác' });
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

      const account = await prisma.$transaction(async (tx) => {
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

        return created;
      });

      return res.status(201).json({
        success: true,
        message: 'Tạo tài khoản sinh viên thành công',
        data: account
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
    console.error('Create account error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
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
      await tx.DATLAIMATKHAU.deleteMany({ where: { MaTaiKhoan: accountId } });
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
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
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
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getAllRoles, getMyRole, getAllAccounts, createAccount, deleteAccount, updateUserRole };
