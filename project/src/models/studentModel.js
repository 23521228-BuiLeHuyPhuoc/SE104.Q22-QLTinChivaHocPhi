// Model: Định dạng dữ liệu Sinh viên
const formatStudent = (sv) => ({
  MaSv: sv.MaSv,
  HoTen: sv.HoTen,
  NgaySinh: sv.NgaySinh,
  GioiTinh: sv.GioiTinh,
  Cccd: sv.Cccd,
  Email: sv.Email,
  Sdt: sv.Sdt,
  DiaChiLienHe: sv.DiaChiLienHe,
  MaPhuongXa: sv.MaPhuongXa,
  MaDanToc: sv.MaDanToc,
  MaNganh: sv.MaNganh,
  AnhDaiDien: sv.AnhDaiDien,
  NgayNhapHoc: sv.NgayNhapHoc,
  TrangThai: sv.TrangThai,
  NgayTao: sv.NgayTao,
  NguoiCapNhat: sv.NguoiCapNhat,
  NgayCapNhat: sv.NgayCapNhat,
  TrangThaiDuyet: sv.TAIKHOAN_SINHVIEN_MaTaiKhoanToTAIKHOAN?.TrangThaiDuyet || null,
  NgayDuyet: sv.TAIKHOAN_SINHVIEN_MaTaiKhoanToTAIKHOAN?.NgayDuyet || null,
  LyDoTuChoi: sv.TAIKHOAN_SINHVIEN_MaTaiKhoanToTAIKHOAN?.LyDoTuChoi || null,
  // Từ relations
  TenNganh: sv.NGANHHOC?.TenNganh || null,
  TenKhoa: sv.NGANHHOC?.KHOA?.TenKhoa || null,
  TenPhuongXa: sv.PHUONGXA?.TenPhuongXa || null,
  TenTinh: sv.PHUONGXA?.TINH?.TenTinh || null,
  TenDanToc: sv.DANTOC?.TenDanToc || null,
  DoiTuong: (sv.DOITUONGSINHVIEN || [])
    .map((item) => item.DOITUONG?.TenDoiTuong || item.MaDoiTuong)
    .filter(Boolean),
});

const formatStudentList = (rows) => rows.map(formatStudent);

module.exports = { formatStudent, formatStudentList };
