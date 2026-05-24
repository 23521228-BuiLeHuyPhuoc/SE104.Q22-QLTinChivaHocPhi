const prisma = require('../config/database');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';
const CANCELLED_REGISTRATION_STATUS = 'Đã hủy';

const REGISTRATION_TYPE_LABELS = {
  hoc_moi: 'Học mới',
  hoc_lai: 'Học lại',
  hoc_cai_thien: 'Cải thiện'
};

const getRegistrationTypeLabel = (type) => REGISTRATION_TYPE_LABELS[type] || type || 'Học mới';

const getStudentIdFromRequest = async (req) => {
  if (req.user?.Role === 'admin') return null;
  if (req.user?.MaSv) return req.user.MaSv;
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaTaiKhoan: Number(req.user?.MaTaiKhoan || req.user?.id || 0) },
    select: { MaSv: true }
  });
  return student?.MaSv || null;
};

const ensureStudentAccess = async (req, res, studentId) => {
  if (req.user?.Role === 'admin') return true;
  const currentStudentId = await getStudentIdFromRequest(req);
  if (currentStudentId && currentStudentId === studentId) return true;
  res.status(403).json({ success: false, message: 'Không có quyền truy cập dữ liệu sinh viên này' });
  return false;
};

const getCreditPrice = async (tx, loaiMon, loaiHoc, maHocKy) => {
  const semesterPrice = maHocKy ? await tx.DONGIATINCHI.findFirst({
    where: { LoaiMon: loaiMon, LoaiHoc: loaiHoc, MaHocKy: maHocKy, TrangThai: true }
  }) : null;
  if (semesterPrice) return Number(semesterPrice.DonGia);

  const defaultPrice = await tx.DONGIATINCHI.findFirst({
    where: { LoaiMon: loaiMon, LoaiHoc: loaiHoc, MaHocKy: null, TrangThai: true }
  });
  if (defaultPrice) return Number(defaultPrice.DonGia);

  return loaiMon === 'TH' ? 37000 : 27000;
};

const determineRegistrationType = async (tx, maSv, maMonHoc) => {
  if (!maSv || !maMonHoc) return 'hoc_moi';
  const history = await tx.MONDAHOC.findMany({
    where: { MaSv: maSv, MaMonHoc: maMonHoc },
    select: { KetQua: true }
  });
  if (history.some((item) => item.KetQua === 'qua_mon')) return 'hoc_cai_thien';
  if (history.some((item) => item.KetQua === 'rot')) return 'hoc_lai';
  return 'hoc_moi';
};

const getStudentDiscountRate = async (tx, maSv) => {
  const rows = await tx.DOITUONGSINHVIEN.findMany({
    where: { MaSv: maSv },
    include: { DOITUONG: true }
  });
  const activeRows = rows
    .filter((row) => row.DOITUONG && row.DOITUONG.TrangThai !== false)
    .sort((a, b) => Number(a.DOITUONG.DoUuTien || 9999) - Number(b.DOITUONG.DoUuTien || 9999));
  return activeRows.length ? Number(activeRows[0].DOITUONG.TiLeGiamHocPhi || 0) : 0;
};

const recalculateRegistrationTotals = async (tx, soPhieu) => {
  const phieu = await tx.PHIEUDANGKY.findUnique({
    where: { SoPhieu: soPhieu },
    include: { CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } } }
  });
  if (!phieu) return null;

  const summary = {
    TongTinChi: 0,
    TongTienDangKy: 0,
    SoMonHocMoi: 0,
    SoTinChiHocMoi: 0,
    TienHocMoi: 0,
    SoMonHocLai: 0,
    SoTinChiHocLai: 0,
    TienHocLai: 0,
    SoMonHocCaiThien: 0,
    SoTinChiHocCaiThien: 0,
    TienHocCaiThien: 0
  };

  phieu.CHITIETDANGKY.forEach((item) => {
    const credits = Number(item.SoTinChi || 0);
    const amount = Number(item.ThanhTien || 0);
    summary.TongTinChi += credits;
    summary.TongTienDangKy += amount;

    if (item.LoaiDangKy === 'hoc_lai') {
      summary.SoMonHocLai += 1;
      summary.SoTinChiHocLai += credits;
      summary.TienHocLai += amount;
    } else if (item.LoaiDangKy === 'hoc_cai_thien') {
      summary.SoMonHocCaiThien += 1;
      summary.SoTinChiHocCaiThien += credits;
      summary.TienHocCaiThien += amount;
    } else {
      summary.SoMonHocMoi += 1;
      summary.SoTinChiHocMoi += credits;
      summary.TienHocMoi += amount;
    }
  });

  const discountRate = await getStudentDiscountRate(tx, phieu.MaSv);
  const discountAmount = Math.round(summary.TongTienDangKy * discountRate / 100);
  const amountDue = Math.max(summary.TongTienDangKy - discountAmount, 0);

  return tx.PHIEUDANGKY.update({
    where: { SoPhieu: soPhieu },
    data: {
      ...summary,
      TiLeGiam: discountRate,
      TienMienGiam: discountAmount,
      TongTienPhaiDong: amountDue,
      NgayCapNhat: new Date()
    }
  });
};

const getAllRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', MaHocKy, TrangThai } = req.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (TrangThai) where.TrangThai = TrangThai;
    if (search) {
      where.SINHVIEN = {
        OR: [
          { MaSv: { contains: search, mode: 'insensitive' } },
          { HoTen: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [rows, total] = await Promise.all([
      prisma.PHIEUDANGKY.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        orderBy: { NgayLap: 'desc' },
        include: { SINHVIEN: true, HOCKY: { include: { NAMHOC: true } }, CHITIETDANGKY: true }
      }),
      prisma.PHIEUDANGKY.count({ where })
    ]);

    const data = rows.map((r) => ({
      SoPhieu: r.SoPhieu,
      MaSv: r.MaSv,
      HoTen: r.SINHVIEN.HoTen,
      MaHocKy: r.MaHocKy,
      TenHocKy: r.HOCKY.TenHocKy,
      TenNamHoc: r.HOCKY.NAMHOC.TenNamHoc,
      soMon: r.CHITIETDANGKY.filter((c) => c.TrangThai === ACTIVE_REGISTRATION_STATUS).length,
      TongTinChi: r.TongTinChi,
      TongTienPhaiDong: r.TongTienPhaiDong,
      NgayLap: r.NgayLap,
      TrangThai: r.TrangThai
    }));

    res.json({ success: true, data, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get all registrations error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getStudentCourses = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    if (!(await ensureStudentAccess(req, res, studentId))) return;
    const semesterId = req.query.MaHocKy || null;
    const rows = await prisma.$queryRaw`
      SELECT
        ctdk."id",
        ctdk."SoPhieu",
        ctdk."MaLop",
        ctdk."MaMonHoc",
        ctdk."LoaiDangKy",
        ctdk."DonGia",
        ctdk."ThanhTien",
        ctdk."TrangThai",
        ctdk."NgayDangKy",
        ctdk."NgayHuy",
        mh."SoTinChi",
        l."TenLop",
        l."GiangVien",
        l."LichHoc",
        l."PhongHoc",
        mh."TenMonHoc",
        mh."LoaiMon",
        pdk."MaHocKy",
        hk."TenHocKy",
        nh."TenNamHoc"
      FROM "CHITIETDANGKY" ctdk
      JOIN "PHIEUDANGKY" pdk ON pdk."SoPhieu" = ctdk."SoPhieu"
      LEFT JOIN "LOP" l ON l."MaLop" = ctdk."MaLop"
      LEFT JOIN "MONHOC" mh ON mh."MaMonHoc" = COALESCE(ctdk."MaMonHoc", l."MaMonHoc")
      LEFT JOIN "HOCKY" hk ON hk."MaHocKy" = pdk."MaHocKy"
      LEFT JOIN "NAMHOC" nh ON nh."MaNamHoc" = hk."MaNamHoc"
      WHERE pdk."MaSv" = ${studentId}
        AND (${semesterId}::text IS NULL OR pdk."MaHocKy" = ${semesterId})
      ORDER BY ctdk."NgayDangKy" DESC, ctdk."id" DESC
    `;

    const courses = rows.map((row) => ({
      id: row.id,
      SoPhieu: row.SoPhieu,
      MaLop: row.MaLop,
      MaMonHoc: row.MaMonHoc,
      LoaiDangKy: row.LoaiDangKy,
      LoaiDangKyLabel: getRegistrationTypeLabel(row.LoaiDangKy),
      DonGia: row.DonGia,
      ThanhTien: row.ThanhTien,
      TrangThai: row.TrangThai,
      NgayDangKy: row.NgayDangKy,
      NgayHuy: row.NgayHuy,
      SoTinChi: row.SoTinChi || 0,
      LOP: {
        MaLop: row.MaLop,
        TenLop: row.TenLop,
        GiangVien: row.GiangVien,
        LichHoc: row.LichHoc,
        PhongHoc: row.PhongHoc,
        MONHOC: {
          MaMonHoc: row.MaMonHoc,
          TenMonHoc: row.TenMonHoc,
          SoTinChi: row.SoTinChi || 0,
          LoaiMon: row.LoaiMon
        }
      },
      PHIEUDANGKY: {
        MaHocKy: row.MaHocKy,
        HOCKY: {
          TenHocKy: row.TenHocKy,
          NAMHOC: { TenNamHoc: row.TenNamHoc }
        }
      }
    }));

    res.json({
      success: true,
      data: {
        courses,
        summary: {
          totalCourses: courses.length,
          totalCredits: courses.reduce((sum, course) => sum + Number(course.SoTinChi || 0), 0)
        }
      }
    });
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getAvailableCourses = async (req, res) => {
  try {
    const { MaHocKy, search = '', MaKhoa } = req.query;
    if (!MaHocKy) return res.status(400).json({ success: false, message: 'Vui lòng chọn học kỳ' });

    let studentId = req.query.MaSv || null;
    if (!studentId && req.user?.Role !== 'admin') studentId = await getStudentIdFromRequest(req);

    const where = { MaHocKy };
    if (search || MaKhoa) {
      where.LOP = { MONHOC: {} };
      if (search) {
        where.LOP.MONHOC.OR = [
          { MaMonHoc: { contains: search, mode: 'insensitive' } },
          { TenMonHoc: { contains: search, mode: 'insensitive' } }
        ];
      }
      if (MaKhoa) where.LOP.MONHOC.MaKhoa = MaKhoa;
    }

    const rows = await prisma.LOPMO.findMany({
      where,
      include: {
        LOP: {
          include: {
            MONHOC: { include: { KHOA: true } },
            CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } }
          }
        },
        HOCKY: true
      }
    });

    const data = await Promise.all(rows.map(async (r) => {
      const course = r.LOP.MONHOC;
      const registrationType = studentId
        ? await determineRegistrationType(prisma, studentId, course.MaMonHoc)
        : 'hoc_moi';
      const price = await getCreditPrice(prisma, course.LoaiMon, registrationType, MaHocKy);
      const credits = Number(course.SoTinChi || 0);

      return {
        id: r.id,
        MaLop: r.MaLop,
        MaHocKy: r.MaHocKy,
        MaMonHoc: course.MaMonHoc,
        TenMonHoc: course.TenMonHoc,
        SoTinChi: credits,
        LoaiMon: course.LoaiMon,
        TenKhoa: course.KHOA?.TenKhoa,
        SoLuongToiDa: r.LOP.SoLuongToiDa,
        SoLuongDaDangKy: r.LOP.CHITIETDANGKY.length,
        GiangVien: r.LOP.GiangVien,
        PhongHoc: r.LOP.PhongHoc,
        LichHoc: r.LOP.LichHoc,
        LoaiDangKy: registrationType,
        LoaiDangKyLabel: getRegistrationTypeLabel(registrationType),
        DonGiaDuKien: price,
        ThanhTienDuKien: price * credits
      };
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get available courses error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const registerCourse = async (req, res) => {
  try {
    let { MaSv, MaHocKy, MaLop } = req.body;
    if (req.user?.Role !== 'admin') {
      const currentStudentId = await getStudentIdFromRequest(req);
      if (!currentStudentId) return res.status(403).json({ success: false, message: 'Không xác định được sinh viên hiện tại' });
      if (MaSv && MaSv !== currentStudentId) {
        return res.status(403).json({ success: false, message: 'Không thể đăng ký cho sinh viên khác' });
      }
      MaSv = currentStudentId;
    }
    if (!MaSv || !MaHocKy || !MaLop) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });

    const result = await prisma.$transaction(async (tx) => {
      const openedClass = await tx.LOPMO.findFirst({
        where: { MaHocKy, MaLop, TrangThai: true },
        include: { LOP: { include: { MONHOC: true, CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } } } } }
      });
      if (!openedClass || !openedClass.LOP) throw { status: 404, message: 'Lớp học không tồn tại hoặc chưa mở trong học kỳ này' };

      const lop = openedClass.LOP;
      const course = lop.MONHOC;
      if (Number(lop.SoLuongToiDa || 0) > 0 && lop.CHITIETDANGKY.length >= Number(lop.SoLuongToiDa || 0)) {
        throw { status: 400, message: 'Lớp học đã hết chỗ' };
      }

      let phieu = await tx.PHIEUDANGKY.findFirst({ where: { MaSv, MaHocKy } });
      if (!phieu) {
        phieu = await tx.PHIEUDANGKY.create({ data: { MaSv, MaHocKy, TrangThai: ACTIVE_REGISTRATION_STATUS } });
      }

      const existingReg = await tx.CHITIETDANGKY.findFirst({
        where: { SoPhieu: phieu.SoPhieu, MaMonHoc: course.MaMonHoc, TrangThai: ACTIVE_REGISTRATION_STATUS }
      });
      if (existingReg) throw { status: 400, message: 'Đã đăng ký môn này rồi' };

      const registrationType = await determineRegistrationType(tx, MaSv, course.MaMonHoc);
      const price = await getCreditPrice(tx, course.LoaiMon, registrationType, MaHocKy);
      const credits = Number(course.SoTinChi || 0);
      const amount = price * credits;

      const cancelledReg = await tx.CHITIETDANGKY.findFirst({
        where: { SoPhieu: phieu.SoPhieu, MaMonHoc: course.MaMonHoc, TrangThai: CANCELLED_REGISTRATION_STATUS }
      });

      const data = {
        SoPhieu: phieu.SoPhieu,
        MaLop,
        MaMonHoc: course.MaMonHoc,
        LoaiDangKy: registrationType,
        SoTinChi: credits,
        LoaiMon: course.LoaiMon,
        DonGia: price,
        ThanhTien: amount,
        TrangThai: ACTIVE_REGISTRATION_STATUS,
        NgayHuy: null
      };

      const registration = cancelledReg
        ? await tx.CHITIETDANGKY.update({
          where: { id: cancelledReg.id },
          data: { ...data, NgayDangKy: new Date() }
        })
        : await tx.CHITIETDANGKY.create({ data });
      const tuitionSummary = await recalculateRegistrationTotals(tx, phieu.SoPhieu);
      return { registration, tuitionSummary };
    });

    res.status(201).json({ success: true, message: 'Đăng ký thành công', data: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Register course error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const cancelRegistration = async (req, res) => {
  try {
    const reg = await prisma.CHITIETDANGKY.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { PHIEUDANGKY: { select: { MaSv: true, SoPhieu: true } } }
    });
    if (!reg) return res.status(404).json({ success: false, message: 'Không tìm thấy đăng ký' });
    if (!(await ensureStudentAccess(req, res, reg.PHIEUDANGKY.MaSv))) return;

    const result = await prisma.$transaction(async (tx) => {
      await tx.CHITIETDANGKY.update({
        where: { id: parseInt(req.params.id, 10) },
        data: { TrangThai: CANCELLED_REGISTRATION_STATUS, NgayHuy: new Date() }
      });
      return recalculateRegistrationTotals(tx, reg.PHIEUDANGKY.SoPhieu);
    });
    res.json({ success: true, message: 'Hủy đăng ký thành công', data: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Cancel registration error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getRegistrationStats = async (req, res) => {
  try {
    const where = {};
    if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const [totalReg, totalDetails] = await Promise.all([
      prisma.PHIEUDANGKY.count({ where }),
      prisma.CHITIETDANGKY.count({ where: { TrangThai: ACTIVE_REGISTRATION_STATUS, PHIEUDANGKY: where } })
    ]);
    res.json({ success: true, data: { totalRegistrations: totalReg, totalCourses: totalDetails } });
  } catch (error) {
    console.error('Get registration stats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  getAllRegistrations,
  getStudentCourses,
  getAvailableCourses,
  registerCourse,
  cancelRegistration,
  getRegistrationStats,
  recalculateRegistrationTotals,
  getRegistrationTypeLabel
};
