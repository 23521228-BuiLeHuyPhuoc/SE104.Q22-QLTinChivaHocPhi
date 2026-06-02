const prisma = require('../config/database');
const { recalculateRegistrationTotals, getRegistrationTypeLabel } = require('./registrationController');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const {
  PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE,
  getPaymentRegistrationBlock
} = require('../utils/paymentRules');
const { sendErrorResponse } = require('../utils/errorHandler');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';
const PAYMENT_SUCCESS = 'Thành công';

const getStudentIdFromRequest = async (req) => {
  if (req.user?.Role === 'admin') return null;
  if (req.user?.MaSv) return req.user.MaSv;
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaTaiKhoan: Number(req.user?.MaTaiKhoan || req.user?.id || 0), DaXoa: false },
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

const tuitionStatus = (amountDue, amountPaid, dueDate) => {
  const remaining = Math.max(amountDue - amountPaid, 0);
  if (amountDue <= 0) return 'Chưa phát sinh';
  if (remaining <= 0) return 'Đã đóng đủ';
  if (dueDate && new Date(dueDate) < new Date()) return 'Quá hạn';
  if (amountPaid > 0) return 'Đóng một phần';
  return 'Còn nợ';
};

const matchesTuitionStatus = (row, status) => {
  if (!status) return true;
  if (status === 'paid') return row.TrangThai === 'Đã đóng đủ';
  if (status === 'partial') return row.TrangThai === 'Đóng một phần';
  if (status === 'unpaid') return ['Còn nợ', 'Chưa đóng'].includes(row.TrangThai);
  if (status === 'overdue') return row.TrangThai === 'Quá hạn' || row.QuaHan;
  if (status === 'none') return row.TrangThai === 'Chưa phát sinh';
  return row.TrangThai === status;
};

const buildTuitionDetail = (registration) => {
  const successPayments = registration.PHIEUTHUHOCPHI.filter((p) => p.TrangThai === PAYMENT_SUCCESS);
  const daDong = successPayments.reduce((s, p) => s + Number(p.SoTienThu), 0);
  const phaiDong = Number(registration.TongTienPhaiDong || 0);
  const conNo = Math.max(phaiDong - daDong, 0);
  const paymentBlock = getPaymentRegistrationBlock(registration.HOCKY);
  const discounts = (registration.SINHVIEN?.DOITUONGSINHVIEN || [])
    .map((row) => row.DOITUONG)
    .filter(Boolean)
    .map((row) => ({
      MaDoiTuong: row.MaDoiTuong,
      TenDoiTuong: row.TenDoiTuong,
      TiLeGiamHocPhi: Number(row.TiLeGiamHocPhi || 0)
    }));

  return {
    SoPhieu: registration.SoPhieu,
    MaSv: registration.MaSv,
    HoTen: registration.SINHVIEN.HoTen,
    Email: registration.SINHVIEN.Email,
    MaHocKy: registration.MaHocKy,
    TenHocKy: registration.HOCKY.TenHocKy,
    TenNamHoc: registration.HOCKY.NAMHOC?.TenNamHoc,
    HanDongHocPhi: registration.HOCKY.HanDongHocPhi,
    NgayKetThucDangKy: registration.HOCKY.NgayKetThucDangKy,
    TongTienDangKy: Number(registration.TongTienDangKy || 0),
    TiLeGiam: Number(registration.TiLeGiam || 0),
    TienMienGiam: Number(registration.TienMienGiam || 0),
    TongTienPhaiDong: phaiDong,
    TongTienDaDong: daDong,
    conNo,
    ConNo: conNo,
    CoTheThanhToan: conNo > 0 && !paymentBlock.blocked,
    LyDoChuaTheThanhToan: paymentBlock.blocked ? PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE : null,
    QuaHan: conNo > 0 && registration.HOCKY.HanDongHocPhi && new Date(registration.HOCKY.HanDongHocPhi) < new Date(),
    TrangThai: tuitionStatus(phaiDong, daDong, registration.HOCKY.HanDongHocPhi),
    discounts,
    courses: registration.CHITIETDANGKY.map((c) => ({
      MaMonHoc: c.MaMonHoc || c.LOP.MaMonHoc,
      TenMonHoc: c.MONHOC?.TenMonHoc || c.LOP.MONHOC.TenMonHoc,
      SoTinChi: c.SoTinChi,
      LoaiDangKy: c.LoaiDangKy,
      LoaiDangKyLabel: getRegistrationTypeLabel(c.LoaiDangKy),
      DonGia: Number(c.DonGia),
      ThanhTien: Number(c.ThanhTien)
    })),
    payments: registration.PHIEUTHUHOCPHI.map((p) => ({
      ...p,
      SoTienThu: Number(p.SoTienThu || 0)
    }))
  };
};

