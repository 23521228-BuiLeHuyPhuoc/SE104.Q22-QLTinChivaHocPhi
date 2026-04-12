// Model: Định dạng dữ liệu Tài khoản
const formatAccount = (tk) => ({
  MaTaiKhoan: tk.MaTaiKhoan,
  TenDangNhap: tk.TenDangNhap,
  Role: tk.Role,
  HoTen: tk.HoTen,
  Email: tk.Email,
  Sdt: tk.Sdt,
  AnhDaiDien: tk.AnhDaiDien,
  TrangThai: tk.TrangThai,
  NgayTao: tk.NgayTao,
  // Từ JOIN
  sinhVien: tk.SINHVIEN_SINHVIEN_MaTaiKhoanToTAIKHOAN || null,
  quanTriVien: tk.QUANTRIVIEN || null,
});

const formatAccountList = (rows) => rows.map(formatAccount);

module.exports = { formatAccount, formatAccountList };
