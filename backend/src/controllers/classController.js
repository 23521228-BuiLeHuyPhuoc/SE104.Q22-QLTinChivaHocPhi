const pool = require('../config/database');

// Lấy danh sách lớp học
const getClasses = async (req, res) => {
  try {
    const { ma_mon_hoc, trang_thai, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT l.*, 
             m.ten_mon_hoc, m.so_tiet, m.loai_mon,
             k.ten_khoa
      FROM lop l
      JOIN mon_hoc m ON l.ma_mon_hoc = m.ma_mon_hoc
      LEFT JOIN khoa k ON m.ma_khoa = k.ma_khoa
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (ma_mon_hoc) {
      query += ` AND l.ma_mon_hoc = $${paramIndex++}`;
      params.push(ma_mon_hoc);
    }
    
    if (trang_thai !== undefined) {
      query += ` AND l.trang_thai = $${paramIndex++}`;
      params.push(trang_thai === 'true');
    }
    
    if (search) {
      query += ` AND (l.ma_lop ILIKE $${paramIndex} OR l.ten_lop ILIKE $${paramIndex} OR l.giang_vien ILIKE $${paramIndex} OR m.ten_mon_hoc ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Count total
    let countQuery = `
      SELECT COUNT(*) 
      FROM lop l
      JOIN mon_hoc m ON l.ma_mon_hoc = m.ma_mon_hoc
      LEFT JOIN khoa k ON m.ma_khoa = k.ma_khoa
      WHERE 1=1
    `;
    if (ma_mon_hoc) {
      countQuery += ` AND l.ma_mon_hoc = $1`;
    }
    if (trang_thai !== undefined) {
      const trangThaiIndex = ma_mon_hoc ? 2 : 1;
      countQuery += ` AND l.trang_thai = $${trangThaiIndex}`;
    }
    if (search) {
      const searchIndex = (ma_mon_hoc ? 1 : 0) + (trang_thai !== undefined ? 1 : 0) + 1;
      countQuery += ` AND (l.ma_lop ILIKE $${searchIndex} OR l.ten_lop ILIKE $${searchIndex} OR l.giang_vien ILIKE $${searchIndex} OR m.ten_mon_hoc ILIKE $${searchIndex})`;
    }
    const countParams = params.slice(0, paramIndex - 1);
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Get data with pagination
    query += ` ORDER BY l.ngay_tao DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting classes:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Lấy chi tiết lớp học
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT l.*, 
             m.ten_mon_hoc, m.so_tiet, m.loai_mon, m.so_tin_chi,
             k.ten_khoa
      FROM lop l
      JOIN mon_hoc m ON l.ma_mon_hoc = m.ma_mon_hoc
      LEFT JOIN khoa k ON m.ma_khoa = k.ma_khoa
      WHERE l.ma_lop = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error getting class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Tạo lớp học mới
const createClass = async (req, res) => {
  try {
    const { ma_lop, ten_lop, ma_mon_hoc, giang_vien, lich_hoc, phong_hoc, so_luong_toi_da, mo_ta } = req.body;
    
    // Check if class code exists
    const existing = await pool.query('SELECT ma_lop FROM lop WHERE ma_lop = $1', [ma_lop]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Mã lớp đã tồn tại' });
    }
    
    // Check if course exists
    const course = await pool.query('SELECT ma_mon_hoc FROM mon_hoc WHERE ma_mon_hoc = $1', [ma_mon_hoc]);
    if (course.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Môn học không tồn tại' });
    }
    
    const result = await pool.query(`
      INSERT INTO lop (ma_lop, ten_lop, ma_mon_hoc, giang_vien, lich_hoc, phong_hoc, so_luong_toi_da, mo_ta)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [ma_lop, ten_lop, ma_mon_hoc, giang_vien, lich_hoc, phong_hoc, so_luong_toi_da || 50, mo_ta]);
    
    res.status(201).json({ success: true, message: 'Tạo lớp học thành công', data: result.rows[0] });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Cập nhật lớp học
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { ten_lop, ma_mon_hoc, giang_vien, lich_hoc, phong_hoc, so_luong_toi_da, mo_ta, trang_thai } = req.body;
    
    // Check if class exists
    const existing = await pool.query('SELECT ma_lop FROM lop WHERE ma_lop = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }
    
    const result = await pool.query(`
      UPDATE lop SET
        ten_lop = COALESCE($1, ten_lop),
        ma_mon_hoc = COALESCE($2, ma_mon_hoc),
        giang_vien = COALESCE($3, giang_vien),
        lich_hoc = COALESCE($4, lich_hoc),
        phong_hoc = COALESCE($5, phong_hoc),
        so_luong_toi_da = COALESCE($6, so_luong_toi_da),
        mo_ta = COALESCE($7, mo_ta),
        trang_thai = COALESCE($8, trang_thai)
      WHERE ma_lop = $9
      RETURNING *
    `, [ten_lop, ma_mon_hoc, giang_vien, lich_hoc, phong_hoc, so_luong_toi_da, mo_ta, trang_thai, id]);
    
    res.json({ success: true, message: 'Cập nhật lớp học thành công', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Xóa lớp học
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if class is being used in registrations
    const inUse = await pool.query(`
      SELECT COUNT(*) FROM chi_tiet_dang_ky WHERE ma_lop = $1
    `, [id]);
    
    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa lớp học đã có sinh viên đăng ký' 
      });
    }
    
    await pool.query('DELETE FROM lop WHERE ma_lop = $1', [id]);
    
    res.json({ success: true, message: 'Xóa lớp học thành công' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Lấy danh sách lớp mở theo học kỳ
const getOpenedClasses = async (req, res) => {
  try {
    const { ma_hoc_ky } = req.query;
    
    let query = `
      SELECT lm.*, l.ten_lop, l.giang_vien, l.lich_hoc, l.phong_hoc, l.so_luong_toi_da,
             m.ten_mon_hoc, m.so_tin_chi, m.loai_mon,
             hk.ten_hoc_ky
      FROM lop_mo lm
      JOIN lop l ON lm.ma_lop = l.ma_lop
      JOIN mon_hoc m ON l.ma_mon_hoc = m.ma_mon_hoc
      JOIN hoc_ky hk ON lm.ma_hoc_ky = hk.ma_hoc_ky
      WHERE 1=1
    `;
    const params = [];
    
    if (ma_hoc_ky) {
      query += ` AND lm.ma_hoc_ky = $1`;
      params.push(ma_hoc_ky);
    }
    
    query += ` ORDER BY hk.ngay_bat_dau DESC, m.ten_mon_hoc`;
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting opened classes:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Mở lớp trong học kỳ
const openClass = async (req, res) => {
  try {
    const { ma_hoc_ky, ma_lop, ghi_chu } = req.body;
    
    // Check if already opened
    const existing = await pool.query(
      'SELECT id FROM lop_mo WHERE ma_hoc_ky = $1 AND ma_lop = $2',
      [ma_hoc_ky, ma_lop]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Lớp đã được mở trong học kỳ này' });
    }
    
    const result = await pool.query(`
      INSERT INTO lop_mo (ma_hoc_ky, ma_lop, ghi_chu)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [ma_hoc_ky, ma_lop, ghi_chu]);
    
    res.status(201).json({ success: true, message: 'Mở lớp thành công', data: result.rows[0] });
  } catch (error) {
    console.error('Error opening class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Đóng lớp trong học kỳ
const closeClass = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM lop_mo WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Đóng lớp thành công' });
  } catch (error) {
    console.error('Error closing class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Thống kê lớp học
const getClassStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_classes,
        COUNT(*) FILTER (WHERE trang_thai = TRUE) as active_classes,
        COUNT(DISTINCT ma_mon_hoc) as total_courses_with_classes
      FROM lop
    `);
    
    const openedStats = await pool.query(`
      SELECT COUNT(*) as total_opened_classes
      FROM lop_mo lm
      JOIN hoc_ky hk ON lm.ma_hoc_ky = hk.ma_hoc_ky
      WHERE hk.trang_thai = 'Đang diễn ra'
    `);
    
    res.json({
      success: true,
      data: {
        ...stats.rows[0],
        ...openedStats.rows[0]
      }
    });
  } catch (error) {
    console.error('Error getting class stats:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

module.exports = {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getOpenedClasses,
  openClass,
  closeClass,
  getClassStats
};