const getAllTuition = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search = '', MaHocKy, status } = req.query;
    const where = { SINHVIEN: { DaXoa: false }, HOCKY: { DaXoa: false } };
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (search) where.SINHVIEN.OR = [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }];

    const include = {
      SINHVIEN: true,
      HOCKY: { include: { NAMHOC: true } },
      PHIEUTHUHOCPHI: { where: { TrangThai: { in: [PAYMENT_SUCCESS, 'Hoàn tiền'] } } },
      CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } }
    };

    const mapRow = (t) => {
      const successPayments = t.PHIEUTHUHOCPHI.filter((p) => p.TrangThai === PAYMENT_SUCCESS);
      const refunds = t.PHIEUTHUHOCPHI.filter((p) => p.TrangThai === 'Hoàn tiền');
      const daDong = successPayments.reduce((s, p) => s + Number(p.SoTienThu), 0);
      const hoantien = refunds.reduce((s, p) => s + Number(p.SoTienThu), 0);
      const effectivePaid = daDong - hoantien;
      const phaiDong = Number(t.TongTienPhaiDong) || 0;
      const conNo = Math.max(phaiDong - effectivePaid, 0);
      const paymentBlock = getPaymentRegistrationBlock(t.HOCKY);
      return {
        SoPhieu: t.SoPhieu,
        MaSv: t.MaSv,
        HoTen: t.SINHVIEN.HoTen,
        Email: t.SINHVIEN.Email,
        MaHocKy: t.MaHocKy,
        TenHocKy: t.HOCKY.TenHocKy,
        TenNamHoc: t.HOCKY.NAMHOC.TenNamHoc,
        HanDongHocPhi: t.HOCKY.HanDongHocPhi,
        soMon: t.CHITIETDANGKY.length,
        TongTienPhaiDong: phaiDong,
        TongTienDaDong: effectivePaid,
        conNo,
        CoTheThanhToan: conNo > 0 && !paymentBlock.blocked,
        LyDoChuaTheThanhToan: paymentBlock.blocked ? PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE : null,
        QuaHan: conNo > 0 && t.HOCKY.HanDongHocPhi && new Date(t.HOCKY.HanDongHocPhi) < new Date(),
        TrangThai: tuitionStatus(phaiDong, effectivePaid, t.HOCKY.HanDongHocPhi)
      };
    };

    if (status) {
      // When filtering by status, we must compute status for all rows first
      const allRows = await prisma.PHIEUDANGKY.findMany({ where, orderBy: { NgayLap: 'desc' }, include });
      const allMapped = allRows.map(mapRow).filter((row) => matchesTuitionStatus(row, status));
      const total = allMapped.length;
      const data = allMapped.slice(skip, skip + limit);
      res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
    } else {
      // No status filter: use database pagination
      const [rows, total] = await Promise.all([
        prisma.PHIEUDANGKY.findMany({ where, skip, take: limit, orderBy: { NgayLap: 'desc' }, include }),
        prisma.PHIEUDANGKY.count({ where })
      ]);
      const data = rows.map(mapRow);
      res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
    }
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'Get all tuition error:');
  }
};

