const REGISTRATION_STATUS = {
  ACTIVE: 'Đã đăng ký',
  CANCELLED: 'Đã hủy'
};

const PAYMENT_STATUS = {
  UNPAID: 'Chưa thanh toán',
  PENDING: 'Chờ xác nhận',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
  REFUND: 'Hoàn tiền'
};

const APPEAL_TYPE = {
  ADD: 'them',
  CANCEL: 'huy',
  CHANGE: 'doi'
};

const APPEAL_STATUS = {
  PENDING: 'cho_duyet',
  APPROVED: 'da_duyet',
  REJECTED: 'tu_choi',
  CANCELLED: 'da_huy'
};

const SEMESTER_STATUS = {
  UPCOMING: 'Sắp diễn ra',
  ONGOING: 'Đang diễn ra',
  ENDED: 'Đã kết thúc'
};

const PAYMENT_METHOD = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
  E_WALLET: 'Ví điện tử'
};

module.exports = {
  REGISTRATION_STATUS,
  PAYMENT_STATUS,
  APPEAL_TYPE,
  APPEAL_STATUS,
  SEMESTER_STATUS,
  PAYMENT_METHOD
};
