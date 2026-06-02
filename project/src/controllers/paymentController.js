const crypto = require('crypto');
const prisma = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { getActorName } = require('../utils/audit');
const { assertRegistrationPeriodClosedForPayment } = require('../utils/paymentRules');
const { sendErrorResponse } = require('../utils/errorHandler');

const PAYMENT_SUCCESS = 'Thành công';
const PAYMENT_PENDING = 'Chờ xác nhận';
const PAYMENT_FAILED = 'Thất bại';
const PAYMENT_CANCELLED = 'Đã hủy';
const PAYMENT_REFUND = 'Hoàn tiền';

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

const getRegistrationForPayment = async ({ SoPhieu, MaSv, MaHocKy }) => {
  const where = SoPhieu ? { SoPhieu: parseInt(SoPhieu, 10) } : { MaSv, MaHocKy };
  return prisma.PHIEUDANGKY.findFirst({
    where,
    include: { SINHVIEN: true, HOCKY: true, PHIEUTHUHOCPHI: { where: { TrangThai: { in: [PAYMENT_SUCCESS, PAYMENT_REFUND] } } } }
  });
};

const getRemainingAmount = (registration) => {
  const amountDue = Number(registration?.TongTienPhaiDong || 0);
  const payments = registration?.PHIEUTHUHOCPHI || [];
  const paid = payments
    .filter((p) => p.TrangThai === PAYMENT_SUCCESS)
    .reduce((sum, p) => sum + Number(p.SoTienThu || 0), 0);
  const refunded = payments
    .filter((p) => p.TrangThai === PAYMENT_REFUND)
    .reduce((sum, p) => sum + Number(p.SoTienThu || 0), 0);
  return Math.max(amountDue - paid + refunded, 0);
};

const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/"/g, '""');
  return /[",\r\n]/.test(text) ? `"${text}"` : text;
};

const toPaymentDto = (p) => ({
  SoPhieuThu: p.SoPhieuThu,
  SoPhieuDangKy: p.SoPhieuDangKy,
  MaSv: p.MaSv,
  HoTen: p.SINHVIEN?.HoTen || '',
  Email: p.SINHVIEN?.Email || '',
  MaHocKy: p.PHIEUDANGKY?.MaHocKy || '',
  TenHocKy: p.PHIEUDANGKY?.HOCKY?.TenHocKy || '',
  TenNamHoc: p.PHIEUDANGKY?.HOCKY?.NAMHOC?.TenNamHoc || '',
  SoTienThu: Number(p.SoTienThu || 0),
  HinhThucThu: p.HinhThucThu,
  PaymentProvider: p.PaymentProvider,
  PaymentChannel: p.PaymentChannel,
  MaGiaoDich: p.MaGiaoDich,
  NgayLap: p.NgayLap,
  NguoiThu: p.NguoiThu,
  GhiChu: p.GhiChu,
  TrangThai: p.TrangThai,
  NgayXacNhan: p.NgayXacNhan,
  CheckoutUrl: p.CheckoutUrl,
  QrPayload: p.QrPayload
});

const assertPayableAmount = (registration, amount) => {
  if (!registration) throw { status: 404, message: 'Không tìm thấy học phí cần đóng' };
  const remaining = getRemainingAmount(registration);
  const payAmount = Number(amount || remaining);
  if (!Number.isFinite(payAmount) || payAmount <= 0) throw { status: 400, message: 'Số tiền thanh toán không hợp lệ' };
  if (payAmount > remaining) throw { status: 400, message: 'Không thể thu vượt số tiền còn nợ' };
  return payAmount;
};

const buildVnpayUrl = (receipt, amount, req) => {
  const tmnCode = process.env.VNPAY_TMN_CODE || 'SANDBOX';
  const secret = process.env.VNPAY_HASH_SECRET || 'sandbox-secret';
  const returnUrl = process.env.VNPAY_RETURN_URL || `${req.protocol}://${req.get('host')}/api/payments/vnpay-return`;
  const createDate = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: Math.round(amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(receipt.SoPhieuThu),
    vnp_OrderInfo: `Thanh toan hoc phi ${receipt.SoPhieuThu}`,
    vnp_OrderType: 'billpayment',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: req.ip || '127.0.0.1',
    vnp_CreateDate: createDate
  };
  const sorted = Object.keys(params).sort().reduce((acc, key) => ({ ...acc, [key]: params[key] }), {});
  const qs = new URLSearchParams(sorted).toString();
  const secureHash = crypto.createHmac('sha512', secret).update(qs).digest('hex');
  return `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${qs}&vnp_SecureHash=${secureHash}`;
};

