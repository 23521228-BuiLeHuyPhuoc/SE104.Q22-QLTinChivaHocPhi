const prisma = require('../config/database');
const { recalculateRegistrationTotals, getRegistrationTypeLabel } = require('./registrationController');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { filterRowsByRegex, paginateRows } = require('../utils/searchRegex');
const {
  PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE,
  PAYMENT_BLOCKED_NOT_OPEN_MESSAGE,
  getPaymentRegistrationBlock
} = require('../utils/paymentRules');
const { sendErrorResponse } = require('../utils/errorHandler');
const { PAYMENT_STATUS, APPEAL_STATUS } = require('../utils/businessConstants');
const {
  emptyTotals,
  getTransactionTotalsByRegistration,
  getTransactionTotalsByReceipt,
  getLatestTransactionActivityByRegistration,
  getRegistrationTransactions,
  getEffectivePaid,
  getReceiptRemaining,
  getRegistrationRemaining,
  attachReceiptSummaries
} = require('../utils/paymentLedger');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';
const PAYMENT_SUCCESS = PAYMENT_STATUS.SUCCESS;
const PAYMENT_REFUND = PAYMENT_STATUS.REFUND;
const PAYABLE_RECEIPT_STATUSES = [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.FAILED];

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

const addMonths = (value, months) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + months);
  return date;
};

const hasExtendedTuitionDueDate = (registration) => (registration?.CHITIETDANGKY || [])
  .some((detail) => ['hoc_lai', 'hoc_cai_thien'].includes(detail.LoaiDangKy));

const getEffectiveTuitionDueDate = (registration) => {
  const baseDue = registration?.HOCKY?.HanDongHocPhi || null;
  return hasExtendedTuitionDueDate(registration) ? addMonths(baseDue, 2) : baseDue;
};

const isTuitionDeadlinePassed = (dueDate, now = new Date()) => {
  if (!dueDate) return false;
  const deadline = new Date(dueDate);
  if (Number.isNaN(deadline.getTime())) return false;
  deadline.setHours(23, 59, 59, 999);
  return deadline < now;
};

const getPayableReceipt = (registration) => (registration?.PHIEUTHUHOCPHI || [])
  .find((receipt) => PAYABLE_RECEIPT_STATUSES.includes(receipt.TrangThai) && Number(receipt.ConNoPhieuThu ?? receipt.SoTienThu ?? 0) > 0);

const getExistingReceipt = (registration) => (registration?.PHIEUTHUHOCPHI || [])
  .find((receipt) => ![PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.REFUND].includes(receipt.TrangThai));

const receiptPaymentAmount = (receipt, registrationRemaining) => Math.max(Math.min(
  Number(receipt?.ConNoPhieuThu ?? receipt?.SoTienThu ?? 0),
  Number(registrationRemaining || 0)
), 0);

const toReceiptSummaryDto = (receipt, registrationRemaining) => receipt ? {
  SoPhieuThu: receipt.SoPhieuThu,
  SoTienThu: receiptPaymentAmount(receipt, registrationRemaining),
  SoTienThanhToanToiDa: receiptPaymentAmount(receipt, registrationRemaining),
  TongTienPhieuThu: Number(receipt.SoTienThu || 0),
  TongTienDaThanhToan: Number(receipt.TongTienDaThanhToan || 0),
  TongTienDangChoXacNhan: Number(receipt.TongTienDangChoXacNhan || 0),
  ConNoPhieuThu: Number(receipt.ConNoPhieuThu || 0),
  TrangThai: receipt.TrangThai,
  TrangThaiHienThi: receipt.TrangThaiHienThi || receipt.TrangThai,
  TrangThaiThanhToan: receipt.TrangThaiThanhToan || 'unknown'
} : null;

const toExistingReceiptDto = (receipt) => receipt ? {
  SoPhieuThu: receipt.SoPhieuThu,
  TrangThai: receipt.TrangThai,
  TrangThaiHienThi: receipt.TrangThaiHienThi || receipt.TrangThai,
  TrangThaiThanhToan: receipt.TrangThaiThanhToan || 'unknown'
} : null;

