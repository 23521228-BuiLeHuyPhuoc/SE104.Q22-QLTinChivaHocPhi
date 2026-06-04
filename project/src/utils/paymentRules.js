const { getRegistrationWindowState, getAppealWindowState, getDeadlineEnd } = require('./registrationWindow');

const PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE =
  'Học kỳ này vẫn đang trong thời hạn đăng ký học phần. Chỉ có thể thanh toán sau khi kết thúc hạn đăng ký.';

const PAYMENT_BLOCKED_DURING_APPEAL_MESSAGE =
  'Học kỳ này vẫn đang trong thời hạn cứu xét đăng ký. Chỉ có thể thanh toán sau khi kết thúc cứu xét.';

const PAYMENT_BLOCKED_NOT_FINALIZED_MESSAGE =
  'Học kỳ chưa chốt đăng ký học phần. Chưa thể thanh toán học phí.';

const PAYMENT_BLOCKED_NOT_OPEN_MESSAGE =
  'Học kỳ chưa mở thu học phí. Chưa thể thanh toán.';

const PAYMENT_BLOCKED_PENDING_APPEALS_MESSAGE =
  'Học kỳ còn đơn cứu xét đăng ký chờ duyệt. Chưa thể thanh toán học phí.';

const PAYMENT_WINDOW_MESSAGES = {
  not_open: 'Chưa mở thu học phí',
  locked: 'Đã khóa thu học phí',
  not_configured: 'Chưa cấu hình đủ thời gian thu học phí',
  not_started: 'Chưa đến thời gian thu học phí',
  closed: 'Đã hết hạn thu học phí',
  open: 'Đang trong hạn thu học phí'
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const makePaymentWindowState = ({ isOpen, isClosed, reason, message, start, deadline }) => ({
  isOpen,
  isClosed,
  reason,
  message,
  start,
  deadline,
  paymentStart: start,
  paymentDeadline: deadline
});

const getTuitionPaymentWindowState = (semester, now = new Date()) => {
  const current = toValidDate(now) || new Date();
  const start = toValidDate(semester?.NgayBatDauDongHocPhi);
  const deadline = getDeadlineEnd(semester?.HanDongHocPhi);
  const wasOpened = Boolean(semester?.NgayMoThuHocPhi);

  if (!semester?.MoThuHocPhi) {
    return makePaymentWindowState({
      isOpen: false,
      isClosed: wasOpened,
      reason: wasOpened ? 'locked' : 'not_open',
      message: wasOpened ? PAYMENT_WINDOW_MESSAGES.locked : PAYMENT_WINDOW_MESSAGES.not_open,
      start,
      deadline
    });
  }

  if (!start || !deadline) {
    return makePaymentWindowState({
      isOpen: false,
      isClosed: false,
      reason: 'not_configured',
      message: PAYMENT_WINDOW_MESSAGES.not_configured,
      start,
      deadline
    });
  }

  if (current < start) {
    return makePaymentWindowState({
      isOpen: false,
      isClosed: false,
      reason: 'not_started',
      message: PAYMENT_WINDOW_MESSAGES.not_started,
      start,
      deadline
    });
  }

  if (current > deadline) {
    return makePaymentWindowState({
      isOpen: false,
      isClosed: true,
      reason: 'closed',
      message: PAYMENT_WINDOW_MESSAGES.closed,
      start,
      deadline
    });
  }

  return makePaymentWindowState({
    isOpen: true,
    isClosed: false,
    reason: 'open',
    message: PAYMENT_WINDOW_MESSAGES.open,
    start,
    deadline
  });
};

const getPaymentRegistrationBlock = (semester, now = new Date(), options = {}) => {
  const pendingAppeals = Number(options.pendingAppeals || 0);
  const registrationWindow = getRegistrationWindowState(semester, now);
  const appealWindow = getAppealWindowState(semester, now);
  const tuitionPaymentWindow = getTuitionPaymentWindowState(semester, now);

  if (registrationWindow.isOpen || registrationWindow.reason === 'not_started') {
    return {
      blocked: true,
      reason: registrationWindow.reason === 'not_started' ? 'registration_not_started' : 'registration_deadline_open',
      message: PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE,
      registrationWindow,
      appealWindow,
      tuitionPaymentWindow
    };
  }

  if (appealWindow.isOpen || appealWindow.reason === 'not_started' || appealWindow.reason === 'not_configured') {
    return {
      blocked: true,
      reason: appealWindow.reason === 'open' ? 'appeal_deadline_open' : `appeal_${appealWindow.reason}`,
      message: PAYMENT_BLOCKED_DURING_APPEAL_MESSAGE,
      registrationWindow,
      appealWindow,
      tuitionPaymentWindow
    };
  }

  if (pendingAppeals > 0) {
    return {
      blocked: true,
      reason: 'pending_appeals',
      message: PAYMENT_BLOCKED_PENDING_APPEALS_MESSAGE,
      registrationWindow,
      appealWindow,
      tuitionPaymentWindow,
      pendingAppeals
    };
  }

  if (!semester?.NgayChotDangKy) {
    return {
      blocked: true,
      reason: 'registration_not_finalized',
      message: PAYMENT_BLOCKED_NOT_FINALIZED_MESSAGE,
      registrationWindow,
      appealWindow,
      tuitionPaymentWindow
    };
  }

  if (!semester?.MoThuHocPhi) {
    return {
      blocked: true,
      reason: 'tuition_payment_not_open',
      message: PAYMENT_BLOCKED_NOT_OPEN_MESSAGE,
      registrationWindow,
      appealWindow,
      tuitionPaymentWindow
    };
  }

  if (!tuitionPaymentWindow.isOpen) {
    return {
      blocked: true,
      reason: `tuition_payment_${tuitionPaymentWindow.reason || 'closed'}`,
      message: tuitionPaymentWindow.message || PAYMENT_BLOCKED_NOT_OPEN_MESSAGE,
      registrationWindow,
      appealWindow,
      tuitionPaymentWindow,
      pendingAppeals
    };
  }

  return { blocked: false, registrationWindow, appealWindow, tuitionPaymentWindow, pendingAppeals };
};

const assertRegistrationPeriodClosedForPayment = (registration, now = new Date(), options = {}) => {
  const block = getPaymentRegistrationBlock(registration?.HOCKY, now, options);
  if (!block.blocked) return block;

  throw {
    status: 400,
    code: String(block.reason || 'PAYMENT_BLOCKED').toUpperCase(),
    message: block.message || PAYMENT_BLOCKED_NOT_OPEN_MESSAGE
  };
};

module.exports = {
  PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE,
  PAYMENT_BLOCKED_DURING_APPEAL_MESSAGE,
  PAYMENT_BLOCKED_NOT_FINALIZED_MESSAGE,
  PAYMENT_BLOCKED_NOT_OPEN_MESSAGE,
  PAYMENT_BLOCKED_PENDING_APPEALS_MESSAGE,
  PAYMENT_WINDOW_MESSAGES,
  getTuitionPaymentWindowState,
  getPaymentRegistrationBlock,
  assertRegistrationPeriodClosedForPayment
};
