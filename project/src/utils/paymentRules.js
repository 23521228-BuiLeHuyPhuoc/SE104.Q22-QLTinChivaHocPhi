const PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE =
  'Học kỳ này vẫn đang trong thời hạn đăng ký học phần. Chỉ có thể thanh toán sau khi kết thúc hạn đăng ký.';

const REGISTRATION_OPEN_STATUSES = new Set([
  'Sắp diễn ra',
  'Sắp tới',
  'Đang diễn ra',
  'Đang hoạt động',
  'Mở đăng ký'
]);

const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDeadlineEnd = (value) => {
  const date = toValidDate(value);
  if (!date) return null;

  const isDateOnly =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (isDateOnly) {
    date.setUTCDate(date.getUTCDate() + 1);
    date.setUTCMilliseconds(date.getUTCMilliseconds() - 1);
  }

  return date;
};

const getPaymentRegistrationBlock = (semester, now = new Date()) => {
  const current = toValidDate(now) || new Date();
  const registrationStart = toValidDate(semester?.NgayBatDauDangKy);
  const registrationDeadline = getDeadlineEnd(semester?.NgayKetThucDangKy);

  if (registrationStart && current < registrationStart) {
    return { blocked: true, reason: 'registration_not_started', registrationStart, registrationDeadline };
  }

  if (registrationDeadline) {
    return {
      blocked: current <= registrationDeadline,
      reason: current <= registrationDeadline ? 'registration_deadline_open' : null,
      registrationDeadline
    };
  }

  if (REGISTRATION_OPEN_STATUSES.has(semester?.TrangThai)) {
    return { blocked: true, reason: 'registration_status_open' };
  }

  return { blocked: false };
};

const assertRegistrationPeriodClosedForPayment = (registration, now = new Date()) => {
  const block = getPaymentRegistrationBlock(registration?.HOCKY, now);
  if (!block.blocked) return;

  throw {
    status: 400,
    code: 'REGISTRATION_PERIOD_OPEN',
    message: PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE
  };
};

module.exports = {
  PAYMENT_BLOCKED_DURING_REGISTRATION_MESSAGE,
  getPaymentRegistrationBlock,
  assertRegistrationPeriodClosedForPayment
};