const toTimeValue = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const getLatestDebtActivityDate = (registration, latestTransactionDate) => {
  const dates = [registration?.NgayCapNhat, registration?.NgayLap, latestTransactionDate];
  (registration?.PHIEUTHUHOCPHI || []).forEach((receipt) => {
    dates.push(receipt.NgayCapNhat, receipt.NgayXacNhan, receipt.NgayLap);
  });
  const latest = dates.reduce((max, value) => Math.max(max, toTimeValue(value)), 0);
  return latest ? new Date(latest) : null;
};

const sortByLatestDebtActivity = (rows = []) => rows.sort((a, b) => {
  const diff = toTimeValue(b.NgayHoatDongCongNo) - toTimeValue(a.NgayHoatDongCongNo);
  if (diff !== 0) return diff;
  return Number(b.SoPhieu || 0) - Number(a.SoPhieu || 0);
});

const normalizePaymentTransaction = (item) => ({
  ...item,
  SoTienThanhToan: Number(item.SoTienThanhToan || 0)
});

const getPaymentUnavailableReason = ({ conNo, paymentBlock, payableReceipt, existingReceipt }) => {
  if (conNo <= 0) return null;
  if (!existingReceipt) return 'Chưa có phiếu thu học phí do admin tạo';
  if (!payableReceipt) {
    if (existingReceipt.TrangThai === PAYMENT_STATUS.PENDING) return 'Phiếu thu đang chờ admin xác nhận giao dịch thanh toán trước đó';
    if (existingReceipt.TrangThai === PAYMENT_STATUS.SUCCESS) return null;
    return 'Phiếu thu hiện chưa sẵn sàng để thanh toán';
  }
  return paymentBlock.blocked ? paymentBlock.message : null;
};

const attachPaymentSummariesToRegistrations = async (registrations = []) => {
  const registrationIds = registrations.map((row) => row.SoPhieu).filter(Boolean);
  const receiptIds = registrations.flatMap((row) => (row.PHIEUTHUHOCPHI || []).map((receipt) => receipt.SoPhieuThu));
  const [totalsByRegistration, totalsByReceipt] = await Promise.all([
    getTransactionTotalsByRegistration(prisma, registrationIds),
    getTransactionTotalsByReceipt(prisma, receiptIds)
  ]);

  return registrations.map((row) => {
    const registrationTotals = totalsByRegistration.get(Number(row.SoPhieu)) || emptyTotals();
    const receipts = attachReceiptSummaries(
      (row.PHIEUTHUHOCPHI || []).map((receipt) => ({ ...receipt, PHIEUDANGKY: row })),
      totalsByReceipt,
      totalsByRegistration
    );
    return {
      ...row,
      PHIEUTHUHOCPHI: receipts,
      _paymentTotals: registrationTotals,
      _effectivePaid: getEffectivePaid(registrationTotals),
      _remainingAmount: getRegistrationRemaining(row, registrationTotals)
    };
  });
};

const getAppliedDiscount = (student) => {
  const rows = (student?.DOITUONGSINHVIEN || [])
    .map((row) => row.DOITUONG)
    .filter((row) => row && row.TrangThai !== false)
    .sort((a, b) => {
      const priorityDiff = Number(a.DoUuTien || 9999) - Number(b.DoUuTien || 9999);
      if (priorityDiff !== 0) return priorityDiff;
      const discountDiff = Number(b.TiLeGiamHocPhi || 0) - Number(a.TiLeGiamHocPhi || 0);
      if (discountDiff !== 0) return discountDiff;
      return String(a.MaDoiTuong || '').localeCompare(String(b.MaDoiTuong || ''));
    });

  const discount = rows[0];
  if (!discount) return null;
  return {
    MaDoiTuong: discount.MaDoiTuong,
    TenDoiTuong: discount.TenDoiTuong,
    TiLeGiamHocPhi: Number(discount.TiLeGiamHocPhi || 0),
    DoUuTien: Number(discount.DoUuTien || 0)
  };
};

const getPendingAppealCountMap = async (semesterIds = []) => {
  const ids = Array.from(new Set(semesterIds.filter(Boolean)));
  if (!ids.length) return new Map();
  const rows = await prisma.DONCUUXETDANGKY.groupBy({
    by: ['MaHocKy'],
    where: { MaHocKy: { in: ids }, TrangThai: APPEAL_STATUS.PENDING },
    _count: { _all: true }
  });
  return new Map(rows.map((row) => [row.MaHocKy, row._count._all]));
};