const buildZalopayUrl = (receipt, amount) => {
  const appId = process.env.ZALOPAY_APP_ID || '2553';
  const appTransId = `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}_${receipt.SoPhieuThu}`;
  const payload = new URLSearchParams({
    app_id: appId,
    app_trans_id: appTransId,
    amount: String(Math.round(amount)),
    description: `Thanh toan hoc phi ${receipt.SoPhieuThu}`
  });
  return `https://sb-openapi.zalopay.vn/v2/gateway?${payload.toString()}`;
};

const buildVietQrPayload = (registration, receipt, amount) => {
  const bankBin = process.env.BANK_BIN || '970436';
  const accountNo = process.env.BANK_ACCOUNT_NO || '0000000000';
  const accountName = process.env.BANK_ACCOUNT_NAME || 'TRUONG DAI HOC';
  const description = `HP ${registration.MaSv} ${registration.MaHocKy} P${receipt.SoPhieuThu}`;
  const query = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: description,
    accountName
  });
  return `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?${query.toString()}`;
};

const getAllPayments = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search = '', MaHocKy, HinhThucThu, TrangThai } = req.query;
    const where = {};
    if (HinhThucThu) where.HinhThucThu = HinhThucThu;
    if (TrangThai) where.TrangThai = TrangThai;
    if (MaHocKy) where.PHIEUDANGKY = { MaHocKy };
    if (search) where.SINHVIEN = { OR: [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }] };

    const [rows, total] = await Promise.all([
      prisma.PHIEUTHUHOCPHI.findMany({ where, skip, take: limit, orderBy: { NgayLap: 'desc' }, include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } } }),
      prisma.PHIEUTHUHOCPHI.count({ where })
    ]);
    const data = rows.map(toPaymentDto);
    res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get all payments error:');
  }
};

const getPaymentById = async (req, res) => {
  try {
    const p = await prisma.PHIEUTHUHOCPHI.findUnique({ where: { SoPhieuThu: parseInt(req.params.id, 10) }, include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } } });
    if (!p) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    res.json({ success: true, data: toPaymentDto(p) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get payment by ID error:');
  }
};

