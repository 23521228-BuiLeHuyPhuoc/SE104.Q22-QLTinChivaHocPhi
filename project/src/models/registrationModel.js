// Model: Định dạng dữ liệu Đăng ký
const formatRegistration = (pdk) => ({
  SoPhieu: pdk.SoPhieu, MaSv: pdk.MaSv, MaHocKy: pdk.MaHocKy,
  NgayLap: pdk.NgayLap, TongTinChi: pdk.TongTinChi,
  TongTienPhaiDong: pdk.TongTienPhaiDong, TrangThai: pdk.TrangThai,
  HoTen: pdk.SINHVIEN?.HoTen || null,
  TenHocKy: pdk.HOCKY?.TenHocKy || null,
  TenNamHoc: pdk.HOCKY?.NAMHOC?.TenNamHoc || null,
});
const formatRegistrationList = (rows) => rows.map(formatRegistration);

module.exports = { formatRegistration, formatRegistrationList };