const tuitionStatus = (amountDue, amountPaid, dueDate) => {
  const remaining = Math.max(amountDue - amountPaid, 0);
  if (amountDue <= 0) return 'Chưa phát sinh';
  if (remaining <= 0) return 'Đã đóng đủ';
  if (isTuitionDeadlinePassed(dueDate)) return 'Quá hạn';
  if (amountPaid > 0) return 'Đóng một phần';
  return 'Chưa đóng';
};

const matchesTuitionStatus = (row, status) => {
  if (!status) return true;
  if (status === 'paid') return row.TrangThai === 'Đã đóng đủ';
  if (status === 'partial') return row.TrangThai === 'Đóng một phần';
  if (status === 'unpaid') return row.TrangThai === 'Chưa đóng';
  if (status === 'overdue') return row.TrangThai === 'Quá hạn' || row.QuaHan;
  if (status === 'none') return row.TrangThai === 'Chưa phát sinh';
  return row.TrangThai === status;
};

const buildTuitionDetail = (registration, pendingAppeals = 0, paymentTransactions = []) => {
  const successPayments = registration.PHIEUTHUHOCPHI.filter((p) => p.TrangThai === PAYMENT_SUCCESS);
  const refunds = registration.PHIEUTHUHOCPHI.filter((p) => p.TrangThai === PAYMENT_REFUND);
  const legacyDaDong = successPayments.reduce((s, p) => s + Number(p.SoTienThu), 0) - refunds.reduce((s, p) => s + Number(p.SoTienThu), 0);
  const daDong = Number(registration._effectivePaid ?? legacyDaDong);
  const phaiDong = Number(registration.TongTienPhaiDong || 0);
  const conNo = Math.max(phaiDong - daDong, 0);
  const paymentBlock = getPaymentRegistrationBlock(registration.HOCKY, new Date(), { pendingAppeals });
  const payableReceipt = getPayableReceipt(registration);
  const existingReceipt = getExistingReceipt(registration);
  const paymentUnavailableReason = getPaymentUnavailableReason({ conNo, paymentBlock, payableReceipt, existingReceipt });
  const effectiveDueDate = getEffectiveTuitionDueDate(registration);
  const deadlinePassed = isTuitionDeadlinePassed(effectiveDueDate);
  const camThiCuoiKy = conNo > 0 && deadlinePassed;
  const appliedDiscount = getAppliedDiscount(registration.SINHVIEN);
  const tongTienDangKy = Number(registration.TongTienDangKy || 0);
  const tiLeGiam = Number(registration.TiLeGiam || appliedDiscount?.TiLeGiamHocPhi || 0);
  const tienMienGiam = Number(registration.TienMienGiam || 0);

  const transactions = paymentTransactions.map(normalizePaymentTransaction);
  const transactionsByReceipt = transactions.reduce((map, item) => {
    const receiptId = Number(item.SoPhieuThu);
    if (!map.has(receiptId)) map.set(receiptId, []);
    map.get(receiptId).push(item);
    return map;
  }, new Map());

  return {
    SoPhieu: registration.SoPhieu,
    MaSv: registration.MaSv,
    HoTen: registration.SINHVIEN.HoTen,
    Email: registration.SINHVIEN.Email,
    MaHocKy: registration.MaHocKy,
    TenHocKy: registration.HOCKY.TenHocKy,
    TenNamHoc: registration.HOCKY.NAMHOC?.TenNamHoc,
    NgayBatDauDongHocPhi: registration.HOCKY.NgayBatDauDongHocPhi,
    HanDongHocPhiGoc: registration.HOCKY.HanDongHocPhi,
    HanDongHocPhi: effectiveDueDate,
    GiaHanNoHocPhi: hasExtendedTuitionDueDate(registration),
    NgayKetThucDangKy: registration.HOCKY.NgayKetThucDangKy,
    TongTienDangKy: tongTienDangKy,
    TiLeGiam: tiLeGiam,
    TienMienGiam: tienMienGiam,
    TongTienPhaiDong: phaiDong,
    TongTienDaDong: daDong,
    conNo,
    ConNo: conNo,
    CoTheThanhToan: conNo > 0 && !paymentBlock.blocked && Boolean(payableReceipt),
    LyDoChuaTheThanhToan: paymentUnavailableReason,
    QuaHan: conNo > 0 && deadlinePassed,
    CamThiCuoiKy: Boolean(camThiCuoiKy),
    ThongBaoCamThi: camThiCuoiKy ? 'Quá hạn đóng học phí và chưa hoàn thành học phí: cấm thi cuối kỳ.' : null,
    TrangThai: tuitionStatus(phaiDong, daDong, effectiveDueDate),
    PayableReceipt: toReceiptSummaryDto(payableReceipt, conNo),
    ExistingReceipt: toExistingReceiptDto(existingReceipt),
    DoiTuongMienGiam: appliedDiscount,
    CongThucHocPhi: {
      TongTienMonHoc: tongTienDangKy,
      TiLeGiam: tiLeGiam,
      TienMienGiam: tienMienGiam,
      TongTienSauMienGiam: phaiDong
    },
    discounts: appliedDiscount ? [appliedDiscount] : [],
    courses: registration.CHITIETDANGKY.map((c) => ({
      MaMonHoc: c.MaMonHoc || c.LOP.MaMonHoc,
      TenMonHoc: c.MONHOC?.TenMonHoc || c.LOP.MONHOC.TenMonHoc,
      SoTinChi: c.SoTinChi,
      LoaiDangKy: c.LoaiDangKy,
      LoaiDangKyLabel: getRegistrationTypeLabel(c.LoaiDangKy),
      DonGia: Number(c.DonGia),
      ThanhTien: Number(c.ThanhTien),
      CamThiCuoiKy: Boolean(camThiCuoiKy),
      TrangThaiThi: camThiCuoiKy ? 'Cấm thi cuối kỳ' : 'Được thi cuối kỳ'
    })),
    paymentTransactions: transactions,
    payments: registration.PHIEUTHUHOCPHI.map((p) => ({
      ...p,
      SoTienThu: Number(p.SoTienThu || 0),
      TongTienDaThanhToan: Number(p.TongTienDaThanhToan || 0),
      TongTienDangChoXacNhan: Number(p.TongTienDangChoXacNhan || 0),
      ConNoPhieuThu: Number(p.ConNoPhieuThu || 0),
      LanThanhToan: transactionsByReceipt.get(Number(p.SoPhieuThu)) || []
    }))
  };
};

