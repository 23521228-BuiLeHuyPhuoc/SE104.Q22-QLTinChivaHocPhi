const crypto = require('crypto');
const prisma = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { filterRowsByRegex, paginateRows } = require('../utils/searchRegex');
const { getActorName } = require('../utils/audit');
const { assertRegistrationPeriodClosedForPayment } = require('../utils/paymentRules');
const { sendErrorResponse } = require('../utils/errorHandler');
const { PAYMENT_STATUS, PAYMENT_METHOD, APPEAL_STATUS } = require('../utils/businessConstants');
const { createTuitionPaymentNotification } = require('../utils/notificationEvents');
const {
  emptyTotals,
  toNumber,
  getTransactionTotalsByRegistration,
  getTransactionTotalsByReceipt,
  getReceiptTransactions,
  getLatestPendingTransaction,
  getTransactionById,
  getEffectivePaid,
  getReceiptRemaining,
  getRegistrationRemaining,
  attachReceiptSummaries
} = require('../utils/paymentLedger');

const PAYMENT_UNPAID = PAYMENT_STATUS.UNPAID;
const PAYMENT_SUCCESS = PAYMENT_STATUS.SUCCESS;
const PAYMENT_PENDING = PAYMENT_STATUS.PENDING;
const PAYMENT_FAILED = PAYMENT_STATUS.FAILED;
const PAYMENT_CANCELLED = PAYMENT_STATUS.CANCELLED;
const PAYMENT_REFUND = PAYMENT_STATUS.REFUND;
const ACTIVE_RECEIPT_STATUSES = [PAYMENT_UNPAID, PAYMENT_PENDING, PAYMENT_FAILED];
const PAYMENT_SEARCH_FIELDS = new Set(['all', 'SoPhieuThu', 'MaSv', 'HoTen']);
const CASH_PAYMENT_INSTRUCTION = 'Vui lòng đem tiền mặt tới phòng tài chính A.101 để thanh toán và được phòng tài chính xác nhận thanh toán.';
const ONLINE_PAYMENT_PROVIDERS = new Set(['vnpay', 'zalopay']);
const MANUAL_CONFIRMATION_PROVIDERS = new Set(['cash', 'qr', 'bank_qr']);
const ZALOPAY_DEFAULT_MIN_AMOUNT = 1000;
const ZALOPAY_AMOUNT_TOO_SMALL_CODE = 'ZALOPAY_AMOUNT_TOO_SMALL';

const getZalopayMinAmount = () => {
  const amount = Number(process.env.ZALOPAY_MIN_AMOUNT || ZALOPAY_DEFAULT_MIN_AMOUNT);
  return Number.isFinite(amount) && amount > 0 ? amount : ZALOPAY_DEFAULT_MIN_AMOUNT;
};

const getZalopayAmountTooSmallMessage = (includeMinAmount = true) => {
  if (!includeMinAmount) {
    return 'S\u1ed1 ti\u1ec1n thanh to\u00e1n qu\u00e1 nh\u1ecf \u0111\u1ed1i v\u1edbi ZaloPay. Vui l\u00f2ng nh\u1eadp s\u1ed1 ti\u1ec1n l\u1edbn h\u01a1n ho\u1eb7c ch\u1ecdn thanh to\u00e1n to\u00e0n b\u1ed9.';
  }
  return 'S\u1ed1 ti\u1ec1n thanh to\u00e1n qu\u00e1 nh\u1ecf \u0111\u1ed1i v\u1edbi ZaloPay. Vui l\u00f2ng nh\u1eadp t\u1ed1i thi\u1ec3u ' + getZalopayMinAmount().toLocaleString('vi-VN') + '\u0111 ho\u1eb7c ch\u1ecdn thanh to\u00e1n to\u00e0n b\u1ed9.';
};

const normalizeGatewayText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const isZalopayAmountTooSmallResponse = (result = {}) => {
  const text = normalizeGatewayText([
    result.return_message,
    result.sub_return_message,
    result.message,
    result.sub_message,
    result.sub_msg,
    result.return_code,
    result.sub_return_code
  ].filter((item) => item !== undefined && item !== null).join(' '));
  return /(amount|so tien)/.test(text) && /(too small|small|min|minimum|toi thieu|nho|be hon|it nhat|invalid|khong hop le)/.test(text);
};

const throwZalopayAmountTooSmall = (includeMinAmount = true) => {
  throw {
    status: 400,
    code: ZALOPAY_AMOUNT_TOO_SMALL_CODE,
    message: getZalopayAmountTooSmallMessage(includeMinAmount)
  };
};

const assertZalopayAmountAllowed = (amount) => {
  const roundedAmount = Math.round(Number(amount || 0));
  if (roundedAmount > 0 && roundedAmount < getZalopayMinAmount()) throwZalopayAmountTooSmall(true);
};

const firstHeaderValue = (value) => String(Array.isArray(value) ? value[0] : value || '').split(',')[0].trim();

const normalizeBaseUrl = (value) => String(value || '').replace(/\/$/, '');

const isLocalBaseUrl = (value) => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
};

const getRequestBaseUrl = (req) => {
  const forwardedProto = firstHeaderValue(req.get('x-forwarded-proto'));
  const forwardedHost = firstHeaderValue(req.get('x-forwarded-host'));
  const proto = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host');
  return normalizeBaseUrl(`${proto}://${host}`);
};

const getBaseUrl = (req) => {
  const requestBaseUrl = getRequestBaseUrl(req);
  if (!isLocalBaseUrl(requestBaseUrl)) return requestBaseUrl;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL || process.env.NGROK || process.env.APP_PUBLIC_URL;
  return normalizeBaseUrl(publicBaseUrl || process.env.APP_BASE_URL || requestBaseUrl);
};

const getPaymentUrl = (req, envName, fallbackPath) => {
  const baseUrl = getBaseUrl(req);
  const configured = normalizeBaseUrl(process.env[envName]);
  if (configured && (!isLocalBaseUrl(configured) || isLocalBaseUrl(baseUrl))) return configured;
  return `${baseUrl}${fallbackPath}`;
};

const requirePaymentEnv = (names, provider) => {
  const missing = names.filter((name) => !String(process.env[name] || '').trim());
  if (missing.length) {
    throw {
      status: 400,
      code: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
      message: `Chưa cấu hình ${provider}: vui lòng thêm ${missing.join(', ')} trong file .env`
    };
  }
};

const getPaymentSearchValues = (row, searchField = 'all') => {
  const field = PAYMENT_SEARCH_FIELDS.has(searchField) ? searchField : 'all';
  const values = {
    SoPhieuThu: [row.SoPhieuThu],
    MaSv: [row.MaSv],
    HoTen: [row.SINHVIEN?.HoTen]
  };
  return field === 'all' ? Object.values(values).flat() : (values[field] || []);
};

const getPaymentDisplayStatus = (row) => row.TrangThaiHienThi || row.TrangThai || '';

const getSemesterKindLabel = (semester) => {
  if (!semester) return '';
  const order = Number(semester.ThuTu || 1);
  const type = String(semester.LoaiHocKy || '').toLowerCase();
  if (order === 3 || type.startsWith('h')) return 'Học kỳ Hè';
  if (order === 2) return 'Học kỳ II';
  return 'Học kỳ I';
};

const getSemesterDisplayLabel = (semester) => {
  if (!semester) return '';
  const yearName = semester.NAMHOC?.TenNamHoc || semester.MaNamHoc || '';
  return `${getSemesterKindLabel(semester)}${yearName ? ` - ${yearName}` : ''}`;
};

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

const getRegistrationWithReceipts = async ({ SoPhieu, MaSv, MaHocKy }) => {
  const where = SoPhieu ? { SoPhieu: parseInt(SoPhieu, 10) } : { MaSv, MaHocKy };
  return prisma.PHIEUDANGKY.findFirst({
    where,
    include: { SINHVIEN: true, HOCKY: true, PHIEUTHUHOCPHI: true }
  });
};

const getPendingAppealCount = (maHocKy, maSv) => prisma.DONCUUXETDANGKY.count({
  where: {
    MaHocKy: maHocKy || undefined,
    MaSv: maSv || undefined,
    TrangThai: APPEAL_STATUS.PENDING
  }
});

const getRegistrationPaymentTotals = async (registration, client = prisma) => {
  const soPhieu = Number(registration?.SoPhieu);
  if (!Number.isFinite(soPhieu)) return emptyTotals();
  const totals = await getTransactionTotalsByRegistration(client, [soPhieu]);
  return totals.get(soPhieu) || emptyTotals();
};

const getRemainingAmount = async (registration, client = prisma) => getRegistrationRemaining(
  registration,
  await getRegistrationPaymentTotals(registration, client)
);

