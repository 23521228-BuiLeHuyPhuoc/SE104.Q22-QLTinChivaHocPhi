const pool = require('../config/database');

// Lấy danh sách lớp học
const getClasses = async (req, res) => {
  try {
    const { MaMonHoc, TrangThai, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT l.*, 
             m."TenMonHoc", m."SoTiet", m."LoaiMon",
             k."TenKhoa"
      FROM "LOP" l
      JOIN "MONHOC" m ON l."MaMonHoc" = m."MaMonHoc"
      LEFT JOIN "KHOA" k ON m."MaKhoa" = k."MaKhoa"
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (MaMonHoc) {
      query += ` AND l."MaMonHoc" = ${paramIndex++}`;
      params.push(MaMonHoc);
    }
    
    if (TrangThai !== undefined) {
      query += ` AND l."TrangThai" = ${paramIndex++}`;
      params.push(TrangThai === 'true');
    }
    
    if (search) {
      query += ` AND (l."MaLop" ILIKE ${paramIndex} OR l."TenLop" ILIKE ${paramIndex} OR l."GiangVien" ILIKE ${paramIndex} OR m."TenMonHoc" ILIKE ${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Count total
    let countQuery = `
      SELECT COUNT(*) 
      FROM "LOP" l
      JOIN "MONHOC" m ON l."MaMonHoc" = m."MaMonHoc"
      LEFT JOIN "KHOA" k ON m."MaKhoa" = k."MaKhoa"
      WHERE 1=1
    `;
    if (MaMonHoc) {
      countQuery += ` AND l."MaMonHoc" = $1`;
    }
    if (TrangThai !== undefined) {
      const trangThaiIndex = MaMonHoc ? 2 : 1;
      countQuery += ` AND l."TrangThai" = ${trangThaiIndex}`;
    }
    if (search) {
      const searchIndex = (MaMonHoc ? 1 : 0) + (TrangThai !== undefined ? 1 : 0) + 1;
      countQuery += ` AND (l."MaLop" ILIKE ${searchIndex} OR l."TenLop" ILIKE ${searchIndex} OR l."GiangVien" ILIKE ${searchIndex} OR m."TenMonHoc" ILIKE ${searchIndex})`;
    }
    const countParams = params.slice(0, paramIndex - 1);
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Get data with pagination
    query += ` ORDER BY l."NgayTao" DESC LIMIT ${paramIndex++} OFFSET ${paramIndex}`;
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
             m."TenMonHoc", m."SoTiet", m."LoaiMon", m."SoTinChi",
             k."TenKhoa"
      FROM "LOP" l
      JOIN "MONHOC" m ON l."MaMonHoc" = m."MaMonHoc"
      LEFT JOIN "KHOA" k ON m."MaKhoa" = k."MaKhoa"
      WHERE l."MaLop" = $1
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
    const { MaLop, TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa, MoTa } = req.body;
    
    // Check if class code exists
    const existing = await pool.query('SELECT "MaLop" FROM "LOP" WHERE "MaLop" = $1', [MaLop]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Mã lớp đã tồn tại' });
    }
    
    // Check if course exists
    const course = await pool.query('SELECT "MaMonHoc" FROM "MONHOC" WHERE "MaMonHoc" = $1', [MaMonHoc]);
    if (course.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Môn học không tồn tại' });
    }
    
    const result = await pool.query(`
      INSERT INTO "LOP" ("MaLop", "TenLop", "MaMonHoc", "GiangVien", "LichHoc", "PhongHoc", "SoLuongToiDa", "MoTa")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [MaLop, TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa || 50, MoTa]);
    
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
    const { TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa, MoTa, TrangThai } = req.body;
    
    // Check if class exists
    const existing = await pool.query('SELECT "MaLop" FROM "LOP" WHERE "MaLop" = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }
    
    const result = await pool.query(`
      UPDATE "LOP" SET
        "TenLop" = COALESCE($1, "TenLop"),
        "MaMonHoc" = COALESCE($2, "MaMonHoc"),
        "GiangVien" = COALESCE($3, "GiangVien"),
        "LichHoc" = COALESCE($4, "LichHoc"),
        "PhongHoc" = COALESCE($5, "PhongHoc"),
        "SoLuongToiDa" = COALESCE($6, "SoLuongToiDa"),
        "MoTa" = COALESCE($7, "MoTa"),
        "TrangThai" = COALESCE($8, "TrangThai")
      WHERE "MaLop" = $9
      RETURNING *
    `, [TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa, MoTa, TrangThai, id]);
    
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
      SELECT COUNT(*) FROM "CHITIETDANGKY" WHERE "MaLop" = $1
    `, [id]);
    
    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa lớp học đã có sinh viên đăng ký' 
      });
    }
    
    await pool.query('DELETE FROM "LOP" WHERE "MaLop" = $1', [id]);
    
    res.json({ success: true, message: 'Xóa lớp học thành công' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Lấy danh sách lớp mở theo học kỳ
const getOpenedClasses = async (req, res) => {
  try {
    const { MaHocKy } = req.query;
    
    let query = `
      SELECT lm.*, l."TenLop", l."GiangVien", l."LichHoc", l."PhongHoc", l."SoLuongToiDa",
             m."TenMonHoc", m."SoTinChi", m."LoaiMon",
             hk."TenHocKy"
      FROM "LOPMO" lm
      JOIN "LOP" l ON lm."MaLop" = l."MaLop"
      JOIN "MONHOC" m ON l."MaMonHoc" = m."MaMonHoc"
      JOIN "HOCKY" hk ON lm."MaHocKy" = hk."MaHocKy"
      WHERE 1=1
    `;
    const params = [];
    
    if (MaHocKy) {
      query += ` AND lm."MaHocKy" = $1`;
      params.push(MaHocKy);
    }
    
    query += ` ORDER BY hk."NgayBatDau" DESC, m."TenMonHoc"`;
    
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
    const { MaHocKy, MaLop, GhiChu } = req.body;
    
    // Check if already opened
    const existing = await pool.query(
      'SELECT id FROM "LOPMO" WHERE "MaHocKy" = $1 AND "MaLop" = $2',
      [MaHocKy, MaLop]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Lớp đã được mở trong học kỳ này' });
    }
    
    const result = await pool.query(`
      INSERT INTO "LOPMO" ("MaHocKy", "MaLop", "GhiChu")
      VALUES ($1, $2, $3)
      RETURNING *
    `, [MaHocKy, MaLop, GhiChu]);
    
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
    
    await pool.query('DELETE FROM "LOPMO" WHERE id = $1', [id]);
    
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
        COUNT(*) FILTER (WHERE "TrangThai" = TRUE) as active_classes,
        COUNT(DISTINCT "MaMonHoc") as total_courses_with_classes
      FROM "LOP"
    `);
    
    const openedStats = await pool.query(`
      SELECT COUNT(*) as total_opened_classes
      FROM "LOPMO" lm
      JOIN "HOCKY" hk ON lm."MaHocKy" = hk."MaHocKy"
      WHERE hk."TrangThai" = 'Đang diễn ra'
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