const getAllTuition = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query);
    const { search = '', MaHocKy, status } = req.query;
    const searchField = ['MaSv', 'HoTen'].includes(req.query.searchField) ? req.query.searchField : 'all';
    const where = { SINHVIEN: { DaXoa: false }, HOCKY: { DaXoa: false } };
    if (MaHocKy) where.MaHocKy = MaHocKy;

    const include = {
      SINHVIEN: true,
      HOCKY: { include: { NAMHOC: true } },
      PHIEUTHUHOCPHI: true,
      CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } }
    };

    let pendingAppealCountBySemester = new Map();
    let latestTransactionActivityByRegistration = new Map();

    const mapRow = (t) => {
      const effectivePaid = Number(t._effectivePaid || 0);
      const phaiDong = Number(t.TongTienPhaiDong) || 0;
      const conNo = Math.max(phaiDong - effectivePaid, 0);
      const pendingAppeals = pendingAppealCountBySemester.get(t.MaHocKy) || 0;
      const paymentBlock = getPaymentRegistrationBlock(t.HOCKY, new Date(), { pendingAppeals });
      const payableReceipt = getPayableReceipt(t);
      const existingReceipt = getExistingReceipt(t);
      const paymentUnavailableReason = getPaymentUnavailableReason({ conNo, paymentBlock, payableReceipt, existingReceipt });
      const effectiveDueDate = getEffectiveTuitionDueDate(t);
      const deadlinePassed = isTuitionDeadlinePassed(effectiveDueDate);
      const camThiCuoiKy = conNo > 0 && deadlinePassed;
      const latestTransactionDate = latestTransactionActivityByRegistration.get(Number(t.SoPhieu)) || null;
      return {
        SoPhieu: t.SoPhieu,
        MaSv: t.MaSv,
        HoTen: t.SINHVIEN.HoTen,
        Email: t.SINHVIEN.Email,
        MaHocKy: t.MaHocKy,
        TenHocKy: t.HOCKY.TenHocKy,
        TenNamHoc: t.HOCKY.NAMHOC.TenNamHoc,
        NgayBatDauDongHocPhi: t.HOCKY.NgayBatDauDongHocPhi,
        HanDongHocPhiGoc: t.HOCKY.HanDongHocPhi,
        HanDongHocPhi: effectiveDueDate,
        GiaHanNoHocPhi: hasExtendedTuitionDueDate(t),
        soMon: t.CHITIETDANGKY.length,
        TongTienPhaiDong: phaiDong,
        TongTienDaDong: effectivePaid,
        conNo,
        CoTheThanhToan: conNo > 0 && !paymentBlock.blocked && Boolean(payableReceipt),
        LyDoChuaTheThanhToan: paymentUnavailableReason,
        PayableReceipt: toReceiptSummaryDto(payableReceipt, conNo),
        ExistingReceipt: toExistingReceiptDto(existingReceipt),
        CamThiCuoiKy: Boolean(camThiCuoiKy),
        ThongBaoCamThi: camThiCuoiKy ? 'Quá hạn đóng học phí và chưa hoàn thành học phí: cấm thi cuối kỳ.' : null,
        QuaHan: conNo > 0 && deadlinePassed,
        NgayHoatDongCongNo: getLatestDebtActivityDate(t, latestTransactionDate),
        TrangThai: tuitionStatus(phaiDong, effectivePaid, effectiveDueDate)
      };
    };

    const allRows = await prisma.PHIEUDANGKY.findMany({ where, orderBy: { NgayLap: 'desc' }, include });
    const enrichedRows = await attachPaymentSummariesToRegistrations(allRows);
    [pendingAppealCountBySemester, latestTransactionActivityByRegistration] = await Promise.all([
      getPendingAppealCountMap(enrichedRows.map((row) => row.MaHocKy)),
      getLatestTransactionActivityByRegistration(prisma, enrichedRows.map((row) => row.SoPhieu))
    ]);
    const mapped = sortByLatestDebtActivity(enrichedRows.map(mapRow).filter((row) => matchesTuitionStatus(row, status)));
    const filtered = filterRowsByRegex(mapped, search, (row) => {
      const values = { MaSv: [row.MaSv], HoTen: [row.HoTen] };
      return searchField === 'all' ? Object.values(values).flat() : (values[searchField] || []);
    });
    const data = paginateRows(filtered, page, limit);
    res.json({ success: true, data, pagination: getPaginationMeta(filtered.length, page, limit) });
  } catch (error) {
    return sendErrorResponse(res, error, 'L\u1ed7i server', 'Get all tuition error:');
  }
};