const getMinimumCreditsForPayment = async () => {
  const settings = await prisma.THAMSO.findFirst({ select: { SoTinChiDangKyToiThieu: true } });
  return Number(settings?.SoTinChiDangKyToiThieu || 0);
};

const assertMinimumCreditsForPayment = async (registration, configuredMinimumCredits) => {
  const minimumCredits = configuredMinimumCredits === undefined
    ? await getMinimumCreditsForPayment()
    : Number(configuredMinimumCredits || 0);
  const registeredCredits = Number(registration?.TongTinChi || 0);
  if (minimumCredits > 0 && registeredCredits < minimumCredits) {
    throw {
      status: 400,
      code: 'REGISTRATION_MIN_CREDITS_NOT_MET',
      message: `Phiếu đăng ký hiện có ${registeredCredits} tín chỉ, chưa đạt tối thiểu ${minimumCredits} tín chỉ để thanh toán học phí`
    };
  }
};

const assertPaymentWindowOpen = async (registration) => {
  const pendingAppeals = await getPendingAppealCount(registration?.MaHocKy, registration?.MaSv);
  const block = assertRegistrationPeriodClosedForPayment(registration, new Date(), { pendingAppeals });
  await assertMinimumCreditsForPayment(registration);
  return block;
};

const getActiveReceipt = (registration) => (registration?.PHIEUTHUHOCPHI || [])
  .find((receipt) => ACTIVE_RECEIPT_STATUSES.includes(receipt.TrangThai));

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
  TenHocKy: getSemesterKindLabel(p.PHIEUDANGKY?.HOCKY),
  TenNamHoc: p.PHIEUDANGKY?.HOCKY?.NAMHOC?.TenNamHoc || '',
  HocKyLabel: getSemesterKindLabel(p.PHIEUDANGKY?.HOCKY),
  HocKyDisplay: getSemesterDisplayLabel(p.PHIEUDANGKY?.HOCKY),
  SoTienThu: Number(p.SoTienThu || 0),
  TongTienDaThanhToan: Number(p.TongTienDaThanhToan || 0),
  TongTienDangChoXacNhan: Number(p.TongTienDangChoXacNhan || 0),
  ConNoPhieuThu: Number(p.ConNoPhieuThu || 0),
  ConNoDangKy: Number(p.ConNoDangKy || 0),
  SoTienThanhToanToiDa: p.SoTienThanhToanToiDa === undefined || p.SoTienThanhToanToiDa === null
    ? Number(p.ConNoPhieuThu || 0)
    : Number(p.SoTienThanhToanToiDa || 0),
  LanThanhToan: p.LanThanhToan || p.transactions || [],
  HinhThucThu: p.HinhThucThu,
  PaymentProvider: p.PaymentProvider,
  PaymentChannel: p.PaymentChannel,
  MaGiaoDich: p.MaGiaoDich,
  NgayLap: p.NgayLap,
  NguoiThu: p.NguoiThu,
  GhiChu: p.GhiChu,
  TrangThai: p.TrangThai,
  TrangThaiGoc: p.TrangThai,
  TrangThaiHienThi: getPaymentDisplayStatus(p),
  TrangThaiThanhToan: p.TrangThaiThanhToan || 'unknown',
  NgayXacNhan: p.NgayXacNhan,
  CheckoutUrl: p.CheckoutUrl,
  QrPayload: p.QrPayload
});

const assertPayableAmount = async (registration, amount) => {
  if (!registration) throw { status: 404, message: 'Không tìm thấy học phí cần đóng' };
  const remaining = await getRemainingAmount(registration);
  const payAmount = amount === undefined || amount === null || amount === '' ? remaining : Number(amount);
  if (!Number.isFinite(payAmount) || payAmount <= 0) throw { status: 400, message: 'Số tiền thanh toán không hợp lệ' };
  if (payAmount > remaining) throw { status: 400, message: 'Số tiền thanh toán không được vượt số tiền còn phải đóng của phiếu' };
  return payAmount;
};

const formatVnpayDate = (date = new Date()) => {
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, '0');
  return [
    local.getUTCFullYear(),
    pad(local.getUTCMonth() + 1),
    pad(local.getUTCDate()),
    pad(local.getUTCHours()),
    pad(local.getUTCMinutes()),
    pad(local.getUTCSeconds())
  ].join('');
};

const getVnpayIpAddress = (req) => {
  const forwarded = firstHeaderValue(req.get('x-forwarded-for'));
  const raw = forwarded || req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const text = String(raw).replace(/^::ffff:/, '');
  return text === '::1' || text === '::' ? '127.0.0.1' : text;
};

const encodeVnpayValue = (value) => encodeURIComponent(String(value)).replace(/%20/g, '+');

const stringifyVnpayParams = (params) => Object.keys(params)
  .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
  .sort()
  .map((key) => `${encodeURIComponent(key)}=${encodeVnpayValue(params[key])}`)
  .join('&');

const buildVnpayUrl = (receipt, amount, req, transactionRef = String(receipt.SoPhieuThu)) => {
  requirePaymentEnv(['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET'], 'VNPAY');
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secret = process.env.VNPAY_HASH_SECRET;
  const paymentUrl = process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = getPaymentUrl(req, 'VNPAY_RETURN_URL', '/api/payments/vnpay-return');
  const createDate = formatVnpayDate();
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: Math.round(amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(transactionRef),
    vnp_OrderInfo: `Thanh toan hoc phi ${receipt.SoPhieuThu}`,
    vnp_OrderType: 'billpayment',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: getVnpayIpAddress(req),
    vnp_CreateDate: createDate,
    vnp_ExpireDate: formatVnpayDate(new Date(Date.now() + 15 * 60 * 1000))
  };
  const qs = stringifyVnpayParams(params);
  const secureHash = crypto.createHmac('sha512', secret).update(qs).digest('hex');
  return `${paymentUrl}?${qs}&vnp_SecureHash=${secureHash}`;
};

const createZalopayOrder = async (receipt, amount, req, transactionRef = String(receipt.SoPhieuThu)) => {
  assertZalopayAmountAllowed(amount);
  requirePaymentEnv(['ZALOPAY_APP_ID', 'ZALOPAY_KEY1', 'ZALOPAY_KEY2'], 'ZaloPay');
  const appId = process.env.ZALOPAY_APP_ID;
  const key1 = process.env.ZALOPAY_KEY1;
  const endpoint = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
  const appTransId = `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}_${transactionRef}`;
  const returnUrl = getPaymentUrl(req, 'ZALOPAY_RETURN_URL', '/api/payments/zalopay-return');
  const callbackUrl = getPaymentUrl(req, 'ZALOPAY_CALLBACK_URL', '/api/payments/zalopay-callback');
  const embedData = JSON.stringify({
    redirecturl: `${returnUrl}?ref=${encodeURIComponent(transactionRef)}&receipt=${encodeURIComponent(receipt.SoPhieuThu)}`,
    receipt_id: receipt.SoPhieuThu,
    transaction_ref: transactionRef
  });
  const item = JSON.stringify([{ itemid: `PTHP-${receipt.SoPhieuThu}`, itemname: `Phiếu thu #${receipt.SoPhieuThu}`, itemprice: Math.round(amount), itemquantity: 1 }]);
  const appTime = Date.now();
  const order = {
    app_id: appId,
    app_trans_id: appTransId,
    app_user: receipt.MaSv,
    app_time: appTime,
    amount: Math.round(amount),
    item,
    embed_data: embedData,
    description: `Thanh toán học phí phiếu thu #${receipt.SoPhieuThu}`,
    callback_url: callbackUrl
  };
  const macData = [order.app_id, order.app_trans_id, order.app_user, order.amount, order.app_time, order.embed_data, order.item].join('|');
  order.mac = crypto.createHmac('sha256', key1).update(macData).digest('hex');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.entries(order).map(([key, value]) => [key, String(value)]))
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || Number(result.return_code || 0) !== 1) {
    if (isZalopayAmountTooSmallResponse(result)) throwZalopayAmountTooSmall(false);
    throw {
      status: 502,
      code: 'ZALOPAY_CREATE_ORDER_FAILED',
      message: result.return_message || result.sub_return_message || 'Không tạo được đơn thanh toán ZaloPay'
    };
  }

  const checkoutUrl = result.order_url || result.orderurl;
  if (!checkoutUrl) {
    throw {
      status: 502,
      code: 'ZALOPAY_CREATE_ORDER_URL_MISSING',
      message: 'ZaloPay không trả về URL thanh toán'
    };
  }

  return {
    checkoutUrl,
    appTransId,
    raw: result
  };
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

