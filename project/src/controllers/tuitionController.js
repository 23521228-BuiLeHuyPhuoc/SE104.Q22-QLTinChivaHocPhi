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
  res.status(403).json({ success: false, message: 'Khong co quyen truy cap du lieu sinh vien nay' });
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

const getAllTuition = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search = '', MaHocKy } = req.query;
    const where = { SINHVIEN: { DaXoa: false }, HOCKY: { DaXoa: false } };
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (search) where.SINHVIEN.OR = [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }];

    const [rows, total] = await Promise.all([
      prisma.PHIEUDANGKY.findMany({
        where,
        skip,
        take: limit,
        orderBy: { NgayLap: 'desc' },
        include: {
          SINHVIEN: true,
          HOCKY: { include: { NAMHOC: true } },
          PHIEUTHUHOCPHI: { where: { TrangThai: PAYMENT_SUCCESS } },
          CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } }
        }
      }),
      prisma.PHIEUDANGKY.count({ where })
    ]);
    const data = rows.map((t) => {
      const daDong = t.PHIEUTHUHOCPHI.reduce((s, p) => s + Number(p.SoTienThu), 0);
      const phaiDong = Number(t.TongTienPhaiDong) || 0;
      const conNo = Math.max(phaiDong - daDong, 0);
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
        TongTienDaDong: daDong,
        conNo,
        CoTheThanhToan: conNo > 0 && !paymentBlock.blocked,
        LyDoChuaTheThanhToan: paymentBlock.blocked ? PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE : null,
        QuaHan: conNo > 0 && t.HOCKY.HanDongHocPhi && new Date(t.HOCKY.HanDongHocPhi) < new Date(),
        TrangThai: tuitionStatus(phaiDong, daDong, t.HOCKY.HanDongHocPhi)
      };
    });
    res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get all tuition error:');
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
    if (!t) return res.status(404).json({ success: false, message: 'Khong tim thay thong tin hoc phi' });
    const daDong = t.PHIEUTHUHOCPHI.filter((p) => p.TrangThai === PAYMENT_SUCCESS).reduce((s, p) => s + Number(p.SoTienThu), 0);
    const phaiDong = Number(t.TongTienPhaiDong || 0);
    const conNo = Math.max(phaiDong - daDong, 0);
    const paymentBlock = getPaymentRegistrationBlock(t.HOCKY);
    res.json({
      success: true,
      data: {
        SoPhieu: t.SoPhieu,
        MaSv: t.MaSv,
        HoTen: t.SINHVIEN.HoTen,
        TenHocKy: t.HOCKY.TenHocKy,
        HanDongHocPhi: t.HOCKY.HanDongHocPhi,
        NgayKetThucDangKy: t.HOCKY.NgayKetThucDangKy,
        TongTienPhaiDong: phaiDong,
        TongTienDaDong: daDong,
        conNo,
        CoTheThanhToan: conNo > 0 && !paymentBlock.blocked,
        LyDoChuaTheThanhToan: paymentBlock.blocked ? PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE : null,
        TrangThai: tuitionStatus(phaiDong, daDong, t.HOCKY.HanDongHocPhi),
        courses: t.CHITIETDANGKY.map((c) => ({ MaMonHoc: c.MaMonHoc || c.LOP.MaMonHoc, TenMonHoc: c.MONHOC?.TenMonHoc || c.LOP.MONHOC.TenMonHoc, SoTinChi: c.SoTinChi, LoaiDangKy: c.LoaiDangKy, LoaiDangKyLabel: getRegistrationTypeLabel(c.LoaiDangKy), DonGia: Number(c.DonGia), ThanhTien: Number(c.ThanhTien) })),
        payments: t.PHIEUTHUHOCPHI
      }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get tuition by ID error:');
  }
};

