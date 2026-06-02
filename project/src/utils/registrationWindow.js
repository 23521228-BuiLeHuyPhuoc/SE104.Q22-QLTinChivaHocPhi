const { SEMESTER_STATUS } = require('./businessConstants');

const SEMESTER_ENDED_STATUS = SEMESTER_STATUS.ENDED;

const REGISTRATION_MESSAGES = {
  not_configured: 'Học kỳ chưa cấu hình đầy đủ thời gian đăng ký học phần',
  not_started: 'Chưa đến thời gian đăng ký học phần',
  closed: 'Đợt đăng ký học phần đã kết thúc',
  semester_ended: 'Học kỳ đã kết thúc, không thể đăng ký học phần'
};

const APPEAL_MESSAGES = {
  not_configured: 'Học kỳ chưa cấu hình thời gian cứu xét đăng ký',
  not_started: 'Chưa đến thời gian cứu xét đăng ký',
  closed: 'Đợt cứu xét đăng ký đã kết thúc',
  semester_ended: 'Học kỳ đã kết thúc, không thể cứu xét đăng ký',
  finalized: 'Học kỳ đã chốt đăng ký, không thể gửi đơn cứu xét',
  tuition_opened: 'Học kỳ đã mở thu học phí, không thể gửi đơn cứu xét'
};

const FINALIZE_MESSAGES = {
  appeal_not_closed: 'Chỉ được chốt đăng ký sau khi hết hạn cứu xét đăng ký',
  pending_appeals: 'Không thể chốt đăng ký khi còn đơn cứu xét chờ duyệt',
  already_finalized: 'Học kỳ đã được chốt đăng ký'
};