const syncReceiptStatus = async (client, receiptId, options = {}) => {
  const receipt = await client.PHIEUTHUHOCPHI.findUnique({
    where: { SoPhieuThu: Number(receiptId) },
    include: { PHIEUDANGKY: true }
  });
  if (!receipt) return null;
  if (receipt.TrangThai === PAYMENT_CANCELLED) return receipt;

  const totalsByReceipt = await getTransactionTotalsByReceipt(client, [receipt.SoPhieuThu]);
  const totals = totalsByReceipt.get(Number(receipt.SoPhieuThu)) || emptyTotals();
  const remaining = getReceiptRemaining(receipt, totals);

  let nextStatus = PAYMENT_UNPAID;
  if (toNumber(totals.pending) > 0) nextStatus = PAYMENT_PENDING;
  else if (remaining <= 0 && toNumber(receipt.SoTienThu) > 0) nextStatus = PAYMENT_SUCCESS;
  else if (options.failed) nextStatus = PAYMENT_FAILED;

  const latestRows = await client.$queryRaw`
    SELECT *
    FROM "GIAODICHTHANHTOANHOCPHI"
    WHERE "SoPhieuThu" = ${Number(receipt.SoPhieuThu)}
      AND "TrangThai" IN (${PAYMENT_SUCCESS}, ${PAYMENT_PENDING}, ${PAYMENT_FAILED})
    ORDER BY "NgayCapNhat" DESC NULLS LAST, "NgayTao" DESC, "MaGiaoDichThanhToan" DESC
    LIMIT 1
  `;
  const latest = latestRows[0] || null;

  return client.PHIEUTHUHOCPHI.update({
    where: { SoPhieuThu: receipt.SoPhieuThu },
    data: {
      TrangThai: nextStatus,
      HinhThucThu: latest?.HinhThucThanhToan || receipt.HinhThucThu,
      PaymentProvider: latest?.PaymentProvider || receipt.PaymentProvider,
      PaymentChannel: latest?.PaymentChannel || receipt.PaymentChannel,
      MaGiaoDich: latest?.MaGiaoDich || receipt.MaGiaoDich,
      CheckoutUrl: latest?.CheckoutUrl || null,
      QrPayload: latest?.QrPayload || null,
      NguoiThu: nextStatus === PAYMENT_SUCCESS ? (latest?.NguoiXacNhan || receipt.NguoiThu) : receipt.NguoiThu,
      NgayXacNhan: nextStatus === PAYMENT_SUCCESS ? (latest?.NgayXacNhan || new Date()) : null,
      NgayCapNhat: new Date()
    }
  });
};

const getAllPayments = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query);
    const { search = '', searchField = 'all', MaHocKy, HinhThucThu, TrangThai } = req.query;
    const where = {};
    if (HinhThucThu) where.HinhThucThu = HinhThucThu;
    if (MaHocKy) where.PHIEUDANGKY = { MaHocKy };

    const rows = await prisma.PHIEUTHUHOCPHI.findMany({
      where,
      orderBy: { NgayLap: 'desc' },
      include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } }
    });
    const totalsByReceipt = await getTransactionTotalsByReceipt(prisma, rows.map((row) => row.SoPhieuThu));
    const totalsByRegistration = await getTransactionTotalsByRegistration(prisma, rows.map((row) => row.SoPhieuDangKy));
    const enrichedRows = attachReceiptSummaries(rows, totalsByReceipt, totalsByRegistration);
    const searched = filterRowsByRegex(enrichedRows, search, (row) => getPaymentSearchValues(row, searchField));
    const filtered = TrangThai ? searched.filter((row) => getPaymentDisplayStatus(row) === TrangThai) : searched;
    const data = paginateRows(filtered, page, limit).map(toPaymentDto);
    res.json({ success: true, data, pagination: getPaginationMeta(filtered.length, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'L?i server', 'Get all payments error:');
  }
};

const getPaymentById = async (req, res) => {
  try {
    const p = await prisma.PHIEUTHUHOCPHI.findUnique({ where: { SoPhieuThu: parseInt(req.params.id, 10) }, include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } } });
    if (!p) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    if (!(await ensureStudentAccess(req, res, p.MaSv))) return;
    const [totalsByReceipt, totalsByRegistration, transactions] = await Promise.all([
      getTransactionTotalsByReceipt(prisma, [p.SoPhieuThu]),
      getTransactionTotalsByRegistration(prisma, [p.SoPhieuDangKy]),
      getReceiptTransactions(prisma, p.SoPhieuThu)
    ]);
    const enriched = attachReceiptSummaries([p], totalsByReceipt, totalsByRegistration)[0];
    enriched.LanThanhToan = transactions.map((item) => ({
      ...item,
      SoTienThanhToan: Number(item.SoTienThanhToan || 0)
    }));
    res.json({ success: true, data: toPaymentDto(enriched) });
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
    const totalsByReceipt = await getTransactionTotalsByReceipt(prisma, rows.map((row) => row.SoPhieuThu));
    const totalsByRegistration = await getTransactionTotalsByRegistration(prisma, rows.map((row) => row.SoPhieuDangKy));
    res.json({
      success: true,
      data: attachReceiptSummaries(rows, totalsByReceipt, totalsByRegistration).map(toPaymentDto),
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get student payments error:');
  }
};

const createPayment = async (req, res) => {
  try {
    const { SoPhieuDangKy, MaSv, MaHocKy, SoTienThu, HinhThucThu = PAYMENT_METHOD.CASH, GhiChu } = req.body;
    if (!SoPhieuDangKy && (!MaSv || !MaHocKy)) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp phiếu đăng ký hoặc MSSV và học kỳ' });
    }
    const registration = await getRegistrationWithReceipts({ SoPhieu: SoPhieuDangKy, MaSv, MaHocKy });
    const amount = await assertPayableAmount(registration, SoTienThu);
    await assertPaymentWindowOpen(registration);

    const activeReceipt = getActiveReceipt(registration);
    if (activeReceipt) {
      return res.status(400).json({ success: false, message: 'Phiếu đăng ký đã có phiếu thu đang hiệu lực, không thể tạo trùng' });
    }

    const payment = await prisma.PHIEUTHUHOCPHI.create({
      data: {
        SoPhieuDangKy: registration.SoPhieu,
        MaSv: registration.MaSv,
        SoTienThu: amount,
        HinhThucThu,
        PaymentProvider: 'invoice',
        PaymentChannel: 'admin',
        NguoiThu: getActorName(req),
        GhiChu,
        TrangThai: PAYMENT_UNPAID
      }
    });
    res.status(201).json({ success: true, message: 'Tạo phiếu thu thành công', data: payment });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return sendErrorResponse(res, error, 'Lỗi server', 'Create payment error:');
  }
};

const createBulkPayments = async (req, res) => {
  try {
    const { MaHocKy, MaSvList } = req.body;
    if (!MaHocKy) return res.status(400).json({ success: false, message: 'Vui lòng chọn học kỳ' });
    const studentFilter = Array.isArray(MaSvList) && MaSvList.length
      ? { MaSv: { in: MaSvList.map((item) => String(item).trim()).filter(Boolean) } }
      : {};

    const semester = await prisma.HOCKY.findFirst({ where: { MaHocKy, DaXoa: false } });
    if (!semester) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    const pendingAppeals = await getPendingAppealCount(MaHocKy);
    assertRegistrationPeriodClosedForPayment({ HOCKY: semester }, new Date(), { pendingAppeals });

    const registrations = await prisma.PHIEUDANGKY.findMany({
      where: { MaHocKy, ...studentFilter, SINHVIEN: { DaXoa: false } },
      include: { HOCKY: true, PHIEUTHUHOCPHI: true, SINHVIEN: true }
    });

    const minimumCreditsForPayment = await getMinimumCreditsForPayment();
    const created = [];
    const skipped = [];
    for (const registration of registrations) {
      const amount = await getRemainingAmount(registration);
      if (amount <= 0) {
        skipped.push({ SoPhieu: registration.SoPhieu, MaSv: registration.MaSv, HoTen: registration.SINHVIEN?.HoTen || '', reason: 'Không còn nợ' });
        continue;
      }
      if (getActiveReceipt(registration)) {
        skipped.push({ SoPhieu: registration.SoPhieu, MaSv: registration.MaSv, HoTen: registration.SINHVIEN?.HoTen || '', reason: 'Đã có phiếu thu' });
        continue;
      }
      try {
        await assertMinimumCreditsForPayment(registration, minimumCreditsForPayment);
      } catch (error) {
        if (error.code === 'REGISTRATION_MIN_CREDITS_NOT_MET') {
          skipped.push({ SoPhieu: registration.SoPhieu, MaSv: registration.MaSv, HoTen: registration.SINHVIEN?.HoTen || '', reason: error.message });
          continue;
        }
        throw error;
      }

      const payment = await prisma.PHIEUTHUHOCPHI.create({
        data: {
          SoPhieuDangKy: registration.SoPhieu,
          MaSv: registration.MaSv,
          SoTienThu: amount,
          HinhThucThu: null,
          PaymentProvider: 'invoice',
          PaymentChannel: 'admin',
          NguoiThu: getActorName(req),
          TrangThai: PAYMENT_UNPAID,
          GhiChu: 'Tạo phiếu thu hàng loạt'
        }
      });
      created.push({
        SoPhieuThu: payment.SoPhieuThu,
        SoPhieuDangKy: registration.SoPhieu,
        MaSv: registration.MaSv,
        HoTen: registration.SINHVIEN?.HoTen || '',
        SoTienThu: Number(payment.SoTienThu || amount),
        TrangThai: payment.TrangThai
      });
    }

    res.status(201).json({
      success: true,
      message: `Đã tạo ${created.length} phiếu thu, bỏ qua ${skipped.length} phiếu`,
      data: { created, skipped, total: registrations.length }
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message, code: error.code });
    return sendErrorResponse(res, error, 'Không thể tạo phiếu thu hàng loạt', 'Create bulk payments error:');
  }
};

