const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit, getActorId } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const getUserId = (req) => Number(req.user?.MaTaiKhoan || req.user?.id || 0);
const AUTO_NOTIFICATION_PREFIX = 'auto_';
const MANUAL_NOTIFICATION_TYPES = new Set([
  'han_thu_hoc_phi',
  'han_dang_ky_hoc_phan',
  'han_he_thong',
  'thong_bao_he_thong',
  'thong_bao_ca_nhan'
]);

const isAutoNotificationType = (value) => String(value || '').startsWith(AUTO_NOTIFICATION_PREFIX);

const normalizeManualNotificationType = (value, category) => {
  const normalized = String(value || '').trim();
  if (MANUAL_NOTIFICATION_TYPES.has(normalized)) return normalized;
  if (category === 'tai_chinh') return 'han_thu_hoc_phi';
  if (category === 'hoc_vu') return 'han_dang_ky_hoc_phan';
  return 'han_he_thong';
};

const baseNotificationWhere = () => ({
  DaXoa: false,
  TrangThai: true,
  OR: [{ NgayHetHan: null }, { NgayHetHan: { gte: new Date() } }]
});

const getAllowedNotificationTargets = async (req) => {
  const targets = ['Tất cả'];
  if (req.user?.Role === 'admin') {
    targets.push('Admin', 'Quản trị viên');
    return targets;
  }

  targets.push('Sinh viên');
  const student = await prisma.SINHVIEN.findFirst({
    where: {
      OR: [
        { MaTaiKhoan: getUserId(req) },
        ...(req.user?.MaSv ? [{ MaSv: req.user.MaSv }] : [])
      ],
      DaXoa: false
    },
    include: { NGANHHOC: true }
  });
  if (student?.MaNganh) targets.push(`Ngành:${student.MaNganh}`);
  if (student?.NGANHHOC?.MaKhoa) targets.push(`Khoa:${student.NGANHHOC.MaKhoa}`);
  return targets;
};

const notificationAccessWhere = async (req, id) => {
  const userId = getUserId(req);
  const targets = await getAllowedNotificationTargets(req);
  return {
    ...(id ? { MaThongBao: Number(id) } : {}),
    DaXoa: false,
    TrangThai: true,
    AND: [
      { OR: [{ NgayHetHan: null }, { NgayHetHan: { gte: new Date() } }] },
      { OR: [
        { MaTaiKhoanNhan: userId },
        { MaTaiKhoanNhan: null, DOITUONG: { in: targets } }
      ] }
    ]
  };
};

