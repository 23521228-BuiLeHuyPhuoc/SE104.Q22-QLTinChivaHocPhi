const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit, getActorId } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

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
        return sendErrorResponse(res, error, 'Loi server', 'Notification public error:');
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Khong tim thay thong tin nguoi dung' });
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
        return sendErrorResponse(res, error, 'Loi server', 'Notification list error:');
  }
};

const getPersonalNotifications = getAllNotifications;

const markAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const notificationId = Number(req.params.id);
    if (!userId || !notificationId) return res.status(400).json({ success: false, message: 'Du lieu khong hop le' });
    await prisma.THONGBAO.updateMany({
      where: { MaThongBao: notificationId, OR: [{ MaTaiKhoanNhan: userId }, { MaTaiKhoanNhan: null }] },
      data: { DaDoc: true, NgayDoc: new Date() }
    });
    res.json({ success: true, message: 'Da danh dau da doc' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Notification read error:');
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json({ success: true, count: 0 });
    const count = await prisma.THONGBAO.count({ where: { ...baseNotificationWhere(), MaTaiKhoanNhan: userId, DaDoc: false } });
    res.json({ success: true, count });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Notification count error:');
  }
};

const createPublicNotification = async (req, res) => {
  try {
    const { title, content, recipientId, MaTaiKhoanNhan, target, url, DuongDan } = req.body;
    const targetId = Number(recipientId || MaTaiKhoanNhan || target || 0);
    if (!targetId || !title || !content) return res.status(400).json({ success: false, message: 'Can co nguoi nhan, tieu de va noi dung' });
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
    res.status(201).json({ success: true, message: 'Tao thong bao thanh cong', data: notification });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Notification create error:');
  }
};

const createAdminNotification = async (req, res) => {
  try {
    const { TieuDe, NoiDung, Loai, DOITUONG, GhimTop, NgayHetHan } = req.body;
    if (!TieuDe || !NoiDung) return res.status(400).json({ success: false, message: 'Vui long nhap tieu de va noi dung' });
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
    res.status(201).json({ success: true, message: 'Tao thong bao thanh cong', data: notif });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Admin notification create error:');
  }
};

const updateNotification = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID khong hop le' });
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
    res.json({ success: true, message: 'Cap nhat thanh cong', data: notif });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Notification update error:');
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (!notificationId) return res.status(400).json({ success: false, message: 'Du lieu khong hop le' });
    await prisma.THONGBAO.update({ where: { MaThongBao: notificationId }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Da chuyen thong bao vao thung rac' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Notification delete error:');
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
