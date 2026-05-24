const prisma = require('../config/database');

const getUserId = (req) => Number(req.user?.MaTaiKhoan || req.user?.id || 0);

const toNotification = (row, type = 'personal') => ({
  ...row,
  Loai: type === 'public' ? 'chung' : 'ca_nhan',
  LoaiThongBao: type === 'public' ? 'Chung' : 'Ca nhan',
  TrangThai: true,
  GhimTop: false,
  notification_type: type
});

const getPersonalRows = (userId, take = 20) => prisma.$queryRaw`
  SELECT "MaThongBao", "MaTaiKhoanNhan", "TieuDe", "NoiDung", "DuongDan", "DaDoc", "NgayDoc", "NgayTao"
  FROM "THONGBAO"
  WHERE "MaTaiKhoanNhan" = ${userId}
  ORDER BY COALESCE("DaDoc", FALSE) ASC, "NgayTao" DESC
  LIMIT ${take}
`;

const getPublicNotifications = async (req, res) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Notification public error:', error);
    res.status(500).json({ success: false, message: 'Loi server' });
  }
};

const getPersonalNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Khong tim thay thong tin nguoi dung' });
    }

    const data = (await getPersonalRows(userId)).map((row) => toNotification(row));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Notification personal error:', error);
    res.status(500).json({ success: false, message: 'Loi server' });
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Khong tim thay thong tin nguoi dung' });
    }

    const data = (await getPersonalRows(userId, 30)).map((row) => toNotification(row));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Notification list error:', error);
    res.status(500).json({ success: false, message: 'Loi server' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const notificationId = Number(req.params.id);
    if (!userId || !notificationId) {
      return res.status(400).json({ success: false, message: 'Du lieu khong hop le' });
    }

    await prisma.$executeRaw`
      UPDATE "THONGBAO"
      SET "DaDoc" = TRUE, "NgayDoc" = CURRENT_TIMESTAMP
      WHERE "MaThongBao" = ${notificationId} AND "MaTaiKhoanNhan" = ${userId}
    `;

    res.json({ success: true, message: 'Da danh dau da doc' });
  } catch (error) {
    console.error('Notification read error:', error);
    res.status(500).json({ success: false, message: 'Loi server' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json({ success: true, count: 0 });

    const rows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "THONGBAO"
      WHERE "MaTaiKhoanNhan" = ${userId} AND "DaDoc" IS NOT TRUE
    `;

    res.json({ success: true, count: Number(rows[0]?.count || 0) });
  } catch (error) {
    console.error('Notification count error:', error);
    res.status(500).json({ success: false, message: 'Loi server' });
  }
};

const createPublicNotification = async (req, res) => {
  try {
    const { title, content, recipientId, MaTaiKhoanNhan, target, url, DuongDan } = req.body;
    const targetId = Number(recipientId || MaTaiKhoanNhan || target || 0);
    if (!targetId || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Can co MaTaiKhoanNhan, title va content'
      });
    }

    const rows = await prisma.$queryRaw`
      INSERT INTO "THONGBAO" ("MaTaiKhoanNhan", "TieuDe", "NoiDung", "DuongDan", "DaDoc")
      VALUES (${targetId}, ${title}, ${content}, ${url || DuongDan || null}, FALSE)
      RETURNING "MaThongBao", "MaTaiKhoanNhan", "TieuDe", "NoiDung", "DuongDan", "DaDoc", "NgayDoc", "NgayTao"
    `;

    res.status(201).json({
      success: true,
      message: 'Tao thong bao thanh cong',
      data: toNotification(rows[0])
    });
  } catch (error) {
    console.error('Notification create error:', error);
    res.status(500).json({ success: false, message: 'Loi server' });
  }
};

// ── Admin CRUD ──
const createAdminNotification = async (req, res) => {
  try {
    const { TieuDe, NoiDung, Loai, DOITUONG, GhimTop, NgayHetHan } = req.body;
    if (!TieuDe || !NoiDung) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề và nội dung' });
    }
    const nguoiTao = Number(req.user?.id || req.user?.MaTaiKhoan || 0) || null;
    const notif = await prisma.THONGBAO.create({
      data: {
        TieuDe, NoiDung,
        Loai: Loai || 'chung',
        DOITUONG: DOITUONG || 'Tất cả',
        GhimTop: GhimTop || false,
        NgayHetHan: NgayHetHan ? new Date(NgayHetHan) : null,
        NguoiTao: nguoiTao
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
    const { TieuDe, NoiDung, Loai, DOITUONG, GhimTop, NgayHetHan } = req.body;
    const notif = await prisma.THONGBAO.update({
      where: { MaThongBao: id },
      data: {
        ...(TieuDe && { TieuDe }),
        ...(NoiDung && { NoiDung }),
        ...(Loai && { Loai }),
        ...(DOITUONG && { DOITUONG }),
        ...(GhimTop !== undefined && { GhimTop }),
        ...(NgayHetHan !== undefined && { NgayHetHan: NgayHetHan ? new Date(NgayHetHan) : null })
      }
    });
    res.json({ success: true, message: 'Cập nhật thành công', data: notif });
  } catch (error) {
    console.error('Notification update error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'Du lieu khong hop le' });
    }

    await prisma.THONGBAO.delete({ where: { MaThongBao: notificationId } });

    res.json({ success: true, message: 'Xoa thong bao thanh cong' });
  } catch (error) {
    console.error('Notification delete error:', error);
    res.status(500).json({ success: false, message: 'Loi server' });
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
