const prisma = require('../config/database');

const normalize = (value) => String(value || '').trim();
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

  return prisma.NHOMNGUOIDUNG.findUnique({
    where: { MaNhom },
    select: { MaNhom: true, TenNhom: true }
  });
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
    const groups = await prisma.NHOMNGUOIDUNG.findMany({ orderBy: { MaNhom: 'asc' } });
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
    const { search, Role: filterRole, role, MaNhom, approval, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = {};

    if (search) {
      where.OR = [
        { TenDangNhap: { contains: search, mode: 'insensitive' } },
        { HoTen: { contains: search, mode: 'insensitive' } },
        { Email: { contains: search, mode: 'insensitive' } }
      ];
    }
    const roleFilter = filterRole || role;
    if (roleFilter && ['admin', 'student'].includes(roleFilter)) where.Role = roleFilter;
    if (MaNhom) where.MaNhom = MaNhom;
    if (approval && ['pending', 'approved', 'rejected'].includes(approval)) where.TrangThaiDuyet = approval;

    const [rows, total] = await Promise.all([
      prisma.TAIKHOAN.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
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
          TrangThaiDuyet: true,
          LyDoTuChoi: true,
          QUANTRIVIEN: { select: { ChucVu: true, PhongBan: true } }
        }
      }),
      prisma.TAIKHOAN.count({ where })
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get all accounts error:', error);
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

const updateAccountApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { TrangThaiDuyet, LyDoTuChoi } = req.body;
    const currentUserId = req.user.id || req.user.MaTaiKhoan;
    const linkMaSv = normalize(req.body.MaSv || req.body.maSv);

    if (!['approved', 'rejected'].includes(TrangThaiDuyet)) {
      return res.status(400).json({ success: false, message: 'Trạng thái duyệt không hợp lệ' });
    }
    if (parseInt(id, 10) === parseInt(currentUserId, 10)) {
      return res.status(400).json({ success: false, message: 'Không thể tự duyệt tài khoản của chính mình' });
    }

    const account = await prisma.TAIKHOAN.findUnique({
      where: { MaTaiKhoan: parseInt(id, 10) },
      select: {
        MaTaiKhoan: true,
        Role: true,
        MaNhom: true,
        MaSv: true,
        HoTen: true,
        Email: true,
        Sdt: true,
        TrangThaiDuyet: true
      }
    });
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

    let linkedStudent = null;
    if (TrangThaiDuyet === 'approved' && account.Role === 'student') {
      if (!linkMaSv) {
        return res.status(400).json({
          success: false,
          message: 'Duyệt tài khoản sinh viên cần nhập MSSV để liên kết hồ sơ'
        });
      }
      linkedStudent = await prisma.SINHVIEN.findUnique({
        where: { MaSv: linkMaSv },
        select: { MaSv: true, MaTaiKhoan: true, HoTen: true, Email: true, Sdt: true, AnhDaiDien: true }
      });
      if (!linkedStudent) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ sinh viên để liên kết' });
      }
      if (linkedStudent.MaTaiKhoan && linkedStudent.MaTaiKhoan !== account.MaTaiKhoan) {
        return res.status(400).json({ success: false, message: 'Hồ sơ sinh viên này đã liên kết tài khoản khác' });
      }
      const accountUsingStudent = await prisma.TAIKHOAN.findFirst({
        where: { MaSv: linkMaSv, MaTaiKhoan: { not: account.MaTaiKhoan } },
        select: { MaTaiKhoan: true }
      });
      if (accountUsingStudent) {
        return res.status(400).json({ success: false, message: 'MSSV này đã được gắn với tài khoản khác' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const data = {
        TrangThaiDuyet,
        NgayDuyet: new Date(),
        NguoiDuyet: Number(currentUserId),
        LyDoTuChoi: TrangThaiDuyet === 'rejected' ? (LyDoTuChoi || 'Không được duyệt') : null,
        NgayCapNhat: new Date()
      };

      if (linkedStudent) {
        data.MaSv = linkedStudent.MaSv;
        data.HoTen = account.HoTen || linkedStudent.HoTen;
        data.Email = account.Email || linkedStudent.Email;
        data.Sdt = account.Sdt || linkedStudent.Sdt;
        data.AnhDaiDien = linkedStudent.AnhDaiDien;
      }

      const accountUpdated = await tx.TAIKHOAN.update({
        where: { MaTaiKhoan: account.MaTaiKhoan },
        data,
        select: {
          MaTaiKhoan: true,
          TenDangNhap: true,
          Role: true,
          MaNhom: true,
          MaSv: true,
          TrangThaiDuyet: true,
          LyDoTuChoi: true
        }
      });

      if (linkedStudent) {
        await tx.SINHVIEN.update({
          where: { MaSv: linkedStudent.MaSv },
          data: { MaTaiKhoan: account.MaTaiKhoan },
          select: { MaSv: true }
        });
      }

      return accountUpdated;
    });

    const accountType = updated.Role === 'admin' ? 'admin' : 'sinh viên';
    res.json({
      success: true,
      message: TrangThaiDuyet === 'approved'
        ? `Đã duyệt tài khoản ${accountType}`
        : `Đã từ chối tài khoản ${accountType}`,
      data: updated
    });
  } catch (error) {
    console.error('Update approval error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getAllRoles, getMyRole, getAllAccounts, updateUserRole, updateAccountApproval };
