const prisma = require('../config/database');

const getPublicNotifications = async (req, res) => {
  try {
    const data = await prisma.THONGBAO.findMany({ where: { Loai: 'chung', TrangThai: true }, orderBy: [{ GhimTop: 'desc' }, { NgayTao: 'desc' }], take: 10 });
    res.json({ success: true, data });
  } catch (error) { console.error('Error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getPersonalNotifications = async (req, res) => {
  try {
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin người dùng' });
    const data = await prisma.THONGBAO.findMany({ where: { Loai: 'ca_nhan', MaTaiKhoanNhan: userId }, orderBy: [{ DaDoc: 'asc' }, { NgayTao: 'desc' }], take: 20 });
    res.json({ success: true, data });
  } catch (error) { console.error('Error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    const [publicData, personalData] = await Promise.all([
      prisma.THONGBAO.findMany({ where: { Loai: 'chung', TrangThai: true }, orderBy: { NgayTao: 'desc' }, take: 10 }),
      userId ? prisma.THONGBAO.findMany({ where: { Loai: 'ca_nhan', MaTaiKhoanNhan: userId }, orderBy: { NgayTao: 'desc' }, take: 20 }) : []
    ]);
    const all = [...publicData.map(n => ({ ...n, notification_type: 'public' })), ...personalData.map(n => ({ ...n, notification_type: 'personal' }))].sort((a, b) => new Date(b.NgayTao) - new Date(a.NgayTao));
    res.json({ success: true, data: all });
  } catch (error) { console.error('Error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    await prisma.THONGBAO.updateMany({ where: { MaThongBao: parseInt(req.params.id), MaTaiKhoanNhan: userId }, data: { DaDoc: true, NgayDoc: new Date() } });
    res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
  } catch (error) { console.error('Error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    if (!userId) return res.json({ success: true, count: 0 });
    const count = await prisma.THONGBAO.count({ where: { MaTaiKhoanNhan: userId, DaDoc: false } });
    res.json({ success: true, count });
  } catch (error) { console.error('Error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const createPublicNotification = async (req, res) => {
  try {
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    const { title, content, type, target, pinned, expires_at } = req.body;
    const data = await prisma.THONGBAO.create({ data: { Loai: 'chung', TieuDe: title, NoiDung: content, LoaiThongBao: type || 'Chung', DOITUONG: target || 'Tất cả', GhimTop: pinned || false, NgayHetHan: expires_at ? new Date(expires_at) : null, NguoiTao: userId } });
    res.status(201).json({ success: true, message: 'Tạo thông báo thành công', data });
  } catch (error) { console.error('Error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const deleteNotification = async (req, res) => {
  try { await prisma.THONGBAO.delete({ where: { MaThongBao: parseInt(req.params.id) } }); res.json({ success: true, message: 'Xóa thông báo thành công' }); }
  catch (error) { console.error('Error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { getPublicNotifications, getPersonalNotifications, getAllNotifications, markAsRead, getUnreadCount, createPublicNotification, deleteNotification };
