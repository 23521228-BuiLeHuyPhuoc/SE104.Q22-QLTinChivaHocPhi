// Model: Định dạng dữ liệu Phiếu thu học phí
const formatPayment = (p) => ({
  SoPhieuThu: p.SoPhieuThu, SoPhieuDangKy: p.SoPhieuDangKy,
  MaSv: p.MaSv, NgayLap: p.NgayLap,
  SoTienThu: Number(p.SoTienThu) || 0,
  HinhThucThu: p.HinhThucThu, NguoiThu: p.NguoiThu,
  GhiChu: p.GhiChu, TrangThai: p.TrangThai,
  HoTen: p.SINHVIEN?.HoTen || null,
  Email: p.SINHVIEN?.Email || null,
});
const formatPaymentList = (rows) => rows.map(formatPayment);

module.exports = { formatPayment, formatPaymentList };