const getTuitionById = async (req, res) => {
  try {
    const t = await prisma.PHIEUDANGKY.findUnique({
      where: { SoPhieu: parseInt(req.params.id, 10) },
      include: {
        SINHVIEN: true,
        HOCKY: { include: { NAMHOC: true } },
        CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS }, include: { LOP: { include: { MONHOC: true } }, MONHOC: true } },
        PHIEUTHUHOCPHI: true
      }
    });
    if (!t) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin học phí' });
    res.json({ success: true, data: buildTuitionDetail(t) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get tuition by ID error:');
  }
};

const getTuitionDetail = async (req, res) => {
  try {
    const t = await prisma.PHIEUDANGKY.findUnique({
      where: { SoPhieu: parseInt(req.params.id, 10) },
      include: {
        SINHVIEN: { include: { DOITUONGSINHVIEN: { include: { DOITUONG: true } } } },
        HOCKY: { include: { NAMHOC: true } },
        CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS }, include: { LOP: { include: { MONHOC: true } }, MONHOC: true } },
        PHIEUTHUHOCPHI: true
      }
    });
    if (!t) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin học phí' });
    if (!(await ensureStudentAccess(req, res, t.MaSv))) return;
    res.json({ success: true, data: buildTuitionDetail(t) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get tuition detail error:');
  }
};

const getStudentTuition = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    if (!(await ensureStudentAccess(req, res, studentId))) return;
    const { page, limit, skip } = getPagination(req.query);
    const semesterId = req.query.MaHocKy || null;
    const where = {
      MaSv: studentId,
      SINHVIEN: { DaXoa: false },
      HOCKY: { DaXoa: false },
      ...(semesterId ? { MaHocKy: semesterId } : {})
    };
    const include = {
      SINHVIEN: { select: { HoTen: true, Email: true } },
      HOCKY: { include: { NAMHOC: true } },
      PHIEUTHUHOCPHI: { where: { TrangThai: { in: [PAYMENT_SUCCESS, 'Hoàn tiền'] } }, select: { SoTienThu: true, TrangThai: true } }
    };
    const [rows, total, summaryAgg] = await Promise.all([
      prisma.PHIEUDANGKY.findMany({
        where,
        skip,
        take: limit,
        orderBy: { NgayLap: 'desc' },
        include
      }),
      prisma.PHIEUDANGKY.count({ where }),
      prisma.PHIEUDANGKY.aggregate({
        where,
        _sum: { TongTienPhaiDong: true }
      })
    ]);

    // Compute paid summary from paginated + all payments (need separate query for total paid)
    const allPayments = await prisma.PHIEUTHUHOCPHI.findMany({
      where: {
        MaSv: studentId,
        TrangThai: { in: [PAYMENT_SUCCESS, 'Hoàn tiền'] },
        PHIEUDANGKY: { SINHVIEN: { DaXoa: false }, HOCKY: { DaXoa: false }, ...(semesterId ? { MaHocKy: semesterId } : {}) }
      },
      select: { SoTienThu: true, TrangThai: true }
    });
    const totalPaid = allPayments.filter((p) => p.TrangThai === PAYMENT_SUCCESS).reduce((s, p) => s + Number(p.SoTienThu || 0), 0);
    const totalRefunded = allPayments.filter((p) => p.TrangThai === 'Hoàn tiền').reduce((s, p) => s + Number(p.SoTienThu || 0), 0);
    const totalFee = Number(summaryAgg._sum.TongTienPhaiDong || 0);
    const effectivePaid = totalPaid - totalRefunded;

    const data = rows.map((t) => {
      const successPayments = t.PHIEUTHUHOCPHI.filter((p) => p.TrangThai === PAYMENT_SUCCESS);
      const refunds = t.PHIEUTHUHOCPHI.filter((p) => p.TrangThai === 'Hoàn tiền');
      const daDong = successPayments.reduce((sum, p) => sum + Number(p.SoTienThu || 0), 0);
      const hoantien = refunds.reduce((sum, p) => sum + Number(p.SoTienThu || 0), 0);
      const effectiveRowPaid = daDong - hoantien;
      const phaiDong = Number(t.TongTienPhaiDong || 0);
      const conNo = Math.max(phaiDong - effectiveRowPaid, 0);
      const paymentBlock = getPaymentRegistrationBlock(t.HOCKY);
      return {
        SoPhieu: t.SoPhieu,
        HoTen: t.SINHVIEN?.HoTen,
        Email: t.SINHVIEN?.Email,
        MaHocKy: t.MaHocKy,
        TenHocKy: t.HOCKY?.TenHocKy,
        TenNamHoc: t.HOCKY?.NAMHOC?.TenNamHoc,
        HanDongHocPhi: t.HOCKY?.HanDongHocPhi,
        NgayKetThucDangKy: t.HOCKY?.NgayKetThucDangKy,
        TongTienDangKy: Number(t.TongTienDangKy || 0),
        TiLeGiam: Number(t.TiLeGiam || 0),
        TienMienGiam: Number(t.TienMienGiam || 0),
        TongTienPhaiDong: phaiDong,
        TongTienDaDong: effectiveRowPaid,
        conNo,
        CoTheThanhToan: conNo > 0 && !paymentBlock.blocked,
        LyDoChuaTheThanhToan: paymentBlock.blocked ? PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE : null,
        TrangThai: tuitionStatus(phaiDong, effectiveRowPaid, t.HOCKY?.HanDongHocPhi)
      };
    });

    const summary = { totalFee, totalPaid: effectivePaid, totalRemaining: Math.max(totalFee - effectivePaid, 0) };
    res.json({ success: true, data, summary, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'Get student tuition error:');
  }
};

