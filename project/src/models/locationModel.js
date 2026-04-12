// Model: Định dạng dữ liệu Địa chỉ (Tỉnh, Phường Xã)
const formatProvince = (t) => ({ MaTinh: t.MaTinh, TenTinh: t.TenTinh, LoaiTinh: t.LoaiTinh });
const formatWard = (px) => ({ MaPhuongXa: px.MaPhuongXa, TenPhuongXa: px.TenPhuongXa, MaTinh: px.MaTinh, Loai: px.Loai, KhuVuc: px.KhuVuc });

module.exports = { formatProvince, formatWard };