const getStudentPayments = async (req, res) => {
  try {
    if (!(await ensureStudentAccess(req, res, req.params.studentId))) return;
    const { page, limit, skip } = getPagination(req.query);
    const where = { MaSv: req.params.studentId };
    if (req.query.MaHocKy) where.PHIEUDANGKY = { MaHocKy: req.query.MaHocKy };
    const [rows, total] = await Promise.all([
      prisma.PHIEUTHUHOCPHI.findMany({
        where,
        skip,
        take: limit,
        orderBy: { NgayLap: 'desc' },
        include: { PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } }
      }),
      prisma.PHIEUTHUHOCPHI.count({ where })
    ]);
    res.json({
      success: true,
      data: rows.map((p) => ({ ...toPaymentDto(p), MaHocKy: p.PHIEUDANGKY.MaHocKy, TenHocKy: p.PHIEUDANGKY.HOCKY.TenHocKy })),
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get student payments error:');
  }
};

const createPayment = async (req, res) => {
  try {
    const { MaSv, MaHocKy, SoTienThu, HinhThucThu = 'Tiền mặt', GhiChu } = req.body;
    if (!MaSv || !MaHocKy || !SoTienThu) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
    const registration = await getRegistrationForPayment({ MaSv, MaHocKy });
    const amount = assertPayableAmount(registration, SoTienThu);
    assertRegistrationPeriodClosedForPayment(registration);

    const payment = await prisma.PHIEUTHUHOCPHI.create({
      data: {
        SoPhieuDangKy: registration.SoPhieu,
        MaSv,
        SoTienThu: amount,
        HinhThucThu,
        PaymentProvider: HinhThucThu === 'Tiền mặt' ? 'cash' : 'manual',
        PaymentChannel: 'admin',
        NguoiThu: getActorName(req),
        GhiChu,
        TrangThai: PAYMENT_SUCCESS,
        NgayXacNhan: new Date()
      }
    });
    res.status(201).json({ success: true, message: 'Tạo phiếu thu thành công', data: payment });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return sendErrorResponse(res, error, 'Lỗi server', 'Create payment error:');
  }
};

const checkoutPayment = async (req, res) => {
  try {
    const { SoPhieu, MaSv, MaHocKy, SoTienThu, method = 'cash' } = req.body;
    const currentStudentId = req.user?.Role === 'admin' ? MaSv : await getStudentIdFromRequest(req);
    const registration = await getRegistrationForPayment({ SoPhieu, MaSv: currentStudentId || MaSv, MaHocKy });
    if (!(await ensureStudentAccess(req, res, registration?.MaSv))) return;
    const amount = assertPayableAmount(registration, SoTienThu);
    assertRegistrationPeriodClosedForPayment(registration);

    const provider = String(method).toLowerCase();
    const isCash = provider === 'cash';
    const isQr = provider === 'qr' || provider === 'bank_qr';
    const hinhThuc = isCash ? 'Tiền mặt' : isQr ? 'Chuyển khoản' : 'Ví điện tử';
    let receipt = await prisma.$transaction(async (tx) => {
      const pending = await tx.PHIEUTHUHOCPHI.aggregate({
        where: { SoPhieuDangKy: registration.SoPhieu, TrangThai: PAYMENT_PENDING },
        _sum: { SoTienThu: true }
      });
      if (Number(pending._sum.SoTienThu || 0) + amount > getRemainingAmount(registration)) {
        throw { status: 400, message: 'Sinh viên đã có yêu cầu thanh toán đang chờ xác nhận cho khoản học phí này' };
      }

      return tx.PHIEUTHUHOCPHI.create({
        data: {
          SoPhieuDangKy: registration.SoPhieu,
          MaSv: registration.MaSv,
          SoTienThu: amount,
          HinhThucThu: hinhThuc,
          PaymentProvider: provider,
          PaymentChannel: req.user?.Role === 'admin' ? 'admin' : 'student',
          MaGiaoDich: `${provider.toUpperCase()}-${Date.now()}-${registration.SoPhieu}`,
          NguoiThu: isCash && req.user?.Role === 'admin' ? getActorName(req) : null,
          TrangThai: isCash && req.user?.Role === 'admin' ? PAYMENT_SUCCESS : PAYMENT_PENDING,
          NgayXacNhan: isCash && req.user?.Role === 'admin' ? new Date() : null,
          GhiChu: isCash ? 'Đăng ký đóng tiền mặt' : null
        }
      });
    }, { isolationLevel: 'Serializable' });

    let checkoutUrl = null;
    let qrPayload = null;
    if (provider === 'vnpay') checkoutUrl = buildVnpayUrl(receipt, amount, req);
    if (provider === 'zalopay') checkoutUrl = buildZalopayUrl(receipt, amount);
    if (isQr) qrPayload = buildVietQrPayload(registration, receipt, amount);

    if (checkoutUrl || qrPayload) {
      receipt = await prisma.PHIEUTHUHOCPHI.update({
        where: { SoPhieuThu: receipt.SoPhieuThu },
        data: { CheckoutUrl: checkoutUrl, QrPayload: qrPayload }
      });
    }

    res.status(201).json({
      success: true,
      message: isCash && req.user?.Role === 'admin' ? 'Đã ghi nhận thanh toán' : 'Đã tạo yêu cầu thanh toán',
      data: { receipt, checkoutUrl, qrPayload, remainingAmount: Math.max(getRemainingAmount(registration) - amount, 0) }
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return sendErrorResponse(res, error, 'Lỗi server', 'Checkout payment error:');
  }
};

const markOnlineResult = async (receiptId, success, transactionCode) => {
  const id = parseInt(receiptId, 10);
  if (!Number.isFinite(id)) return null;
  const existing = await prisma.PHIEUTHUHOCPHI.findUnique({
    where: { SoPhieuThu: id },
    include: { PHIEUDANGKY: { include: { HOCKY: true } } }
  });
  if (!existing) return null;
  if (success) assertRegistrationPeriodClosedForPayment(existing.PHIEUDANGKY);

  return prisma.PHIEUTHUHOCPHI.update({
    where: { SoPhieuThu: id },
    data: {
      TrangThai: success ? PAYMENT_SUCCESS : PAYMENT_FAILED,
      MaGiaoDich: transactionCode || undefined,
      NgayXacNhan: success ? new Date() : null,
      NgayCapNhat: new Date()
    }
  });
};

const verifyVnpaySignature = (query) => {
  const vnp_SecureHash = query.vnp_SecureHash;
  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  const sorted = Object.keys(params).sort().reduce((acc, key) => ({ ...acc, [key]: params[key] }), {});
  const qs = new URLSearchParams(sorted).toString();
  const secret = process.env.VNPAY_HASH_SECRET || 'sandbox-secret';
  const signed = crypto.createHmac('sha512', secret).update(qs).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signed, 'utf8'), Buffer.from(vnp_SecureHash || '', 'utf8'));
  } catch {
    return false;
  }
};

