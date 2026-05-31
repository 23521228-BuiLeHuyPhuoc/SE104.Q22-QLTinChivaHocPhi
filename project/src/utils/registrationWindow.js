const SEMESTER_ENDED_STATUS = 'Đã kết thúc';

const REGISTRATION_MESSAGES = {
  not_configured: 'Học kỳ chưa cấu hình đầy đủ thời gian đăng ký học phần',
  not_started: 'Chưa đến thời gian đăng ký học phần',
  closed: 'Đợt đăng ký học phần đã kết thúc',
  semester_ended: 'Học kỳ đã kết thúc, không thể đăng ký học phần'
};

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

const getRegistrationWindowState = (semester, now = new Date()) => {
  const current = toValidDate(now) || new Date();
  const registrationStart = toValidDate(semester?.NgayBatDauDangKy);
  const registrationDeadline = getDeadlineEnd(semester?.NgayKetThucDangKy);

  if (semester?.TrangThai === SEMESTER_ENDED_STATUS) {
    return {
      isOpen: false,
      isClosed: true,
      reason: 'semester_ended',
      message: REGISTRATION_MESSAGES.semester_ended,
      registrationStart,
      registrationDeadline
    };
  }

  if (!registrationStart || !registrationDeadline) {
    return {
      isOpen: false,
      isClosed: false,
      reason: 'not_configured',
      message: REGISTRATION_MESSAGES.not_configured,
      registrationStart,
      registrationDeadline
    };
  }

  if (current < registrationStart) {
    return {
      isOpen: false,
      isClosed: false,
      reason: 'not_started',
      message: REGISTRATION_MESSAGES.not_started,
      registrationStart,
      registrationDeadline
    };
  }

  if (current > registrationDeadline) {
    return {
      isOpen: false,
      isClosed: true,
      reason: 'closed',
      message: REGISTRATION_MESSAGES.closed,
      registrationStart,
      registrationDeadline
    };
  }

  return {
    isOpen: true,
    isClosed: false,
    reason: 'open',
    message: null,
    registrationStart,
    registrationDeadline
  };
};

const assertRegistrationOpen = (semester, now) => {
  const state = getRegistrationWindowState(semester, now);
  if (state.isOpen) return state;

  throw {
    status: 400,
    code: 'REGISTRATION_WINDOW_CLOSED',
    message: state.message || REGISTRATION_MESSAGES.closed
  };
};

const assertRegistrationClosed = (semester, now) => {
  const state = getRegistrationWindowState(semester, now);
  if (state.isClosed && state.reason === 'closed') return state;

  throw {
    status: 400,
    code: 'REGISTRATION_WINDOW_NOT_CLOSED',
    message: state.reason === 'semester_ended'
      ? state.message
      : 'Chỉ được chốt đăng ký sau khi hết hạn đăng ký học phần'
  };
};

module.exports = {
  SEMESTER_ENDED_STATUS,
  REGISTRATION_MESSAGES,
  getDeadlineEnd,
  getRegistrationWindowState,
  assertRegistrationOpen,
  assertRegistrationClosed
};
