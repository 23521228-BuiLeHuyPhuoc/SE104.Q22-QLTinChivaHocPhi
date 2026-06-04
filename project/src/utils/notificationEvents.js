const AUTO_NOTIFICATION_TYPES = {
  COURSE_REGISTRATION: 'auto_dang_ky_mon',
  TUITION_PAYMENT: 'auto_thanh_toan_hoc_phi'
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VNĐ`;

const getStudentAccountId = async (db, maSv) => {
  if (!maSv) return null;
  const student = await db.SINHVIEN.findFirst({
    where: { MaSv: maSv, DaXoa: false },
    select: { MaTaiKhoan: true }
  });
  if (student?.MaTaiKhoan) return student.MaTaiKhoan;

  const account = await db.TAIKHOAN.findFirst({
    where: {
      TrangThai: true,
      OR: [{ MaSv: maSv }, { TenDangNhap: maSv }]
    },
    select: { MaTaiKhoan: true }
  });
  return account?.MaTaiKhoan || null;
};

const createStudentNotification = async (db, maSv, payload) => {
  const accountId = await getStudentAccountId(db, maSv);
  if (!accountId) return null;

  return db.THONGBAO.create({
    data: {
      MaTaiKhoanNhan: accountId,
      TieuDe: payload.TieuDe,
      NoiDung: payload.NoiDung,
      Loai: payload.Loai || 'he_thong',
      LoaiThongBao: payload.LoaiThongBao,
      DOITUONG: 'Cá nhân',
      DuongDan: payload.DuongDan || null,
      GhimTop: false,
      DaDoc: false,
      TrangThai: true,
      NguoiTao: payload.NguoiTao || null
    }
  });
};

const createCourseRegistrationNotification = async (db, payload) => {
  const courseLabel = [payload.MaMonHoc, payload.TenMonHoc].filter(Boolean).join(' - ');
  const classPart = payload.MaLop ? `, lớp ${payload.MaLop}` : '';
  const creditPart = payload.SoTinChi ? ` (${payload.SoTinChi} tín chỉ)` : '';
  const totalPart = payload.TongTinChi ? ` Tổng số tín chỉ đã đăng ký: ${payload.TongTinChi}.` : '';

  return createStudentNotification(db, payload.MaSv, {
    TieuDe: 'Đăng ký học phần thành công',
    NoiDung: `Bạn đã đăng ký ${courseLabel || 'học phần'}${classPart}${creditPart}.${totalPart}`,
    Loai: 'hoc_vu',
    LoaiThongBao: AUTO_NOTIFICATION_TYPES.COURSE_REGISTRATION,
    DuongDan: '/student/my-courses',
    NguoiTao: payload.NguoiTao
  });
};

const createTuitionPaymentNotification = async (db, payload) => {
  const success = Boolean(payload.ThanhCong);
  const statusText = success ? 'thành công' : 'thất bại';
  const transactionPart = payload.MaGiaoDich ? ` Mã giao dịch: ${payload.MaGiaoDich}.` : '';
  const reasonPart = !success && payload.LyDo ? ` Lý do: ${payload.LyDo}.` : '';

  return createStudentNotification(db, payload.MaSv, {
    TieuDe: success ? 'Thanh toán học phí thành công' : 'Thanh toán học phí thất bại',
    NoiDung: `Thanh toán học phí phiếu thu #${payload.SoPhieuThu} ${statusText}. Số tiền: ${formatMoney(payload.SoTienThu)}.${transactionPart}${reasonPart}`,
    Loai: 'tai_chinh',
    LoaiThongBao: AUTO_NOTIFICATION_TYPES.TUITION_PAYMENT,
    DuongDan: '/student/my-payments',
    NguoiTao: payload.NguoiTao
  });
};

module.exports = {
  AUTO_NOTIFICATION_TYPES,
  createCourseRegistrationNotification,
  createTuitionPaymentNotification
};