const getTuitionById = async (req, res) => {
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
    const [pendingAppeals, paymentTransactions] = await Promise.all([
      prisma.DONCUUXETDANGKY.count({ where: { MaHocKy: t.MaHocKy, TrangThai: APPEAL_STATUS.PENDING } }),
      getRegistrationTransactions(prisma, t.SoPhieu)
    ]);
    const [enriched] = await attachPaymentSummariesToRegistrations([t]);
    res.json({ success: true, data: buildTuitionDetail(enriched, pendingAppeals, paymentTransactions) });
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
    const [pendingAppeals, paymentTransactions] = await Promise.all([
      prisma.DONCUUXETDANGKY.count({ where: { MaHocKy: t.MaHocKy, TrangThai: APPEAL_STATUS.PENDING } }),
      getRegistrationTransactions(prisma, t.SoPhieu)
    ]);
    const [enriched] = await attachPaymentSummariesToRegistrations([t]);
    res.json({ success: true, data: buildTuitionDetail(enriched, pendingAppeals, paymentTransactions) });
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
      CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS }, select: { LoaiDangKy: true } },
      PHIEUTHUHOCPHI: true
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

    const allPayments = semesterId
      ? await prisma.$queryRaw`
        SELECT gd."SoTienThanhToan", gd."TrangThai"
        FROM "GIAODICHTHANHTOANHOCPHI" gd
        JOIN "PHIEUDANGKY" pdk ON pdk."SoPhieu" = gd."SoPhieuDangKy"
        JOIN "HOCKY" hk ON hk."MaHocKy" = pdk."MaHocKy"
        JOIN "SINHVIEN" sv ON sv."MaSv" = pdk."MaSv"
        WHERE gd."MaSv" = ${studentId}
          AND pdk."MaHocKy" = ${semesterId}
          AND COALESCE(hk."DaXoa", FALSE) = FALSE
          AND COALESCE(sv."DaXoa", FALSE) = FALSE
      `
      : await prisma.$queryRaw`
        SELECT gd."SoTienThanhToan", gd."TrangThai"
        FROM "GIAODICHTHANHTOANHOCPHI" gd
        JOIN "PHIEUDANGKY" pdk ON pdk."SoPhieu" = gd."SoPhieuDangKy"
        JOIN "HOCKY" hk ON hk."MaHocKy" = pdk."MaHocKy"
        JOIN "SINHVIEN" sv ON sv."MaSv" = pdk."MaSv"
        WHERE gd."MaSv" = ${studentId}
          AND COALESCE(hk."DaXoa", FALSE) = FALSE
          AND COALESCE(sv."DaXoa", FALSE) = FALSE
      `;
    const totalPaid = allPayments.filter((p) => p.TrangThai === PAYMENT_SUCCESS).reduce((s, p) => s + Number(p.SoTienThanhToan || 0), 0);
    const totalRefunded = allPayments.filter((p) => p.TrangThai === PAYMENT_REFUND).reduce((s, p) => s + Number(p.SoTienThanhToan || 0), 0);
    const totalFee = Number(summaryAgg._sum.TongTienPhaiDong || 0);
    const effectivePaid = totalPaid - totalRefunded;

    const enrichedRows = await attachPaymentSummariesToRegistrations(rows);
    const pendingAppealCountBySemester = await getPendingAppealCountMap(enrichedRows.map((row) => row.MaHocKy));
    const data = enrichedRows.map((t) => {
      const effectiveRowPaid = Number(t._effectivePaid || 0);
      const phaiDong = Number(t.TongTienPhaiDong || 0);
      const conNo = Math.max(phaiDong - effectiveRowPaid, 0);
      const paymentBlock = getPaymentRegistrationBlock(t.HOCKY, new Date(), { pendingAppeals: pendingAppealCountBySemester.get(t.MaHocKy) || 0 });
      const payableReceipt = getPayableReceipt(t);
      const existingReceipt = getExistingReceipt(t);
      const paymentUnavailableReason = getPaymentUnavailableReason({ conNo, paymentBlock, payableReceipt, existingReceipt });
      const effectiveDueDate = getEffectiveTuitionDueDate(t);
      const deadlinePassed = isTuitionDeadlinePassed(effectiveDueDate);
      const camThiCuoiKy = conNo > 0 && deadlinePassed;
      return {
        SoPhieu: t.SoPhieu,
        HoTen: t.SINHVIEN?.HoTen,
        Email: t.SINHVIEN?.Email,
        MaHocKy: t.MaHocKy,
        TenHocKy: t.HOCKY?.TenHocKy,
        TenNamHoc: t.HOCKY?.NAMHOC?.TenNamHoc,
        NgayBatDauDongHocPhi: t.HOCKY?.NgayBatDauDongHocPhi,
        HanDongHocPhiGoc: t.HOCKY?.HanDongHocPhi,
        HanDongHocPhi: effectiveDueDate,
        GiaHanNoHocPhi: hasExtendedTuitionDueDate(t),
        NgayKetThucDangKy: t.HOCKY?.NgayKetThucDangKy,
        TongTienDangKy: Number(t.TongTienDangKy || 0),
        TiLeGiam: Number(t.TiLeGiam || 0),
        TienMienGiam: Number(t.TienMienGiam || 0),
        TongTienPhaiDong: phaiDong,
        TongTienDaDong: effectiveRowPaid,
        conNo,
        CoTheThanhToan: conNo > 0 && !paymentBlock.blocked && Boolean(payableReceipt),
        LyDoChuaTheThanhToan: paymentUnavailableReason,
        PayableReceipt: toReceiptSummaryDto(payableReceipt, conNo),
        ExistingReceipt: toExistingReceiptDto(existingReceipt),
        CamThiCuoiKy: Boolean(camThiCuoiKy),
        ThongBaoCamThi: camThiCuoiKy ? 'Quá hạn đóng học phí và chưa hoàn thành học phí: cấm thi cuối kỳ.' : null,
        TrangThai: tuitionStatus(phaiDong, effectiveRowPaid, effectiveDueDate)
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
    const rows = await prisma.PHIEUDANGKY.findMany({ where, include: { PHIEUTHUHOCPHI: true } });
    const enrichedRows = await attachPaymentSummariesToRegistrations(rows);
    const totalAmount = enrichedRows.reduce((s, r) => s + Number(r.TongTienPhaiDong || 0), 0);
    const paidAmount = enrichedRows.reduce((s, r) => s + Number(r._effectivePaid || 0), 0);
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