const checkoutPayment = async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id || req.body.SoPhieuThu || req.body.id, 10);
    const { SoPhieu, MaSv, MaHocKy, SoTienThu, method = 'cash', paymentMode = 'full' } = req.body;
    let receipt = Number.isFinite(receiptId) ? await prisma.PHIEUTHUHOCPHI.findUnique({
      where: { SoPhieuThu: receiptId },
      include: {
        PHIEUDANGKY: { include: { HOCKY: true, PHIEUTHUHOCPHI: { where: { TrangThai: { in: [PAYMENT_SUCCESS, PAYMENT_REFUND] } } } } },
        SINHVIEN: true
      }
    }) : null;

    if (!receipt && SoPhieu) {
      const currentStudentId = req.user?.Role === 'admin' ? MaSv : await getStudentIdFromRequest(req);
      const registrationWithReceipts = await getRegistrationWithReceipts({ SoPhieu, MaSv: currentStudentId || MaSv, MaHocKy });
      receipt = (registrationWithReceipts?.PHIEUTHUHOCPHI || []).find((item) => [PAYMENT_UNPAID, PAYMENT_FAILED].includes(item.TrangThai));
      if (receipt) {
        receipt = await prisma.PHIEUTHUHOCPHI.findUnique({
          where: { SoPhieuThu: receipt.SoPhieuThu },
          include: {
            PHIEUDANGKY: { include: { HOCKY: true, PHIEUTHUHOCPHI: { where: { TrangThai: { in: [PAYMENT_SUCCESS, PAYMENT_REFUND] } } } } },
            SINHVIEN: true
          }
        });
      }
    }

    if (!receipt) return res.status(404).json({ success: false, message: 'Chưa có phiếu thu để thanh toán. Vui lòng liên hệ phòng tài chính hoặc chờ admin tạo phiếu thu.' });
    const registration = receipt.PHIEUDANGKY;
    if (!(await ensureStudentAccess(req, res, receipt.MaSv))) return;
    if (receipt.TrangThai === PAYMENT_SUCCESS) return res.status(400).json({ success: false, message: 'Phiếu thu đã thanh toán thành công' });
    if (receipt.TrangThai === PAYMENT_PENDING) return res.status(400).json({ success: false, message: 'Phiếu thu đang chờ xác nhận thanh toán' });
    if (receipt.TrangThai === PAYMENT_CANCELLED) return res.status(400).json({ success: false, message: 'Phiếu thu đã bị hủy' });

    await assertPaymentWindowOpen(registration);
    const amount = Number(receipt.SoTienThu || 0);
    const requestedAmount = SoTienThu === undefined || SoTienThu === null || SoTienThu === '' ? amount : Number(SoTienThu);
    if (!Number.isFinite(requestedAmount) || requestedAmount !== amount) {
      return res.status(400).json({ success: false, message: 'Sinh viên chỉ được thanh toán đúng số tiền trên phiếu thu. Nếu cần đóng một phần khác, admin phải tạo phiếu thu cho phần đó.' });
    }
    const remaining = await getRemainingAmount(registration);
    if (amount > remaining) {
      return res.status(400).json({ success: false, message: 'Số tiền trên phiếu thu không được vượt số tiền còn phải đóng hiện tại' });
    }

    const provider = String(method).toLowerCase();
    const normalizedPaymentMode = String(paymentMode || 'full').toLowerCase() === 'partial' ? 'partial' : 'full';
    const isCash = provider === 'cash';
    const isQr = provider === 'qr' || provider === 'bank_qr';
    const hinhThuc = isCash ? PAYMENT_METHOD.CASH : isQr ? PAYMENT_METHOD.BANK_TRANSFER : PAYMENT_METHOD.E_WALLET;

    const transactionCode = `${provider.toUpperCase()}-${Date.now()}-${receipt.SoPhieuThu}`;
    let checkoutUrl = null;
    let qrPayload = null;
    if (provider === 'vnpay') checkoutUrl = buildVnpayUrl(receipt, amount, req);
    if (provider === 'zalopay') checkoutUrl = (await createZalopayOrder(receipt, amount, req)).checkoutUrl;
    if (isQr) qrPayload = buildVietQrPayload(registration, receipt, amount);

    receipt = await prisma.PHIEUTHUHOCPHI.update({
      where: { SoPhieuThu: receipt.SoPhieuThu },
      data: {
        HinhThucThu: hinhThuc,
        PaymentProvider: provider,
        PaymentChannel: req.user?.Role === 'admin' ? 'admin' : 'student',
        MaGiaoDich: transactionCode,
        NguoiThu: null,
        TrangThai: PAYMENT_PENDING,
        NgayXacNhan: null,
        NgayCapNhat: new Date(),
        CheckoutUrl: checkoutUrl,
        QrPayload: qrPayload,
        GhiChu: [
          receipt.GhiChu,
          normalizedPaymentMode === 'partial' ? 'Sinh viên chọn thanh toán phiếu thu một phần do admin lập' : 'Sinh viên chọn thanh toán toàn bộ phiếu thu',
          isCash ? 'Sinh viên đăng ký đóng tiền mặt' : null
        ].filter(Boolean).join(' | ')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Đã tạo yêu cầu thanh toán',
      data: { receipt, checkoutUrl, qrPayload, remainingAmount: Math.max(remaining - amount, 0) }
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return sendErrorResponse(res, error, 'Lỗi server', 'Checkout payment error:');
  }
};

const checkoutPaymentV2 = async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id || req.body.SoPhieuThu || req.body.id, 10);
    const { SoPhieu, MaSv, MaHocKy, SoTienThu, method = 'cash', paymentMode = 'full' } = req.body;
    let receipt = Number.isFinite(receiptId) ? await prisma.PHIEUTHUHOCPHI.findUnique({
      where: { SoPhieuThu: receiptId },
      include: {
        PHIEUDANGKY: { include: { HOCKY: true } },
        SINHVIEN: true
      }
    }) : null;

    if (!receipt && SoPhieu) {
      const currentStudentId = req.user?.Role === 'admin' ? MaSv : await getStudentIdFromRequest(req);
      const registrationWithReceipts = await getRegistrationWithReceipts({ SoPhieu, MaSv: currentStudentId || MaSv, MaHocKy });
      receipt = (registrationWithReceipts?.PHIEUTHUHOCPHI || []).find((item) => [PAYMENT_UNPAID, PAYMENT_FAILED].includes(item.TrangThai));
      if (receipt) {
        receipt = await prisma.PHIEUTHUHOCPHI.findUnique({
          where: { SoPhieuThu: receipt.SoPhieuThu },
          include: {
            PHIEUDANGKY: { include: { HOCKY: true } },
            SINHVIEN: true
          }
        });
      }
    }

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Chưa có phiếu thu để thanh toán. Vui lòng liên hệ phòng tài chính hoặc chờ admin tạo phiếu thu.' });
    }
    const registration = receipt.PHIEUDANGKY;
    if (!(await ensureStudentAccess(req, res, receipt.MaSv))) return;
    if (receipt.TrangThai === PAYMENT_SUCCESS) return res.status(400).json({ success: false, message: 'Phiếu thu đã thanh toán thành công' });
    if (receipt.TrangThai === PAYMENT_CANCELLED) return res.status(400).json({ success: false, message: 'Phiếu thu đã bị hủy' });

    await assertPaymentWindowOpen(registration);
    const pendingTransaction = await getLatestPendingTransaction(prisma, receipt.SoPhieuThu);
    if (pendingTransaction) {
      return res.status(400).json({ success: false, message: 'Phiếu thu đang có lần thanh toán chờ xác nhận. Vui lòng chờ admin xử lý trước khi thanh toán tiếp.' });
    }

    const [totalsByReceipt, totalsByRegistration] = await Promise.all([
      getTransactionTotalsByReceipt(prisma, [receipt.SoPhieuThu]),
      getTransactionTotalsByRegistration(prisma, [registration.SoPhieu])
    ]);
    const receiptTotals = totalsByReceipt.get(Number(receipt.SoPhieuThu)) || emptyTotals();
    const registrationTotals = totalsByRegistration.get(Number(registration.SoPhieu)) || emptyTotals();
    const receiptRemaining = getReceiptRemaining(receipt, receiptTotals);
    const registrationRemaining = getRegistrationRemaining(registration, registrationTotals);
    const maxPayableAmount = Math.max(Math.min(receiptRemaining, registrationRemaining), 0);
    if (maxPayableAmount <= 0) {
      await syncReceiptStatus(prisma, receipt.SoPhieuThu);
      return res.status(400).json({ success: false, message: 'Phiếu thu đã được thanh toán đủ' });
    }

    const provider = String(method || 'cash').toLowerCase();
    const isManualConfirmation = MANUAL_CONFIRMATION_PROVIDERS.has(provider);
    const isOnlineProvider = ONLINE_PAYMENT_PROVIDERS.has(provider);
    if (!isManualConfirmation && !isOnlineProvider) {
      return res.status(400).json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });
    }

    const normalizedPaymentMode = String(paymentMode || 'full').toLowerCase() === 'partial' ? 'partial' : 'full';
    const suppliedAmount = SoTienThu === undefined || SoTienThu === null || SoTienThu === '' ? null : Number(SoTienThu);
    let requestedAmount = maxPayableAmount;
    if (normalizedPaymentMode === 'full') {
      if (suppliedAmount !== null && (!Number.isFinite(suppliedAmount) || suppliedAmount !== maxPayableAmount)) {
        return res.status(400).json({ success: false, message: 'Thanh toán toàn bộ phải bằng đúng số tiền còn nợ. Muốn nhập số tiền nhỏ hơn, vui lòng chọn thanh toán một phần.' });
      }
    } else {
      requestedAmount = suppliedAmount;
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Số tiền thanh toán không hợp lệ' });
      }
      if (requestedAmount >= maxPayableAmount) {
        return res.status(400).json({ success: false, message: 'Thanh toán một phần phải nhỏ hơn số tiền còn nợ. Muốn trả đủ, vui lòng chọn thanh toán toàn bộ.' });
      }
    }
    if (requestedAmount > maxPayableAmount) {
      return res.status(400).json({ success: false, message: 'Số tiền thanh toán không được vượt số tiền còn nợ của phiếu thu/phiếu đăng ký' });
    }
    if (provider === 'vnpay') requirePaymentEnv(['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET'], 'VNPAY');
    if (provider === 'zalopay') {
      requirePaymentEnv(['ZALOPAY_APP_ID', 'ZALOPAY_KEY1', 'ZALOPAY_KEY2'], 'ZaloPay');
      assertZalopayAmountAllowed(requestedAmount);
    }

    const isCash = provider === 'cash';
    const isQr = provider === 'qr' || provider === 'bank_qr';
    const hinhThuc = isCash ? PAYMENT_METHOD.CASH : isQr ? PAYMENT_METHOD.BANK_TRANSFER : PAYMENT_METHOD.E_WALLET;
    const paymentChannel = req.user?.Role === 'admin' ? 'admin' : 'student';
    const initialTransactionStatus = isManualConfirmation ? PAYMENT_PENDING : PAYMENT_UNPAID;
    const receiptStatus = isManualConfirmation ? PAYMENT_PENDING : PAYMENT_UNPAID;

    const transaction = await prisma.$transaction(async (tx) => {
      const insertedRows = await tx.$queryRaw`
        INSERT INTO "GIAODICHTHANHTOANHOCPHI" (
          "SoPhieuThu", "SoPhieuDangKy", "MaSv", "SoTienThanhToan", "HinhThucThanhToan",
          "PaymentProvider", "PaymentChannel", "GhiChu", "TrangThai", "NgayTao", "NgayCapNhat"
        ) VALUES (
          ${receipt.SoPhieuThu}, ${registration.SoPhieu}, ${receipt.MaSv}, ${requestedAmount}, ${hinhThuc},
          ${provider}, ${paymentChannel}, ${[
            normalizedPaymentMode === 'partial' ? 'Sinh viên chọn thanh toán một phần' : 'Sinh viên chọn thanh toán toàn bộ phần còn nợ',
            isCash ? 'Sinh viên đăng ký đóng tiền mặt' : null,
            isQr ? 'Sinh viên đăng ký thanh toán QR chờ phòng tài chính xác nhận' : null,
            isOnlineProvider ? 'Cổng thanh toán tự động trả kết quả, không cần admin xác nhận' : null
          ].filter(Boolean).join(' | ')}, ${initialTransactionStatus}, ${new Date()}, ${new Date()}
        )
        RETURNING *
      `;
      const paymentAttempt = insertedRows[0];
      const transactionRef = `TX-${paymentAttempt.MaGiaoDichThanhToan}`;
      const transactionCode = `${provider.toUpperCase()}-${Date.now()}-${receipt.SoPhieuThu}-${paymentAttempt.MaGiaoDichThanhToan}`;
      let checkoutUrl = null;
      let gatewayOrder = null;
      if (provider === 'vnpay') checkoutUrl = buildVnpayUrl(receipt, requestedAmount, req, transactionRef);
      if (provider === 'zalopay') {
        gatewayOrder = await createZalopayOrder(receipt, requestedAmount, req, transactionRef);
        checkoutUrl = gatewayOrder.checkoutUrl;
      }
      const qrPayload = isQr ? buildVietQrPayload(registration, receipt, requestedAmount) : null;
      const updatedRows = await tx.$queryRaw`
        UPDATE "GIAODICHTHANHTOANHOCPHI"
        SET "MaGiaoDich" = ${transactionCode},
            "CheckoutUrl" = ${checkoutUrl},
            "QrPayload" = ${qrPayload},
            "NgayCapNhat" = ${new Date()}
        WHERE "MaGiaoDichThanhToan" = ${paymentAttempt.MaGiaoDichThanhToan}
        RETURNING *
      `;
      await tx.PHIEUTHUHOCPHI.update({
        where: { SoPhieuThu: receipt.SoPhieuThu },
        data: {
          HinhThucThu: hinhThuc,
          PaymentProvider: provider,
          PaymentChannel: paymentChannel,
          MaGiaoDich: transactionCode,
          NguoiThu: null,
          TrangThai: receiptStatus,
          NgayXacNhan: null,
          NgayCapNhat: new Date(),
          CheckoutUrl: checkoutUrl,
          QrPayload: qrPayload
        }
      });
      return updatedRows[0];
    });

    const refreshedReceipt = await prisma.PHIEUTHUHOCPHI.findUnique({
      where: { SoPhieuThu: receipt.SoPhieuThu },
      include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } }
    });
    const refreshedTotalsByReceipt = await getTransactionTotalsByReceipt(prisma, [receipt.SoPhieuThu]);
    const refreshedTotalsByRegistration = await getTransactionTotalsByRegistration(prisma, [registration.SoPhieu]);
    const enrichedReceipt = attachReceiptSummaries([refreshedReceipt], refreshedTotalsByReceipt, refreshedTotalsByRegistration)[0];

    const responseMessage = isOnlineProvider
      ? 'Đã khởi tạo thanh toán qua cổng thanh toán'
      : isCash
        ? 'Đã tạo yêu cầu đóng tiền mặt chờ phòng tài chính xác nhận'
        : 'Đã tạo yêu cầu thanh toán QR chờ phòng tài chính xác nhận';

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: {
        receipt: toPaymentDto(enrichedReceipt),
        transaction: { ...transaction, SoTienThanhToan: Number(transaction.SoTienThanhToan || 0) },
        checkoutUrl: transaction.CheckoutUrl,
        qrPayload: transaction.QrPayload,
        cashInstruction: isCash ? CASH_PAYMENT_INSTRUCTION : null,
        requiresAdminConfirmation: isManualConfirmation,
        remainingAmount: Math.max(registrationRemaining - (isManualConfirmation ? requestedAmount : 0), 0)
      }
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return sendErrorResponse(res, error, 'Lỗi server', 'Checkout payment error:');
  }
};