const vnpayReturn = async (req, res) => {
  try {
    if (!verifyVnpaySignature(req.query)) {
      return res.status(400).json({ success: false, message: 'Chữ ký VNPAY không hợp lệ' });
    }
    const success = req.query.vnp_ResponseCode === '00';
    const payment = await markOnlineResult(req.query.vnp_TxnRef, success, req.query.vnp_TransactionNo);
    res.json({ success: true, data: payment, message: success ? 'Thanh toán VNPAY thành công' : 'Thanh toán VNPAY thất bại' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return sendErrorResponse(res, error, 'Không thể cập nhật thanh toán VNPAY', 'VNPAY return error:');
  }
};

const vnpayIpn = async (req, res) => {
  try {
    if (!verifyVnpaySignature(req.query)) {
      return res.json({ RspCode: '97', Message: 'Invalid Checksum' });
    }
    const success = req.query.vnp_ResponseCode === '00';
    await markOnlineResult(req.query.vnp_TxnRef, success, req.query.vnp_TransactionNo);
    res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('VNPAY IPN error:', error);
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
};

const verifyZalopayMac = (body) => {
  const key2 = process.env.ZALOPAY_KEY2 || 'sandbox-key2';
  const mac = crypto.createHmac('sha256', key2).update(String(body.data || '')).digest('hex');
  return mac === body.mac;
};

const zalopayCallback = async (req, res) => {
  try {
    if (!verifyZalopayMac(req.body)) {
      return res.json({ return_code: -1, return_message: 'mac not equal' });
    }
    const receiptId = String(req.body.app_trans_id || '').split('_').pop();
    const success = Number(req.body.status || req.body.return_code || 0) === 1;
    await markOnlineResult(receiptId, success, req.body.zp_trans_id);
    res.json({ return_code: 1, return_message: 'success' });
  } catch (error) {
    console.error('ZaloPay callback error:', error);
    res.json({ return_code: 0, return_message: 'failed' });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const existing = await prisma.PHIEUTHUHOCPHI.findUnique({
      where: { SoPhieuThu: parseInt(req.params.id, 10) },
      include: {
        PHIEUDANGKY: {
          include: {
            HOCKY: true,
            PHIEUTHUHOCPHI: { where: { TrangThai: PAYMENT_SUCCESS } }
          }
        }
      }
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    if (existing.TrangThai === PAYMENT_SUCCESS) {
      return res.json({ success: true, message: 'Phiếu thu đã được xác nhận', data: existing });
    }
    if ([PAYMENT_FAILED, PAYMENT_CANCELLED].includes(existing.TrangThai)) {
      return res.status(400).json({ success: false, message: 'Không thể xác nhận phiếu thu đã thất bại hoặc đã hủy' });
    }
    assertRegistrationPeriodClosedForPayment(existing.PHIEUDANGKY);

    const remaining = getRemainingAmount(existing.PHIEUDANGKY);
    if (Number(existing.SoTienThu || 0) > remaining) {
      return res.status(400).json({ success: false, message: 'Số tiền phiếu thu vượt số học phí còn nợ' });
    }

    const payment = await prisma.PHIEUTHUHOCPHI.update({
      where: { SoPhieuThu: existing.SoPhieuThu },
      data: {
        TrangThai: PAYMENT_SUCCESS,
        NguoiThu: getActorName(req),
        NgayXacNhan: new Date(),
        NgayCapNhat: new Date()
      }
    });
    res.json({ success: true, message: 'Đã xác nhận thanh toán', data: payment });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return sendErrorResponse(res, error, 'Lỗi server', 'Confirm payment error:');
  }
};

const cancelPayment = async (req, res) => {
  try {
    const existing = await prisma.PHIEUTHUHOCPHI.findUnique({ where: { SoPhieuThu: parseInt(req.params.id, 10) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    if (existing.TrangThai === PAYMENT_SUCCESS) {
      return res.status(400).json({ success: false, message: 'Không thể hủy phiếu thu đã thành công. Vui lòng sử dụng chức năng hoàn tiền.' });
    }
    if (existing.TrangThai === PAYMENT_CANCELLED) {
      return res.status(400).json({ success: false, message: 'Phiếu thu đã được hủy trước đó' });
    }
    await prisma.PHIEUTHUHOCPHI.update({ where: { SoPhieuThu: existing.SoPhieuThu }, data: { TrangThai: PAYMENT_CANCELLED, NgayCapNhat: new Date() } });
    res.json({ success: true, message: 'Hủy phiếu thu thành công' });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'Cancel payment error:');
  }
};

const getPaymentStats = async (req, res) => {
  try {
    const where = { TrangThai: PAYMENT_SUCCESS };
    if (req.query.MaHocKy) where.PHIEUDANGKY = { MaHocKy: req.query.MaHocKy };
    const rows = await prisma.PHIEUTHUHOCPHI.findMany({ where });
    const totalAmount = rows.reduce((s, p) => s + Number(p.SoTienThu), 0);
    const byMethodMap = rows.reduce((acc, p) => {
      const key = p.PaymentProvider || p.HinhThucThu || 'Khác';
      if (!acc[key]) acc[key] = { HinhThucThu: key, count: 0, total: 0 };
      acc[key].count += 1;
      acc[key].total += Number(p.SoTienThu);
      return acc;
    }, {});
    res.json({ success: true, data: { totalReceipts: rows.length, totalAmount, byMethod: Object.values(byMethodMap) } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get payment stats error:');
  }
};

const exportPayments = async (req, res) => {
  try {
    const { search = '', MaHocKy, HinhThucThu, TrangThai } = req.query;
    const where = {};
    if (HinhThucThu) where.HinhThucThu = HinhThucThu;
    if (TrangThai) where.TrangThai = TrangThai;
    if (MaHocKy) where.PHIEUDANGKY = { MaHocKy };
    if (search) where.SINHVIEN = { OR: [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }] };

    const rows = await prisma.PHIEUTHUHOCPHI.findMany({
      where,
      orderBy: { NgayLap: 'desc' },
      include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } }
    });

    const header = ['SoPhieuThu', 'MSSV', 'HoTen', 'HocKy', 'NamHoc', 'SoTienThu', 'HinhThucThu', 'NgayLap', 'NguoiThu', 'MaGiaoDich', 'TrangThai', 'GhiChu'];
    const lines = [header.join(',')];
    rows.map(toPaymentDto).forEach((p) => {
      lines.push([
        p.SoPhieuThu,
        p.MaSv,
        p.HoTen,
        p.TenHocKy,
        p.TenNamHoc,
        p.SoTienThu,
        p.HinhThucThu,
        p.NgayLap ? new Date(p.NgayLap).toISOString() : '',
        p.NguoiThu,
        p.MaGiaoDich,
        p.TrangThai,
        p.GhiChu
      ].map(csvCell).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="phieu-thu-hoc-phi.csv"');
    res.send('\uFEFF' + lines.join('\n'));
  } catch (error) {
        return sendErrorResponse(res, error, 'Không thể xuất phiếu thu', 'Export payments error:');
  }
};

const refundPayment = async (req, res) => {
  try {
    const { SoPhieuThuGoc, SoTienHoan, LyDo } = req.body;
    if (!SoPhieuThuGoc || !SoTienHoan) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số phiếu thu gốc và số tiền hoàn' });
    }
    const refundAmount = Number(SoTienHoan);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền hoàn không hợp lệ' });
    }

    const originalPayment = await prisma.PHIEUTHUHOCPHI.findUnique({
      where: { SoPhieuThu: parseInt(SoPhieuThuGoc, 10) },
      include: { PHIEUDANGKY: { include: { HOCKY: true, PHIEUTHUHOCPHI: true } } }
    });
    if (!originalPayment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu gốc' });
    }
    if (originalPayment.TrangThai !== PAYMENT_SUCCESS) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hoàn tiền cho phiếu thu đã thành công' });
    }
    if (refundAmount > Number(originalPayment.SoTienThu || 0)) {
      return res.status(400).json({ success: false, message: 'Số tiền hoàn không được vượt quá số tiền phiếu thu gốc' });
    }

    const refund = await prisma.PHIEUTHUHOCPHI.create({
      data: {
        SoPhieuDangKy: originalPayment.SoPhieuDangKy,
        MaSv: originalPayment.MaSv,
        SoTienThu: refundAmount,
        HinhThucThu: originalPayment.HinhThucThu,
        PaymentProvider: 'refund',
        PaymentChannel: 'admin',
        MaGiaoDich: `REFUND-${originalPayment.SoPhieuThu}-${Date.now()}`,
        NguoiThu: getActorName(req),
        GhiChu: `Hoàn tiền từ phiếu thu #${originalPayment.SoPhieuThu}${LyDo ? ` - ${LyDo}` : ''}`,
        TrangThai: PAYMENT_REFUND,
        NgayXacNhan: new Date()
      }
    });
    res.status(201).json({ success: true, message: 'Tạo phiếu hoàn tiền thành công', data: refund });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return sendErrorResponse(res, error, 'Lỗi server', 'Refund payment error:');
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  getStudentPayments,
  createPayment,
  checkoutPayment,
  vnpayReturn,
  vnpayIpn,
  zalopayCallback,
  confirmPayment,
  cancelPayment,
  refundPayment,
  getPaymentStats,
  exportPayments
};
