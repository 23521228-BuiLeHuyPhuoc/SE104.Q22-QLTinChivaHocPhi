const pool = require('../config/database');

// Lấy thông báo chung (cho tất cả)
const getPublicNotifications = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        "MaThongBao" as id,
        "TieuDe" as title,
        "NoiDung" as content,
        "LoaiThongBao" as type,
        "DOITUONG" as target,
        "GhimTop" as pinned,
        "NgayTao" as created_at,
        "NgayHetHan" as expires_at,
        "TrangThai" as active
      FROM "THONGBAO" 
      WHERE "TrangThai" = TRUE 
        AND ("NgayHetHan" IS NULL OR "NgayHetHan" > CURRENT_TIMESTAMP)
      ORDER BY "GhimTop" DESC, "NgayTao" DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching public notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông báo chung',
      error: error.message
    });
  }
};

// Lấy thông báo cá nhân của user
const getPersonalNotifications = async (req, res) => {
  try {
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    const result = await pool.query(`
      SELECT 
        id,
        "TieuDe" as title,
        "NoiDung" as content,
        "LoaiThongBao" as type,
        "DuongDan" as link,
        "DaDoc" as is_read,
        "NgayDoc" as read_at,
        "NgayTao" as created_at
      FROM thong_bao_ca_nhan 
      WHERE "MaTaiKhoan" = $1
      ORDER BY "DaDoc" ASC, "NgayTao" DESC
      LIMIT 20
    `, [userId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching personal notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông báo cá nhân',
      error: error.message
    });
  }
};

// Lấy tất cả thông báo (công khai + cá nhân)
const getAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    
    // Lấy thông báo chung
    const publicResult = await pool.query(`
      SELECT 
        "MaThongBao" as id,
        "TieuDe" as title,
        "NoiDung" as content,
        "LoaiThongBao" as type,
        "GhimTop" as pinned,
        "NgayTao" as created_at,
        'public' as notification_type
      FROM "THONGBAO" 
      WHERE "TrangThai" = TRUE 
        AND ("NgayHetHan" IS NULL OR "NgayHetHan" > CURRENT_TIMESTAMP)
      ORDER BY "GhimTop" DESC, "NgayTao" DESC
      LIMIT 10
    `);
    
    // Lấy thông báo cá nhân nếu có userId
    let personalResult = { rows: [] };
    if (userId) {
      personalResult = await pool.query(`
        SELECT 
          id,
          "TieuDe" as title,
          "NoiDung" as content,
          "LoaiThongBao" as type,
          "DaDoc" as is_read,
          "NgayTao" as created_at,
          'personal' as notification_type
        FROM thong_bao_ca_nhan 
        WHERE "MaTaiKhoan" = $1
        ORDER BY "DaDoc" ASC, "NgayTao" DESC
        LIMIT 10
      `, [userId]);
    }
    
    // Kết hợp và sắp xếp theo thời gian
    const allNotifications = [
      ...publicResult.rows,
      ...personalResult.rows
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({
      success: true,
      data: allNotifications
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông báo',
      error: error.message
    });
  }
};

// Đánh dấu thông báo đã đọc
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    await pool.query(`
      UPDATE thong_bao_ca_nhan 
      SET "DaDoc" = TRUE, "NgayDoc" = CURRENT_TIMESTAMP
      WHERE id = $1 AND "MaTaiKhoan" = $2
    `, [id, userId]);
    
    res.json({
      success: true,
      message: 'Đã đánh dấu đã đọc'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái thông báo',
      error: error.message
    });
  }
};

// Đếm số thông báo chưa đọc
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    
    if (!userId) {
      return res.json({
        success: true,
        count: 0
      });
    }

    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM thong_bao_ca_nhan 
      WHERE "MaTaiKhoan" = $1 AND "DaDoc" = FALSE
    `, [userId]);
    
    res.json({
      success: true,
      count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đếm thông báo chưa đọc',
      error: error.message
    });
  }
};

// Admin: Tạo thông báo chung
const createPublicNotification = async (req, res) => {
  try {
    const { title, content, type, target, pinned, expires_at } = req.body;
    const userId = req.user?.MaTaiKhoan || req.user?.id;
    
    const result = await pool.query(`
      INSERT INTO "THONGBAO" ("TieuDe", "NoiDung", "LoaiThongBao", "DOITUONG", "GhimTop", "NgayHetHan", "NguoiTao")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING "MaThongBao" as id, "TieuDe" as title, "NoiDung" as content
    `, [title, content, type || 'Chung', target || 'Tất cả', pinned || false, expires_at, userId]);
    
    res.status(201).json({
      success: true,
      message: 'Tạo thông báo thành công',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo thông báo',
      error: error.message
    });
  }
};

// Admin: Xóa thông báo
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM "THONGBAO" WHERE "MaThongBao" = $1', [id]);
    
    res.json({
      success: true,
      message: 'Xóa thông báo thành công'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thông báo',
      error: error.message
    });
  }
};

module.exports = {
  getPublicNotifications,
  getPersonalNotifications,
  getAllNotifications,
  markAsRead,
  getUnreadCount,
  createPublicNotification,
  deleteNotification
};