const parseCallbackAmount = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const parseVnpayCallbackAmount = (query) => {
  const rawAmount = parseCallbackAmount(query?.vnp_Amount);
  return rawAmount === null ? null : rawAmount / 100;
};

const parseZalopayCallbackPayload = (body = {}) => {
  let data = {};
  if (body.data && typeof body.data === 'string') {
    try {
      data = JSON.parse(body.data);
    } catch {
      data = {};
    }
  } else if (body.data && typeof body.data === 'object') {
    data = body.data;
  }
  return { ...body, ...data };
};

const getZalopayAppTransId = (payload = {}) => payload.app_trans_id
  || payload.apptransid
  || payload.appTransId
  || payload.app_transid
  || payload.appTransID
  || payload.app_trans_id
  || null;

const getZalopayPaymentRef = (payload = {}) => {
  const explicitRef = payload.ref || payload.transaction_ref;
  if (parsePaymentTransactionRef(explicitRef)) return explicitRef;
  const appTransId = getZalopayAppTransId(payload);
  const suffix = String(appTransId || '').split('_').pop();
  return parsePaymentTransactionRef(suffix) ? suffix : null;
};

const getZalopayQueryEndpoint = () => {
  if (process.env.ZALOPAY_QUERY_ENDPOINT) return process.env.ZALOPAY_QUERY_ENDPOINT;
  const createEndpoint = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
  return createEndpoint.replace(/\/create\/?$/, '/query');
};

