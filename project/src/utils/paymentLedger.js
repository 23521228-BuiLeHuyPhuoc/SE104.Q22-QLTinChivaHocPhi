const { Prisma } = require('@prisma/client');
const { PAYMENT_STATUS } = require('./businessConstants');

const PAYMENT_TRANSACTION_TABLE = 'GIAODICHTHANHTOANHOCPHI';

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const emptyTotals = () => ({ paid: 0, refunded: 0, pending: 0, failed: 0, cancelled: 0, count: 0 });

const normalizeTotalsRow = (row) => ({
  paid: toNumber(row.paid),
  refunded: toNumber(row.refunded),
  pending: toNumber(row.pending),
  failed: toNumber(row.failed),
  cancelled: toNumber(row.cancelled),
  count: toNumber(row.count)
});

const getTransactionTotalsByRegistration = async (prisma, registrationIds = []) => {
  const ids = Array.from(new Set(registrationIds.map((id) => Number(id)).filter(Number.isFinite)));
  if (!ids.length) return new Map();

  const rows = await prisma.$queryRaw`
    SELECT
      "SoPhieuDangKy",
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.SUCCESS} THEN "SoTienThanhToan" ELSE 0 END), 0) AS paid,
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.REFUND} THEN "SoTienThanhToan" ELSE 0 END), 0) AS refunded,
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.PENDING} THEN "SoTienThanhToan" ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.FAILED} THEN "SoTienThanhToan" ELSE 0 END), 0) AS failed,
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.CANCELLED} THEN "SoTienThanhToan" ELSE 0 END), 0) AS cancelled,
      COUNT(*)::int AS count
    FROM "GIAODICHTHANHTOANHOCPHI"
    WHERE "SoPhieuDangKy" IN (${Prisma.join(ids)})
    GROUP BY "SoPhieuDangKy"
  `;

  return new Map(rows.map((row) => [Number(row.SoPhieuDangKy), normalizeTotalsRow(row)]));
};

const getTransactionTotalsByReceipt = async (prisma, receiptIds = []) => {
  const ids = Array.from(new Set(receiptIds.map((id) => Number(id)).filter(Number.isFinite)));
  if (!ids.length) return new Map();

  const rows = await prisma.$queryRaw`
    SELECT
      "SoPhieuThu",
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.SUCCESS} THEN "SoTienThanhToan" ELSE 0 END), 0) AS paid,
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.REFUND} THEN "SoTienThanhToan" ELSE 0 END), 0) AS refunded,
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.PENDING} THEN "SoTienThanhToan" ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.FAILED} THEN "SoTienThanhToan" ELSE 0 END), 0) AS failed,
      COALESCE(SUM(CASE WHEN "TrangThai" = ${PAYMENT_STATUS.CANCELLED} THEN "SoTienThanhToan" ELSE 0 END), 0) AS cancelled,
      COUNT(*)::int AS count
    FROM "GIAODICHTHANHTOANHOCPHI"
    WHERE "SoPhieuThu" IN (${Prisma.join(ids)})
    GROUP BY "SoPhieuThu"
  `;

  return new Map(rows.map((row) => [Number(row.SoPhieuThu), normalizeTotalsRow(row)]));
};

const getReceiptTransactions = async (prisma, receiptId) => {
  const id = Number(receiptId);
  if (!Number.isFinite(id)) return [];
  return prisma.$queryRaw`
    SELECT *
    FROM "GIAODICHTHANHTOANHOCPHI"
    WHERE "SoPhieuThu" = ${id}
    ORDER BY "NgayTao" DESC, "MaGiaoDichThanhToan" DESC
  `;
};

const getLatestPendingTransaction = async (prisma, receiptId) => {
  const id = Number(receiptId);
  if (!Number.isFinite(id)) return null;
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM "GIAODICHTHANHTOANHOCPHI"
    WHERE "SoPhieuThu" = ${id}
      AND "TrangThai" = ${PAYMENT_STATUS.PENDING}
    ORDER BY "NgayTao" DESC, "MaGiaoDichThanhToan" DESC
    LIMIT 1
  `;
  return rows[0] || null;
};

const getTransactionById = async (prisma, transactionId) => {
  const id = Number(transactionId);
  if (!Number.isFinite(id)) return null;
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM "GIAODICHTHANHTOANHOCPHI"
    WHERE "MaGiaoDichThanhToan" = ${id}
    LIMIT 1
  `;
  return rows[0] || null;
};

const getEffectivePaid = (totals) => {
  const value = (totals || emptyTotals());
  return Math.max(toNumber(value.paid) - toNumber(value.refunded), 0);
};

const getReceiptRemaining = (receipt, totals) => Math.max(toNumber(receipt?.SoTienThu) - getEffectivePaid(totals), 0);

const getRegistrationRemaining = (registration, totals) => Math.max(toNumber(registration?.TongTienPhaiDong) - getEffectivePaid(totals), 0);

const attachReceiptSummaries = (receipts = [], totalsByReceipt = new Map(), totalsByRegistration = new Map()) => receipts.map((receipt) => {
  const receiptTotals = totalsByReceipt.get(Number(receipt.SoPhieuThu)) || emptyTotals();
  const registrationTotals = totalsByRegistration.get(Number(receipt.SoPhieuDangKy)) || emptyTotals();
  const receiptRemaining = getReceiptRemaining(receipt, receiptTotals);
  const hasRegistrationAmount = receipt.PHIEUDANGKY && receipt.PHIEUDANGKY.TongTienPhaiDong !== undefined && receipt.PHIEUDANGKY.TongTienPhaiDong !== null;
  const registrationRemaining = hasRegistrationAmount ? getRegistrationRemaining(receipt.PHIEUDANGKY, registrationTotals) : receiptRemaining;
  return {
    ...receipt,
    _paymentTotals: receiptTotals,
    _registrationPaymentTotals: registrationTotals,
    TongTienDaThanhToan: getEffectivePaid(receiptTotals),
    TongTienDangChoXacNhan: toNumber(receiptTotals.pending),
    ConNoPhieuThu: receiptRemaining,
    ConNoDangKy: registrationRemaining,
    SoTienThanhToanToiDa: Math.max(Math.min(receiptRemaining, registrationRemaining), 0)
  };
});

module.exports = {
  PAYMENT_TRANSACTION_TABLE,
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
};