const getStudentTuition = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    if (!(await ensureStudentAccess(req, res, studentId))) return;
    const { page, limit, skip } = getPagination(req.query);
    const semesterId = req.query.MaHocKy || null;
    const where = { MaSv: studentId, ...(semesterId ? { MaHocKy: semesterId } : {}) };
    const include = {
      HOCKY: { include: { NAMHOC: true } },
      PHIEUTHUHOCPHI: { where: { TrangThai: PAYMENT_SUCCESS }, select: { SoTienThu: true } }
    };
    const [rows, allRows, total] = await Promise.all([
      prisma.PHIEUDANGKY.findMany({
        where,
        skip,
        take: limit,
        orderBy: { NgayLap: 'desc' },
        include
      }),
      prisma.PHIEUDANGKY.findMany({ where, include }),
      prisma.PHIEUDANGKY.count({ where })
    ]);
    const data = rows.map((t) => {
      const daDong = t.PHIEUTHUHOCPHI.reduce((sum, p) => sum + Number(p.SoTienThu || 0), 0);
      const phaiDong = Number(t.TongTienPhaiDong || 0);
      const conNo = Math.max(phaiDong - daDong, 0);
      const paymentBlock = getPaymentRegistrationBlock(t.HOCKY);
      return {
        SoPhieu: t.SoPhieu,
        MaHocKy: t.MaHocKy,
        TenHocKy: t.HOCKY?.TenHocKy,
        TenNamHoc: t.HOCKY?.NAMHOC?.TenNamHoc,
        HanDongHocPhi: t.HOCKY?.HanDongHocPhi,
        NgayKetThucDangKy: t.HOCKY?.NgayKetThucDangKy,
        TongTienPhaiDong: phaiDong,
        TongTienDaDong: daDong,
        conNo,
        CoTheThanhToan: conNo > 0 && !paymentBlock.blocked,
        LyDoChuaTheThanhToan: paymentBlock.blocked ? PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE : null,
        TrangThai: tuitionStatus(phaiDong, daDong, t.HOCKY?.HanDongHocPhi)
      };
    });

    const summary = allRows.reduce((acc, row) => {
      const due = Number(row.TongTienPhaiDong || 0);
      const paid = row.PHIEUTHUHOCPHI.reduce((sum, p) => sum + Number(p.SoTienThu || 0), 0);
      acc.totalFee += due;
      acc.totalPaid += paid;
      acc.totalRemaining += Math.max(due - paid, 0);
      return acc;
    }, { totalFee: 0, totalPaid: 0, totalRemaining: 0 });

    res.json({ success: true, data, summary, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get student tuition error:');
  }
};

const calculateTuition = async (req, res) => {
  try {
    const { MaSv, MaHocKy } = req.body;
    if (!MaSv || !MaHocKy) return res.status(400).json({ success: false, message: 'Vui long cung cap ma sinh vien va hoc ky' });
    const phieu = await prisma.PHIEUDANGKY.findFirst({ where: { MaSv, MaHocKy }, include: { CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } } } });
    if (!phieu) return res.status(404).json({ success: false, message: 'Chua dang ky mon hoc trong hoc ky nay' });
    const updated = await prisma.$transaction((tx) => recalculateRegistrationTotals(tx, phieu.SoPhieu));
    res.json({ success: true, data: { SoPhieu: updated.SoPhieu, TongTienPhaiDong: Number(updated.TongTienPhaiDong || 0) } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Calculate tuition error:');
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
        return sendErrorResponse(res, error, 'Loi server', 'Get tuition stats error:');
  }
};

const getCreditPrices = async (req, res) => {
  try {
    const prices = await prisma.DONGIATINCHI.findMany({ where: { DaXoa: false, TrangThai: true }, orderBy: [{ LoaiMon: 'asc' }, { LoaiHoc: 'asc' }] });
    res.json({ success: true, data: prices });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get credit prices error:');
  }
};

module.exports = { getAllTuition, getTuitionById, getStudentTuition, calculateTuition, getTuitionStats, getCreditPrices };
