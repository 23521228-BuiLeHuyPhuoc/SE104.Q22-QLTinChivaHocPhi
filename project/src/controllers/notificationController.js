const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit, getActorId } = require('../utils/audit');

const getUserId = (req) => Number(req.user?.MaTaiKhoan || req.user?.id || 0);

const baseNotificationWhere = () => ({
  DaXoa: false,
  TrangThai: true,
  OR: [{ NgayHetHan: null }, { NgayHetHan: { gte: new Date() } }]
});

const getPublicNotifications = async (req, res) => {
  try {
    const notifications = await prisma.THONGBAO.findMany({
      where: { ...baseNotificationWhere(), MaTaiKhoanNhan: null },
      orderBy: [{ GhimTop: 'desc' }, { NgayTao: 'desc' }],
      take: 15
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Notification public error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin người dùng' });
    const { page, limit, skip } = getPagination(req.query);
    const read = req.query.read;
    const where = {
      ...baseNotificationWhere(),
      OR: [
        { MaTaiKhoanNhan: userId },
        { MaTaiKhoanNhan: null, DOITUONG: { in: ['Tất cả', req.user?.Role === 'admin' ? 'Admin' : 'Sinh viên'] } }
      ]
    };
    if (read === 'true') where.DaDoc = true;
    if (read === 'false') where.DaDoc = false;
    const [data, total] = await Promise.all([
      prisma.THONGBAO.findMany({ where, skip, take: limit, orderBy: [{ GhimTop: 'desc' }, { NgayTao: 'desc' }] }),
      prisma.THONGBAO.count({ where })
    ]);
    res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('Notification list error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getPersonalNotifications = getAllNotifications;

const markAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const notificationId = Number(req.params.id);
    if (!userId || !notificationId) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    await prisma.THONGBAO.updateMany({
      where: { MaThongBao: notificationId, OR: [{ MaTaiKhoanNhan: userId }, { MaTaiKhoanNhan: null }] },
      data: { DaDoc: true, NgayDoc: new Date() }
    });
    res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    console.error('Notification read error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json({ success: true, count: 0 });
    const count = await prisma.THONGBAO.count({ where: { ...baseNotificationWhere(), MaTaiKhoanNhan: userId, DaDoc: false } });
    res.json({ success: true, count });
  } catch (error) {
    console.error('Notification count error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createPublicNotification = async (req, res) => {
  try {
    const { title, content, recipientId, MaTaiKhoanNhan, target, url, DuongDan } = req.body;
    const targetId = Number(recipientId || MaTaiKhoanNhan || target || 0);
    if (!targetId || !title || !content) return res.status(400).json({ success: false, message: 'Cần có người nhận, tiêu đề và nội dung' });
    const notification = await prisma.THONGBAO.create({
      data: {
        MaTaiKhoanNhan: targetId,
        TieuDe: title,
        NoiDung: content,
        DuongDan: url || DuongDan || null,
        DaDoc: false,
        Loai: 'ca_nhan',
        DOITUONG: 'Cá nhân',
        NguoiTao: getActorId(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tạo thông báo thành công', data: notification });
  } catch (error) {
    console.error('Notification create error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createAdminNotification = async (req, res) => {
  try {
    const { TieuDe, NoiDung, Loai, DOITUONG, GhimTop, NgayHetHan } = req.body;
    if (!TieuDe || !NoiDung) return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề và nội dung' });
    const notif = await prisma.THONGBAO.create({
      data: {
        TieuDe,
        NoiDung,
        Loai: Loai || 'chung',
        DOITUONG: DOITUONG || 'Tất cả',
        GhimTop: GhimTop || false,
        NgayHetHan: NgayHetHan ? new Date(NgayHetHan) : null,
        NguoiTao: getActorId(req),
        ...updateAudit(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tạo thông báo thành công', data: notif });
  } catch (error) {
    console.error('Admin notification create error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateNotification = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    const { TieuDe, NoiDung, Loai, DOITUONG, GhimTop, NgayHetHan, TrangThai } = req.body;
    const data = updateAudit(req);
    if (TieuDe) data.TieuDe = TieuDe;
    if (NoiDung) data.NoiDung = NoiDung;
    if (Loai) data.Loai = Loai;
    if (DOITUONG) data.DOITUONG = DOITUONG;
    if (GhimTop !== undefined) data.GhimTop = GhimTop;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    if (NgayHetHan !== undefined) data.NgayHetHan = NgayHetHan ? new Date(NgayHetHan) : null;
    const notif = await prisma.THONGBAO.update({ where: { MaThongBao: id }, data });
    res.json({ success: true, message: 'Cập nhật thành công', data: notif });
  } catch (error) {
    console.error('Notification update error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (!notificationId) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    await prisma.THONGBAO.update({ where: { MaThongBao: notificationId }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển thông báo vào thùng rác' });
  } catch (error) {
    console.error('Notification delete error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  getPublicNotifications,
  getPersonalNotifications,
  getAllNotifications,
  markAsRead,
  getUnreadCount,
  createPublicNotification,
  createAdminNotification,
  updateNotification,
  deleteNotification
};
