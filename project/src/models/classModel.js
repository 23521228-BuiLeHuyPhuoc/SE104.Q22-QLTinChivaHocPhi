// Model: Định dạng dữ liệu Lớp học
const formatClass = (l) => ({
  MaLop: l.MaLop, TenLop: l.TenLop, MaMonHoc: l.MaMonHoc,
  GiangVien: l.GiangVien, LichHoc: l.LichHoc, PhongHoc: l.PhongHoc,
  SoLuongToiDa: l.SoLuongToiDa, MoTa: l.MoTa, TrangThai: l.TrangThai,
  TenMonHoc: l.MONHOC?.TenMonHoc || null,
  SoTinChi: l.MONHOC?.SoTinChi || null,
  TenKhoa: l.MONHOC?.KHOA?.TenKhoa || null,
});
const formatClassList = (rows) => rows.map(formatClass);

module.exports = { formatClass, formatClassList };