const queryZalopayOrder = async (appTransId) => {
  requirePaymentEnv(['ZALOPAY_APP_ID', 'ZALOPAY_KEY1'], 'ZaloPay');
  const appId = process.env.ZALOPAY_APP_ID;
  const key1 = process.env.ZALOPAY_KEY1;
  const macData = `${appId}|${appTransId}|${key1}`;
  const body = new URLSearchParams({
    app_id: appId,
    app_trans_id: appTransId,
    mac: crypto.createHmac('sha256', key1).update(macData).digest('hex')
  });
  const response = await fetch(getZalopayQueryEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw { status: 502, code: 'ZALOPAY_QUERY_FAILED', message: 'Không truy vấn được trạng thái thanh toán ZaloPay' };
  }
  return result;
};

const getTransactionAmountForRef = async (paymentRef) => {
  const transactionId = parsePaymentTransactionRef(paymentRef);
  if (!transactionId) return null;
  const transaction = await getTransactionById(prisma, transactionId);
  return transaction ? Number(transaction.SoTienThanhToan || 0) : null;
};

const markOnlineResult = async (receiptId, success, transactionCode, providerAmount) => {
  const id = parseInt(receiptId, 10);
  if (!Number.isFinite(id)) return null;
  const existing = await prisma.PHIEUTHUHOCPHI.findUnique({
    where: { SoPhieuThu: id },
    include: {
      PHIEUDANGKY: {
        include: {
          HOCKY: true,
          PHIEUTHUHOCPHI: {
            where: {
              SoPhieuThu: { not: id },
              TrangThai: { in: [PAYMENT_SUCCESS, PAYMENT_REFUND] }
            }
          }
        }
      }
    }
  });
  if (!existing) return null;
  if (existing.TrangThai === PAYMENT_SUCCESS) return existing;
  if (existing.TrangThai !== PAYMENT_PENDING) return existing;
  if (success) {
    await assertPaymentWindowOpen(existing.PHIEUDANGKY);
    const receiptAmount = Number(existing.SoTienThu || 0);
    const confirmedAmount = Number(providerAmount);
    if (!Number.isFinite(confirmedAmount) || confirmedAmount <= 0) {
      throw { status: 400, code: 'PAYMENT_PROVIDER_AMOUNT_INVALID', message: 'Số tiền callback từ cổng thanh toán không hợp lệ' };
    }
    if (confirmedAmount !== receiptAmount) {
      throw { status: 400, code: 'PAYMENT_PROVIDER_AMOUNT_MISMATCH', message: 'Số tiền callback từ cổng thanh toán không khớp phiếu thu' };
    }
    const remaining = await getRemainingAmount(existing.PHIEUDANGKY);
    if (receiptAmount > remaining) {
      throw { status: 400, code: 'PAYMENT_AMOUNT_MISMATCH', message: 'Số tiền callback không được vượt học phí còn phải đóng hoặc phiếu đã được thanh toán bằng giao dịch khác' };
    }
  }

  const payment = await prisma.PHIEUTHUHOCPHI.update({
    where: { SoPhieuThu: id },
    data: {
      TrangThai: success ? PAYMENT_SUCCESS : PAYMENT_FAILED,
      MaGiaoDich: transactionCode || undefined,
      NgayXacNhan: success ? new Date() : null,
      NgayCapNhat: new Date()
    }
  });
  await createTuitionPaymentNotification(prisma, {
    MaSv: payment.MaSv,
    SoPhieuThu: payment.SoPhieuThu,
    SoTienThu: payment.SoTienThu,
    MaGiaoDich: payment.MaGiaoDich,
    ThanhCong: payment.TrangThai === PAYMENT_SUCCESS,
    LyDo: payment.TrangThai === PAYMENT_FAILED ? 'Cổng thanh toán trả về kết quả thất bại' : null
  });
  return payment;
};

const parsePaymentTransactionRef = (value) => {
  const text = String(value || '');
  const match = /^TX-(\d+)$/.exec(text);
  return match ? Number(match[1]) : null;
};

const markOnlineResultV2 = async (paymentRef, success, transactionCode, providerAmount) => {
  let transactionId = parsePaymentTransactionRef(paymentRef);

  if (!transactionId) {
    const pending = await getLatestPendingTransaction(prisma, paymentRef);
    transactionId = pending?.MaGiaoDichThanhToan || null;
  }

  if (!transactionId) return markOnlineResult(paymentRef, success, transactionCode, providerAmount);

  const transaction = await getTransactionById(prisma, transactionId);
  if (!transaction) return null;
  const receipt = await prisma.PHIEUTHUHOCPHI.findUnique({
    where: { SoPhieuThu: Number(transaction.SoPhieuThu) },
    include: {
      PHIEUDANGKY: { include: { HOCKY: true } }
    }
  });
  if (!receipt) return null;
  if (![PAYMENT_PENDING, PAYMENT_UNPAID].includes(transaction.TrangThai)) return syncReceiptStatus(prisma, receipt.SoPhieuThu);

  if (success) {
    await assertPaymentWindowOpen(receipt.PHIEUDANGKY);
    const amount = Number(transaction.SoTienThanhToan || 0);
    const confirmedAmount = Number(providerAmount);
    if (!Number.isFinite(confirmedAmount) || confirmedAmount <= 0) {
      throw { status: 400, code: 'PAYMENT_PROVIDER_AMOUNT_INVALID', message: 'Số tiền callback từ cổng thanh toán không hợp lệ' };
    }
    if (confirmedAmount !== amount) {
      throw { status: 400, code: 'PAYMENT_PROVIDER_AMOUNT_MISMATCH', message: 'Số tiền callback từ cổng thanh toán không khớp lần thanh toán' };
    }
  }

  await prisma.$queryRaw`
    UPDATE "GIAODICHTHANHTOANHOCPHI"
    SET "TrangThai" = ${success ? PAYMENT_SUCCESS : PAYMENT_FAILED},
        "MaGiaoDich" = ${transactionCode || transaction.MaGiaoDich},
        "NgayXacNhan" = ${success ? new Date() : null},
        "NgayCapNhat" = ${new Date()}
    WHERE "MaGiaoDichThanhToan" = ${transaction.MaGiaoDichThanhToan}
    RETURNING *
  `;
  const payment = await syncReceiptStatus(prisma, receipt.SoPhieuThu, { failed: !success });
  await createTuitionPaymentNotification(prisma, {
    MaSv: transaction.MaSv,
    SoPhieuThu: transaction.SoPhieuThu,
    SoTienThu: transaction.SoTienThanhToan,
    MaGiaoDich: transactionCode || transaction.MaGiaoDich,
    ThanhCong: success,
    LyDo: success ? null : 'Cổng thanh toán trả về kết quả thất bại'
  });
  return payment;
};