const calculateTuition = async (req, res) => {
  try {
    const { MaSv, MaHocKy } = req.body;
    if (!MaSv || !MaHocKy) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã sinh viên và học kỳ' });
    const phieu = await prisma.PHIEUDANGKY.findFirst({ where: { MaSv, MaHocKy }, include: { CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } } } });
    if (!phieu) return res.status(404).json({ success: false, message: 'Chưa đăng ký môn học trong học kỳ này' });
    const updated = await prisma.$transaction((tx) => recalculateRegistrationTotals(tx, phieu.SoPhieu));
    res.json({ success: true, data: { SoPhieu: updated.SoPhieu, TongTienPhaiDong: Number(updated.TongTienPhaiDong || 0) } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Calculate tuition error:');
  }
};

const getTuitionStats = async (req, res) => {
  try {
    const where = { SINHVIEN: { DaXoa: false }, HOCKY: { DaXoa: false } };
    if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const rows = await prisma.PHIEUDANGKY.findMany({ where, include: { PHIEUTHUHOCPHI: { where: { TrangThai: PAYMENT_SUCCESS } } } });
    const totalAmount = rows.reduce((s, r) => s + Number(r.TongTienPhaiDong || 0), 0);
    const paidAmount = rows.reduce((s, r) => s + r.PHIEUTHUHOCPHI.reduce((ss, p) => ss + Number(p.SoTienThu), 0), 0);
    res.json({ success: true, data: { totalAmount, paidAmount, remainingAmount: totalAmount - paidAmount } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get tuition stats error:');
  }
};

const getCreditPrices = async (req, res) => {
  try {
    const prices = await prisma.DONGIATINCHI.findMany({ where: { DaXoa: false }, orderBy: [{ LoaiMon: 'asc' }, { LoaiHoc: 'asc' }] });
    res.json({ success: true, data: prices });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get credit prices error:');
  }
};

module.exports = { getAllTuition, getTuitionById, getTuitionDetail, getStudentTuition, calculateTuition, getTuitionStats, getCreditPrices };