const PAYMENT_OPEN_MESSAGES = {
  not_finalized: 'Chỉ được mở thu học phí sau khi đã chốt đăng ký',
  appeal_not_closed: 'Chỉ được mở thu học phí sau khi hết hạn cứu xét đăng ký',
  pending_appeals: 'Không thể mở thu học phí khi còn đơn cứu xét chờ duyệt'
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

const makeWindowState = ({ isOpen, isClosed, reason, message, start, deadline }) => ({
  isOpen,
  isClosed,
  reason,
  message,
  start,
  deadline
});

const getTimeWindowState = ({ startValue, endValue, messages, now = new Date(), semesterEnded = false }) => {
  const current = toValidDate(now) || new Date();
  const start = toValidDate(startValue);
  const deadline = getDeadlineEnd(endValue);

  if (semesterEnded) {
    return makeWindowState({
      isOpen: false,
      isClosed: true,
      reason: 'semester_ended',
      message: messages.semester_ended,
      start,
      deadline
    });
  }

  if (!start || !deadline) {
    return makeWindowState({
      isOpen: false,
      isClosed: false,
      reason: 'not_configured',
      message: messages.not_configured,
      start,
      deadline
    });
  }

  if (current < start) {
    return makeWindowState({
      isOpen: false,
      isClosed: false,
      reason: 'not_started',
      message: messages.not_started,
      start,
      deadline
    });
  }

  if (current > deadline) {
    return makeWindowState({
      isOpen: false,
      isClosed: true,
      reason: 'closed',
      message: messages.closed,
      start,
      deadline
    });
  }

  return makeWindowState({
    isOpen: true,
    isClosed: false,
    reason: 'open',
    message: null,
    start,
    deadline
  });
};

const getRegistrationWindowState = (semester, now = new Date()) => {
  const state = getTimeWindowState({
    startValue: semester?.NgayBatDauDangKy,
    endValue: semester?.NgayKetThucDangKy,
    messages: REGISTRATION_MESSAGES,
    now,
    semesterEnded: semester?.TrangThai === SEMESTER_ENDED_STATUS
  });

  return {
    ...state,
    registrationStart: state.start,
    registrationDeadline: state.deadline
  };
};

const getAppealWindowState = (semester, now = new Date()) => {
  const state = getTimeWindowState({
    startValue: semester?.NgayBatDauCuuXet,
    endValue: semester?.NgayKetThucCuuXet,
    messages: APPEAL_MESSAGES,
    now,
    semesterEnded: semester?.TrangThai === SEMESTER_ENDED_STATUS
  });

  if (state.isOpen && semester?.NgayChotDangKy) {
    return {
      ...state,
      isOpen: false,
      isClosed: true,
      reason: 'finalized',
      message: APPEAL_MESSAGES.finalized,
      appealStart: state.start,
      appealDeadline: state.deadline
    };
  }

  if (state.isOpen && semester?.MoThuHocPhi) {
    return {
      ...state,
      isOpen: false,
      isClosed: true,
      reason: 'tuition_opened',
      message: APPEAL_MESSAGES.tuition_opened,
      appealStart: state.start,
      appealDeadline: state.deadline
    };
  }

  return {
    ...state,
    appealStart: state.start,
    appealDeadline: state.deadline
  };
};

const getSemesterWorkflowState = (semester, options = {}) => {
  const now = options.now || new Date();
  const pendingAppeals = Number(options.pendingAppeals || 0);
  const registrationWindow = getRegistrationWindowState(semester, now);
  const appealWindow = getAppealWindowState(semester, now);
  const finalized = Boolean(semester?.NgayChotDangKy);
  const tuitionOpen = Boolean(semester?.MoThuHocPhi);

  let canFinalize = false;
  let finalizeReason = FINALIZE_MESSAGES.appeal_not_closed;
  if (finalized) {
    finalizeReason = FINALIZE_MESSAGES.already_finalized;
  } else if (pendingAppeals > 0) {
    finalizeReason = FINALIZE_MESSAGES.pending_appeals;
  } else if (appealWindow.isClosed && appealWindow.reason === 'closed') {
    canFinalize = true;
    finalizeReason = null;
  }

  let canOpenTuitionPayment = false;
  let openTuitionPaymentReason = PAYMENT_OPEN_MESSAGES.not_finalized;
  if (!finalized) {
    openTuitionPaymentReason = PAYMENT_OPEN_MESSAGES.not_finalized;
  } else if (pendingAppeals > 0) {
    openTuitionPaymentReason = PAYMENT_OPEN_MESSAGES.pending_appeals;
  } else if (!(appealWindow.isClosed && appealWindow.reason === 'closed')) {
    openTuitionPaymentReason = PAYMENT_OPEN_MESSAGES.appeal_not_closed;
  } else {
    canOpenTuitionPayment = true;
    openTuitionPaymentReason = null;
  }

  return {
    registrationWindow,
    appealWindow,
    canRegister: registrationWindow.isOpen,
    canAppeal: appealWindow.isOpen,
    canFinalize,
    canOpenTuitionPayment,
    finalized,
    tuitionOpen,
    pendingAppeals,
    finalizeReason,
    openTuitionPaymentReason
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

const assertAppealOpen = (semester, now) => {
  const state = getAppealWindowState(semester, now);
  if (state.isOpen) return state;

  throw {
    status: 400,
    code: 'APPEAL_WINDOW_CLOSED',
    message: state.message || APPEAL_MESSAGES.closed
  };
};

const assertRegistrationClosed = (semester, now) => {
  const workflow = getSemesterWorkflowState(semester, { now });
  if (workflow.canFinalize) return workflow.registrationWindow;

  throw {
    status: 400,
    code: 'REGISTRATION_WINDOW_NOT_CLOSED',
    message: workflow.finalizeReason || REGISTRATION_MESSAGES.closed
  };
};

const assertCanFinalizeRegistration = (semester, options = {}) => {
  const workflow = getSemesterWorkflowState(semester, options);
  if (workflow.canFinalize) return workflow;
  throw {
    status: 400,
    code: 'SEMESTER_CANNOT_FINALIZE_REGISTRATION',
    message: workflow.finalizeReason || FINALIZE_MESSAGES.appeal_not_closed
  };
};

const assertCanOpenTuitionPayment = (semester, options = {}) => {
  const workflow = getSemesterWorkflowState(semester, options);
  if (workflow.canOpenTuitionPayment) return workflow;
  throw {
    status: 400,
    code: 'SEMESTER_CANNOT_OPEN_TUITION_PAYMENT',
    message: workflow.openTuitionPaymentReason || PAYMENT_OPEN_MESSAGES.not_finalized
  };
};

module.exports = {
  SEMESTER_ENDED_STATUS,
  REGISTRATION_MESSAGES,
  APPEAL_MESSAGES,
  FINALIZE_MESSAGES,
  PAYMENT_OPEN_MESSAGES,
  getDeadlineEnd,
  getRegistrationWindowState,
  getAppealWindowState,
  getSemesterWorkflowState,
  assertRegistrationOpen,
  assertAppealOpen,
  assertRegistrationClosed,
  assertCanFinalizeRegistration,
  assertCanOpenTuitionPayment
};
