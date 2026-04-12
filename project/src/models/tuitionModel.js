// Model: Định dạng dữ liệu Học phí (view từ PHIEUDANGKY)
const formatTuition = (pdk) => ({
  SoPhieu: pdk.SoPhieu, MaSv: pdk.MaSv, MaHocKy: pdk.MaHocKy,
  TongTienPhaiDong: Number(pdk.TongTienPhaiDong) || 0,
  TrangThai: pdk.TrangThai,
  HoTen: pdk.SINHVIEN?.HoTen || null,
  Email: pdk.SINHVIEN?.Email || null,
  TenHocKy: pdk.HOCKY?.TenHocKy || null,
  TenNamHoc: pdk.HOCKY?.NAMHOC?.TenNamHoc || null,
});
const formatTuitionList = (rows) => rows.map(formatTuition);

module.exports = { formatTuition, formatTuitionList };
