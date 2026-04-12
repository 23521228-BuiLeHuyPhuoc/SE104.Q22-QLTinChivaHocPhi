// Model: Định dạng dữ liệu Thông báo
const formatNotification = (tb) => ({
  MaThongBao: tb.MaThongBao, Loai: tb.Loai,
  TieuDe: tb.TieuDe, NoiDung: tb.NoiDung,
  LoaiThongBao: tb.LoaiThongBao, DOITUONG: tb.DOITUONG,
  GhimTop: tb.GhimTop, NgayHetHan: tb.NgayHetHan,
  DuongDan: tb.DuongDan, DaDoc: tb.DaDoc, NgayDoc: tb.NgayDoc,
  TrangThai: tb.TrangThai, NgayTao: tb.NgayTao,
});
const formatNotificationList = (rows) => rows.map(formatNotification);

module.exports = { formatNotification, formatNotificationList };
