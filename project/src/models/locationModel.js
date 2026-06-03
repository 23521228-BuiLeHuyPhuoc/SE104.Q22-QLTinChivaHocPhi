// Model: Định dạng dữ liệu Địa chỉ (Tỉnh, Phường Xã)
const formatProvince = (t) => ({
  MaTinh: t.MaTinh,
  TenTinh: t.TenTinh,
  LoaiTinh: t.LoaiTinh,
  TrangThai: t.TrangThai,
  NguoiCapNhat: t.NguoiCapNhat,
  NguoiCapNhatTen: t.NguoiCapNhatTen,
  NgayCapNhat: t.NgayCapNhat
});

const formatWard = (px) => ({
  MaPhuongXa: px.MaPhuongXa,
  TenPhuongXa: px.TenPhuongXa,
  MaTinh: px.MaTinh,
  Loai: px.Loai,
  KhuVuc: px.KhuVuc,
  TrangThai: px.TrangThai,
  NguoiCapNhat: px.NguoiCapNhat,
  NguoiCapNhatTen: px.NguoiCapNhatTen,
  NgayCapNhat: px.NgayCapNhat
});

module.exports = { formatProvince, formatWard };
