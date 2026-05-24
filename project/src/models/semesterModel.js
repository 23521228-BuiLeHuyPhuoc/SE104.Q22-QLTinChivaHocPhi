// Model: Định dạng dữ liệu Học kỳ và Năm học
const formatSemester = (hk) => ({
  MaHocKy: hk.MaHocKy, TenHocKy: hk.TenHocKy, MaNamHoc: hk.MaNamHoc,
  LoaiHocKy: hk.LoaiHocKy, ThuTu: hk.ThuTu,
  NgayBatDau: hk.NgayBatDau, NgayKetThuc: hk.NgayKetThuc,
  HanDongHocPhi: hk.HanDongHocPhi, TrangThai: hk.TrangThai,
  NguoiCapNhat: hk.NguoiCapNhat,
  NgayCapNhat: hk.NgayCapNhat,
  TenNamHoc: hk.NAMHOC?.TenNamHoc || null,
});
const formatSemesterList = (rows) => rows.map(formatSemester);

const formatAcademicYear = (nh) => ({
  MaNamHoc: nh.MaNamHoc, TenNamHoc: nh.TenNamHoc,
  NamBatDau: nh.NamBatDau, NamKetThuc: nh.NamKetThuc,
});

module.exports = { formatSemester, formatSemesterList, formatAcademicYear };