const getPublicNotifications = async (req, res) => {
  try {
    const notifications = await prisma.THONGBAO.findMany({
      where: { ...baseNotificationWhere(), MaTaiKhoanNhan: null },
      orderBy: [{ GhimTop: 'desc' }, { NgayTao: 'desc' }],
      take: 15
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Notification public error:');
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Không tìm thấy thông tin người dùng' });
    const { page, limit, skip } = getPagination(req.query);
    const read = req.query.read;
    const where = await notificationAccessWhere(req);
    if (read === 'true') where.DaDoc = true;
    if (read === 'false') where.DaDoc = false;
    const [data, total] = await Promise.all([
      prisma.THONGBAO.findMany({ where, skip, take: limit, orderBy: [{ GhimTop: 'desc' }, { NgayTao: 'desc' }] }),
      prisma.THONGBAO.count({ where })
    ]);
    res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Notification list error:');
  }
};

const getPersonalNotifications = getAllNotifications;

const getNotificationById = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (!notificationId) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    const notification = await prisma.THONGBAO.findFirst({
      where: await notificationAccessWhere(req, notificationId)
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    res.json({ success: true, data: notification });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Notification detail error:');
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const notificationId = Number(req.params.id);
    if (!userId || !notificationId) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    const notification = await prisma.THONGBAO.findFirst({
      where: await notificationAccessWhere(req, notificationId),
      select: { MaThongBao: true }
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    await prisma.THONGBAO.updateMany({
      where: { MaThongBao: notificationId, OR: [{ MaTaiKhoanNhan: userId }, { MaTaiKhoanNhan: null }] },
      data: { DaDoc: true, NgayDoc: new Date() }
    });
    res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Notification read error:');
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    const where = await notificationAccessWhere(req);
    where.DaDoc = false;
    const result = await prisma.THONGBAO.updateMany({
      where,
      data: { DaDoc: true, NgayDoc: new Date() }
    });
    res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc', count: result.count || 0 });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Notification read all error:');
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json({ success: true, count: 0 });
    const where = await notificationAccessWhere(req);
    where.DaDoc = false;
    const count = await prisma.THONGBAO.count({ where });
    res.json({ success: true, count });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Notification count error:');
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
        LoaiThongBao: 'thong_bao_ca_nhan',
        DOITUONG: 'Cá nhân',
        NguoiTao: getActorId(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tạo thông báo thành công', data: notification });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Notification create error:');
  }
};

const createAdminNotification = async (req, res) => {
  try {
    const { TieuDe, NoiDung, Loai, LoaiThongBao, DOITUONG, GhimTop, NgayHetHan, DuongDan, targetType, targetValue, MaKhoa, MaNganh } = req.body;
    if (!TieuDe || !NoiDung) return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề và nội dung' });
    const notificationType = normalizeManualNotificationType(LoaiThongBao, Loai || 'chung');
    let target = DOITUONG || 'Tất cả';
    if (targetType === 'faculty' && (targetValue || MaKhoa)) target = `Khoa:${targetValue || MaKhoa}`;
    if (targetType === 'major' && (targetValue || MaNganh)) target = `Ngành:${targetValue || MaNganh}`;
    if (targetType === 'student') target = 'Sinh viên';
    if (targetType === 'admin') target = 'Quản trị viên';
    const notif = await prisma.THONGBAO.create({
      data: {
        TieuDe,
        NoiDung,
        Loai: Loai || 'chung',
        LoaiThongBao: notificationType,
        DOITUONG: target,
        DuongDan: DuongDan || null,
        GhimTop: GhimTop || false,
        NgayHetHan: NgayHetHan ? new Date(NgayHetHan) : null,
        NguoiTao: getActorId(req),
        ...updateAudit(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tạo thông báo thành công', data: notif });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Admin notification create error:');
  }
};

const updateNotification = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    const existing = await prisma.THONGBAO.findUnique({ where: { MaThongBao: id }, select: { LoaiThongBao: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    if (isAutoNotificationType(existing.LoaiThongBao)) {
      return res.status(400).json({ success: false, message: 'Thông báo tự động được tạo theo sự kiện, không chỉnh sửa thủ công' });
    }
    const { TieuDe, NoiDung, Loai, LoaiThongBao, DOITUONG, GhimTop, NgayHetHan, TrangThai, DuongDan, targetType, targetValue, MaKhoa, MaNganh } = req.body;
    const data = updateAudit(req);
    if (TieuDe) data.TieuDe = TieuDe;
    if (NoiDung) data.NoiDung = NoiDung;
    if (Loai) data.Loai = Loai;
    if (LoaiThongBao !== undefined || Loai) data.LoaiThongBao = normalizeManualNotificationType(LoaiThongBao, Loai);
    if (DOITUONG) data.DOITUONG = DOITUONG;
    if (targetType === 'faculty' && (targetValue || MaKhoa)) data.DOITUONG = `Khoa:${targetValue || MaKhoa}`;
    if (targetType === 'major' && (targetValue || MaNganh)) data.DOITUONG = `Ngành:${targetValue || MaNganh}`;
    if (targetType === 'student') data.DOITUONG = 'Sinh viên';
    if (targetType === 'admin') data.DOITUONG = 'Quản trị viên';
    if (DuongDan !== undefined) data.DuongDan = DuongDan || null;
    if (GhimTop !== undefined) data.GhimTop = GhimTop;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    if (NgayHetHan !== undefined) data.NgayHetHan = NgayHetHan ? new Date(NgayHetHan) : null;
    const notif = await prisma.THONGBAO.update({ where: { MaThongBao: id }, data });
    res.json({ success: true, message: 'Cập nhật thành công', data: notif });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Notification update error:');
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (!notificationId) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    await prisma.THONGBAO.update({ where: { MaThongBao: notificationId }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển thông báo vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Notification delete error:');
  }
};

module.exports = {
  getPublicNotifications,
  getPersonalNotifications,
  getAllNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  createPublicNotification,
  createAdminNotification,
  updateNotification,
  deleteNotification
};