const verifyVnpaySignature = (query) => {
  const vnp_SecureHash = query.vnp_SecureHash;
  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  const qs = stringifyVnpayParams(params);
  requirePaymentEnv(['VNPAY_HASH_SECRET'], 'VNPAY');
  const secret = process.env.VNPAY_HASH_SECRET;
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
    const providerAmount = parseVnpayCallbackAmount(req.query);
    const payment = await markOnlineResultV2(req.query.vnp_TxnRef, success, req.query.vnp_TransactionNo, providerAmount);
    const accepts = String(req.get('accept') || '').toLowerCase();
    const wantsJson = req.query.format === 'json' || (accepts.includes('application/json') && !accepts.includes('text/html'));
    if (!payment) {
      if (wantsJson) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu VNPAY' });
      return res.redirect(303, '/student/my-payments?payment=failed&reason=not_found');
    }
    const finalSuccess = success && payment.TrangThai !== PAYMENT_FAILED;
    if (!wantsJson) {
      const status = finalSuccess ? 'success' : 'failed';
      return res.redirect(303, `/student/my-payments?payment=${status}&receipt=${encodeURIComponent(payment.SoPhieuThu)}`);
    }
    res.json({ success: true, data: payment, message: finalSuccess ? 'Thanh toán VNPAY thành công' : 'Thanh toán VNPAY thất bại' });
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
    const providerAmount = parseVnpayCallbackAmount(req.query);
    await markOnlineResultV2(req.query.vnp_TxnRef, success, req.query.vnp_TransactionNo, providerAmount);
    res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('VNPAY IPN error:', error);
    if (error.code === 'PAYMENT_PROVIDER_AMOUNT_INVALID' || error.code === 'PAYMENT_PROVIDER_AMOUNT_MISMATCH' || error.code === 'PAYMENT_AMOUNT_MISMATCH') {
      return res.json({ RspCode: '04', Message: error.message });
    }
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
};

const verifyZalopayMac = (body) => {
  requirePaymentEnv(['ZALOPAY_KEY2'], 'ZaloPay');
  const key2 = process.env.ZALOPAY_KEY2;
  const mac = crypto.createHmac('sha256', key2).update(String(body.data || '')).digest('hex');
  return mac === body.mac;
};

const zalopayReturn = async (req, res) => {
  const appTransId = getZalopayAppTransId(req.query);
  const paymentRef = getZalopayPaymentRef(req.query);
  const accepts = String(req.get('accept') || '').toLowerCase();
  const wantsJson = req.query.format === 'json' || (accepts.includes('application/json') && !accepts.includes('text/html'));
  let payment = null;
  let status = 'pending';
  let reason = 'processing';

  try {
    if (!paymentRef) {
      reason = 'missing_ref';
    } else if (!appTransId) {
      reason = 'missing_app_trans_id';
    } else {
      const result = await queryZalopayOrder(appTransId);
      const returnCode = Number(result.return_code || 0);
      const transactionCode = result.zp_trans_id || result.zalopay_trans_id || result.zptranstoken || req.query.zp_trans_id;
      const fallbackAmount = await getTransactionAmountForRef(paymentRef);
      const providerAmount = parseCallbackAmount(result.amount || req.query.amount) || fallbackAmount;

      if (returnCode === 1) {
        payment = await markOnlineResultV2(paymentRef, true, transactionCode, providerAmount);
        status = payment ? 'success' : 'pending';
        reason = payment?.TrangThai === PAYMENT_SUCCESS ? 'paid' : 'partial_or_paid';
      } else if (returnCode === 2) {
        payment = await markOnlineResultV2(paymentRef, false, transactionCode, providerAmount);
        status = 'failed';
        reason = isZalopayAmountTooSmallResponse(result)
          ? ZALOPAY_AMOUNT_TOO_SMALL_CODE
          : result.return_message || result.sub_return_message || 'failed';
      }
    }

    if (wantsJson) return res.json({ success: status === 'success', status, reason, data: payment });
    const receipt = payment?.SoPhieuThu || req.query.receipt || '';
    return res.redirect(303, `/student/my-payments?payment=${encodeURIComponent(status)}&receipt=${encodeURIComponent(receipt)}&reason=${encodeURIComponent(reason)}`);
  } catch (error) {
    console.error('ZaloPay return error:', error);
    if (wantsJson) return res.status(error.status || 500).json({ success: false, status: 'failed', message: error.message || 'Không thể cập nhật thanh toán ZaloPay' });
    return res.redirect(303, `/student/my-payments?payment=failed&reason=${encodeURIComponent(error.code || 'zalopay_return_error')}`);
  }
};

