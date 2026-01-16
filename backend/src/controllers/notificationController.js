const pool = require('../config/database');

// Lấy thông báo chung (cho tất cả)
const getPublicNotifications = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ma_thong_bao as id,
        tieu_de as title,
        noi_dung as content,
        loai_thong_bao as type,
        doi_tuong as target,
        ghim_top as pinned,
        ngay_tao as created_at,
        ngay_het_han as expires_at,
        trang_thai as active
      FROM thong_bao 
      WHERE trang_thai = TRUE 
        AND (ngay_het_han IS NULL OR ngay_het_han > CURRENT_TIMESTAMP)
      ORDER BY ghim_top DESC, ngay_tao DESC
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
    const userId = req.user?.ma_tai_khoan || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    const result = await pool.query(`
      SELECT 
        id,
        tieu_de as title,
        noi_dung as content,
        loai_thong_bao as type,
        duong_dan as link,
        da_doc as is_read,
        ngay_doc as read_at,
        ngay_tao as created_at
      FROM thong_bao_ca_nhan 
      WHERE ma_tai_khoan = $1
      ORDER BY da_doc ASC, ngay_tao DESC
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
    const userId = req.user?.ma_tai_khoan || req.user?.id;
    
    // Lấy thông báo chung
    const publicResult = await pool.query(`
      SELECT 
        ma_thong_bao as id,
        tieu_de as title,
        noi_dung as content,
        loai_thong_bao as type,
        ghim_top as pinned,
        ngay_tao as created_at,
        'public' as notification_type
      FROM thong_bao 
      WHERE trang_thai = TRUE 
        AND (ngay_het_han IS NULL OR ngay_het_han > CURRENT_TIMESTAMP)
      ORDER BY ghim_top DESC, ngay_tao DESC
      LIMIT 10
    `);
    
    // Lấy thông báo cá nhân nếu có userId
    let personalResult = { rows: [] };
    if (userId) {
      personalResult = await pool.query(`
        SELECT 
          id,
          tieu_de as title,
          noi_dung as content,
          loai_thong_bao as type,
          da_doc as is_read,
          ngay_tao as created_at,
          'personal' as notification_type
        FROM thong_bao_ca_nhan 
        WHERE ma_tai_khoan = $1
        ORDER BY da_doc ASC, ngay_tao DESC
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
    const userId = req.user?.ma_tai_khoan || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    await pool.query(`
      UPDATE thong_bao_ca_nhan 
      SET da_doc = TRUE, ngay_doc = CURRENT_TIMESTAMP
      WHERE id = $1 AND ma_tai_khoan = $2
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
    const userId = req.user?.ma_tai_khoan || req.user?.id;
    
    if (!userId) {
      return res.json({
        success: true,
        count: 0
      });
    }

    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM thong_bao_ca_nhan 
      WHERE ma_tai_khoan = $1 AND da_doc = FALSE
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
    const userId = req.user?.ma_tai_khoan || req.user?.id;
    
    const result = await pool.query(`
      INSERT INTO thong_bao (tieu_de, noi_dung, loai_thong_bao, doi_tuong, ghim_top, ngay_het_han, nguoi_tao)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ma_thong_bao as id, tieu_de as title, noi_dung as content
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
    
    await pool.query('DELETE FROM thong_bao WHERE ma_thong_bao = $1', [id]);
    
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
