// Model: Định dạng dữ liệu Môn học
const formatCourse = (mh) => ({
  MaMonHoc: mh.MaMonHoc, TenMonHoc: mh.TenMonHoc, SoTiet: mh.SoTiet,
  SoTinChi: mh.SoTinChi, LoaiMon: mh.LoaiMon, MaKhoa: mh.MaKhoa,
  MoTa: mh.MoTa, TrangThai: mh.TrangThai,
  TenKhoa: mh.KHOA?.TenKhoa || null,
});
const formatCourseList = (rows) => rows.map(formatCourse);

module.exports = { formatCourse, formatCourseList };