const zalopayCallback = async (req, res) => {
  try {
    if (!verifyZalopayMac(req.body)) {
      return res.json({ return_code: -1, return_message: 'mac not equal' });
    }
    const payload = parseZalopayCallbackPayload(req.body);
    const paymentRef = getZalopayPaymentRef(payload);
    const explicitStatus = payload.status ?? payload.return_code;
    const success = explicitStatus === undefined || explicitStatus === null || explicitStatus === ''
      ? true
      : Number(explicitStatus) === 1;
    const providerAmount = parseCallbackAmount(payload.amount) || await getTransactionAmountForRef(paymentRef);
    await markOnlineResultV2(paymentRef, success, payload.zp_trans_id, providerAmount);
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
    if (existing.TrangThai !== PAYMENT_PENDING) {
      return res.status(400).json({ success: false, message: 'Sinh viên chưa tạo yêu cầu thanh toán cho phiếu thu này' });
    }
    await assertPaymentWindowOpen(existing.PHIEUDANGKY);

    const remaining = await getRemainingAmount(existing.PHIEUDANGKY);
    if (Number(existing.SoTienThu || 0) > remaining) {
      return res.status(400).json({ success: false, message: 'Số tiền phiếu thu không được vượt số học phí còn phải đóng' });
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
    await createTuitionPaymentNotification(prisma, {
      MaSv: payment.MaSv,
      SoPhieuThu: payment.SoPhieuThu,
      SoTienThu: payment.SoTienThu,
      MaGiaoDich: payment.MaGiaoDich,
      ThanhCong: true
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

const failPayment = async (req, res) => {
  try {
    const existing = await prisma.PHIEUTHUHOCPHI.findUnique({ where: { SoPhieuThu: parseInt(req.params.id, 10) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    if (existing.TrangThai === PAYMENT_SUCCESS) {
      return res.status(400).json({ success: false, message: 'Không thể đánh dấu thất bại cho phiếu thu đã thành công' });
    }
    if (existing.TrangThai === PAYMENT_CANCELLED) {
      return res.status(400).json({ success: false, message: 'Phiếu thu đã bị hủy' });
    }
    if (existing.TrangThai !== PAYMENT_PENDING) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể đánh dấu thất bại cho phiếu đang chờ xác nhận' });
    }
    const payment = await prisma.PHIEUTHUHOCPHI.update({
      where: { SoPhieuThu: existing.SoPhieuThu },
      data: {
        TrangThai: PAYMENT_FAILED,
        NgayXacNhan: null,
        NgayCapNhat: new Date(),
        GhiChu: req.body?.LyDo ? String(req.body.LyDo).trim() : existing.GhiChu
      }
    });
    await createTuitionPaymentNotification(prisma, {
      MaSv: payment.MaSv,
      SoPhieuThu: payment.SoPhieuThu,
      SoTienThu: payment.SoTienThu,
      MaGiaoDich: payment.MaGiaoDich,
      ThanhCong: false,
      LyDo: req.body?.LyDo ? String(req.body.LyDo).trim() : null
    });
    res.json({ success: true, message: 'Đã đánh dấu phiếu thu thất bại', data: payment });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'Fail payment error:');
  }
};

const getEnrichedReceiptById = async (receiptId) => {
  const receipt = await prisma.PHIEUTHUHOCPHI.findUnique({
    where: { SoPhieuThu: Number(receiptId) },
    include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } }
  });
  if (!receipt) return null;
  const [totalsByReceipt, totalsByRegistration, transactions] = await Promise.all([
    getTransactionTotalsByReceipt(prisma, [receipt.SoPhieuThu]),
    getTransactionTotalsByRegistration(prisma, [receipt.SoPhieuDangKy]),
    getReceiptTransactions(prisma, receipt.SoPhieuThu)
  ]);
  const enriched = attachReceiptSummaries([receipt], totalsByReceipt, totalsByRegistration)[0];
  enriched.LanThanhToan = transactions.map((item) => ({
    ...item,
    SoTienThanhToan: Number(item.SoTienThanhToan || 0)
  }));
  return enriched;
};

const confirmPaymentV2 = async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id, 10);
    const existing = await prisma.PHIEUTHUHOCPHI.findUnique({
      where: { SoPhieuThu: receiptId },
      include: { PHIEUDANGKY: { include: { HOCKY: true } } }
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    if (existing.TrangThai === PAYMENT_CANCELLED) return res.status(400).json({ success: false, message: 'Phiếu thu đã bị hủy' });

    const pending = await getLatestPendingTransaction(prisma, receiptId);
    if (!pending) {
      if (existing.TrangThai === PAYMENT_SUCCESS) {
        return res.json({ success: true, message: 'Phiếu thu đã được thanh toán đủ', data: toPaymentDto(await getEnrichedReceiptById(receiptId)) });
      }
      return res.status(400).json({ success: false, message: 'Phiếu thu không có lần thanh toán nào đang chờ xác nhận' });
    }

    await assertPaymentWindowOpen(existing.PHIEUDANGKY);
    const [receiptTotalsMap, registrationTotalsMap] = await Promise.all([
      getTransactionTotalsByReceipt(prisma, [receiptId]),
      getTransactionTotalsByRegistration(prisma, [existing.SoPhieuDangKy])
    ]);
    const maxPayable = Math.max(Math.min(
      getReceiptRemaining(existing, receiptTotalsMap.get(receiptId) || emptyTotals()),
      getRegistrationRemaining(existing.PHIEUDANGKY, registrationTotalsMap.get(existing.SoPhieuDangKy) || emptyTotals())
    ), 0);
    if (Number(pending.SoTienThanhToan || 0) > maxPayable) {
      return res.status(400).json({ success: false, message: 'Số tiền lần thanh toán vượt số tiền còn nợ hiện tại' });
    }

    const actor = getActorName(req);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        UPDATE "GIAODICHTHANHTOANHOCPHI"
        SET "TrangThai" = ${PAYMENT_SUCCESS},
            "NguoiXacNhan" = ${actor},
            "NgayXacNhan" = ${new Date()},
            "NgayCapNhat" = ${new Date()}
        WHERE "MaGiaoDichThanhToan" = ${pending.MaGiaoDichThanhToan}
      `;
      await syncReceiptStatus(tx, receiptId);
    });

    await createTuitionPaymentNotification(prisma, {
      MaSv: pending.MaSv,
      SoPhieuThu: pending.SoPhieuThu,
      SoTienThu: pending.SoTienThanhToan,
      MaGiaoDich: pending.MaGiaoDich,
      ThanhCong: true
    });

    const data = await getEnrichedReceiptById(receiptId);
    res.json({ success: true, message: 'Đã xác nhận lần thanh toán', data: toPaymentDto(data) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return sendErrorResponse(res, error, 'Lỗi server', 'Confirm payment error:');
  }
};

const failPaymentV2 = async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id, 10);
    const existing = await prisma.PHIEUTHUHOCPHI.findUnique({ where: { SoPhieuThu: receiptId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    if (existing.TrangThai === PAYMENT_CANCELLED) return res.status(400).json({ success: false, message: 'Phiếu thu đã bị hủy' });
    const pending = await getLatestPendingTransaction(prisma, receiptId);
    if (!pending) return res.status(400).json({ success: false, message: 'Phiếu thu không có lần thanh toán nào đang chờ xác nhận' });
    const reason = req.body?.LyDo ? String(req.body.LyDo).trim() : null;

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        UPDATE "GIAODICHTHANHTOANHOCPHI"
        SET "TrangThai" = ${PAYMENT_FAILED},
            "GhiChu" = ${reason || pending.GhiChu},
            "NgayXacNhan" = NULL,
            "NgayCapNhat" = ${new Date()}
        WHERE "MaGiaoDichThanhToan" = ${pending.MaGiaoDichThanhToan}
      `;
      await syncReceiptStatus(tx, receiptId, { failed: true });
    });

    await createTuitionPaymentNotification(prisma, {
      MaSv: pending.MaSv,
      SoPhieuThu: pending.SoPhieuThu,
      SoTienThu: pending.SoTienThanhToan,
      MaGiaoDich: pending.MaGiaoDich,
      ThanhCong: false,
      LyDo: reason
    });

    const data = await getEnrichedReceiptById(receiptId);
    res.json({ success: true, message: 'Đã đánh dấu lần thanh toán thất bại', data: toPaymentDto(data) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'Fail payment error:');
  }
};

const cancelPaymentV2 = async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id, 10);
    const existing = await prisma.PHIEUTHUHOCPHI.findUnique({ where: { SoPhieuThu: receiptId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    if (existing.TrangThai === PAYMENT_CANCELLED) return res.status(400).json({ success: false, message: 'Phiếu thu đã được hủy trước đó' });
    const totalsByReceipt = await getTransactionTotalsByReceipt(prisma, [receiptId]);
    const totals = totalsByReceipt.get(receiptId) || emptyTotals();
    if (getEffectivePaid(totals) > 0) {
      return res.status(400).json({ success: false, message: 'Không thể hủy phiếu thu đã có lần thanh toán thành công. Vui lòng dùng hoàn tiền/xử lý tài chính.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        UPDATE "GIAODICHTHANHTOANHOCPHI"
        SET "TrangThai" = ${PAYMENT_CANCELLED},
            "NgayCapNhat" = ${new Date()}
        WHERE "SoPhieuThu" = ${receiptId}
          AND "TrangThai" = ${PAYMENT_PENDING}
      `;
      await tx.PHIEUTHUHOCPHI.update({
        where: { SoPhieuThu: receiptId },
        data: { TrangThai: PAYMENT_CANCELLED, NgayCapNhat: new Date(), CheckoutUrl: null, QrPayload: null }
      });
    });
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

const getPaymentStatsV2 = async (req, res) => {
  try {
    const rows = req.query.MaHocKy
      ? await prisma.$queryRaw`
        SELECT gd.*
        FROM "GIAODICHTHANHTOANHOCPHI" gd
        JOIN "PHIEUDANGKY" pdk ON pdk."SoPhieu" = gd."SoPhieuDangKy"
        WHERE gd."TrangThai" = ${PAYMENT_SUCCESS}
          AND pdk."MaHocKy" = ${req.query.MaHocKy}
      `
      : await prisma.$queryRaw`
        SELECT gd.*
        FROM "GIAODICHTHANHTOANHOCPHI" gd
        WHERE gd."TrangThai" = ${PAYMENT_SUCCESS}
      `;
    const totalAmount = rows.reduce((sum, row) => sum + Number(row.SoTienThanhToan || 0), 0);
    const byMethodMap = rows.reduce((acc, row) => {
      const key = row.PaymentProvider || row.HinhThucThanhToan || 'Khác';
      if (!acc[key]) acc[key] = { HinhThucThu: key, count: 0, total: 0 };
      acc[key].count += 1;
      acc[key].total += Number(row.SoTienThanhToan || 0);
      return acc;
    }, {});
    res.json({ success: true, data: { totalReceipts: rows.length, totalAmount, byMethod: Object.values(byMethodMap) } });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'Get payment stats error:');
  }
};

const exportPayments = async (req, res) => {
  try {
    const { search = '', searchField = 'all', MaHocKy, HinhThucThu, TrangThai } = req.query;
    const where = {};
    if (HinhThucThu) where.HinhThucThu = HinhThucThu;
    if (MaHocKy) where.PHIEUDANGKY = { MaHocKy };

    const rows = await prisma.PHIEUTHUHOCPHI.findMany({
      where,
      orderBy: { NgayLap: 'desc' },
      include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } }
    });
    const totalsByReceipt = await getTransactionTotalsByReceipt(prisma, rows.map((row) => row.SoPhieuThu));
    const totalsByRegistration = await getTransactionTotalsByRegistration(prisma, rows.map((row) => row.SoPhieuDangKy));
    const enrichedRows = attachReceiptSummaries(rows, totalsByReceipt, totalsByRegistration);
    const searched = filterRowsByRegex(enrichedRows, search, (row) => getPaymentSearchValues(row, searchField));
    const filtered = TrangThai ? searched.filter((row) => getPaymentDisplayStatus(row) === TrangThai) : searched;

    const header = ['SoPhieuThu', 'MSSV', 'HoTen', 'HocKy', 'NamHoc', 'SoTienThu', 'HinhThucThu', 'NgayLap', 'NguoiThu', 'MaGiaoDich', 'TrangThai', 'GhiChu'];
    const lines = [header.join(',')];
    filtered.map(toPaymentDto).forEach((p) => {
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
        p.TrangThaiHienThi || p.TrangThai,
        p.GhiChu
      ].map(csvCell).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="phieu-thu-hoc-phi.csv"');
    res.send('\uFEFF' + lines.join('\n'));
  } catch (error) {
        return sendErrorResponse(res, error, 'Kh\u00f4ng th\u1ec3 xu\u1ea5t phi\u1ebfu thu', 'Export payments error:');
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  getStudentPayments,
  createPayment,
  createBulkPayments,
  checkoutPayment: checkoutPaymentV2,
  vnpayReturn,
  vnpayIpn,
  zalopayReturn,
  zalopayCallback,
  confirmPayment: confirmPaymentV2,
  cancelPayment: cancelPaymentV2,
  failPayment: failPaymentV2,
  getPaymentStats: getPaymentStatsV2,
  exportPayments
};
