const pool = require('../config/database');

// Lấy danh sách môn học với phân trang và filter
const getAllCourses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      loai_mon,
      ma_khoa,
      sortBy = 'ma_mon_hoc', 
      sortOrder = 'ASC' 
    } = req.query;
    const offset = (page - 1) * limit;

    const validSortFields = ['ma_mon_hoc', 'ten_mon_hoc', 'so_tin_chi', 'loai_mon'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'ma_mon_hoc';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let whereClause = `WHERE (mh.ma_mon_hoc ILIKE $1 OR mh.ten_mon_hoc ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (loai_mon) {
      whereClause += ` AND mh.loai_mon = $${paramIndex}`;
      params.push(loai_mon);
      paramIndex++;
    }

    if (ma_khoa) {
      whereClause += ` AND mh.ma_khoa = $${paramIndex}`;
      params.push(ma_khoa);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM mon_hoc mh ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách môn học
    const result = await pool.query(
      `SELECT mh.*, kh.ten_khoa
       FROM mon_hoc mh
       LEFT JOIN khoa kh ON mh.ma_khoa = kh.ma_khoa
       ${whereClause}
       ORDER BY mh.${sortField} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Map dữ liệu để tương thích với frontend
    const courses = result.rows.map(mh => ({
      id: mh.ma_mon_hoc,
      ma_mon_hoc: mh.ma_mon_hoc,
      course_code: mh.ma_mon_hoc,
      ten_mon_hoc: mh.ten_mon_hoc,
      course_name: mh.ten_mon_hoc,
      so_tin_chi: mh.so_tin_chi,
      credits: mh.so_tin_chi,
      loai_mon: mh.loai_mon,
      type: mh.loai_mon,
      ma_khoa: mh.ma_khoa,
      ten_khoa: mh.ten_khoa,
      mo_ta: mh.mo_ta,
      description: mh.mo_ta
    }));

    res.json({
      success: true,
      data: courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy thông tin môn học theo ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT mh.*, kh.ten_khoa
       FROM mon_hoc mh
       LEFT JOIN khoa kh ON mh.ma_khoa = kh.ma_khoa
       WHERE mh.ma_mon_hoc = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    }

    const mh = result.rows[0];
    
    // Lấy điều kiện tiên quyết
    const prerequisitesResult = await pool.query(
      `SELECT dk.*, mh_tq.ten_mon_hoc as ten_mon_tien_quyet
       FROM dieu_kien_mon_hoc dk
       JOIN mon_hoc mh_tq ON dk.ma_mon_hoc_truoc = mh_tq.ma_mon_hoc
       WHERE dk.ma_mon_hoc = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: mh.ma_mon_hoc,
        ma_mon_hoc: mh.ma_mon_hoc,
        course_code: mh.ma_mon_hoc,
        ten_mon_hoc: mh.ten_mon_hoc,
        course_name: mh.ten_mon_hoc,
        so_tin_chi: mh.so_tin_chi,
        credits: mh.so_tin_chi,
        loai_mon: mh.loai_mon,
        type: mh.loai_mon,
        ma_khoa: mh.ma_khoa,
        ten_khoa: mh.ten_khoa,
        mo_ta: mh.mo_ta,
        description: mh.mo_ta,
        prerequisites: prerequisitesResult.rows
      }
    });
  } catch (error) {
    console.error('Get course by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy danh sách lớp mở trong học kỳ
const getOpenedClasses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      ma_hoc_ky,
      ma_khoa
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE (mh.ma_mon_hoc ILIKE $1 OR mh.ten_mon_hoc ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (ma_hoc_ky) {
      whereClause += ` AND lm.ma_hoc_ky = $${paramIndex}`;
      params.push(ma_hoc_ky);
      paramIndex++;
    }

    if (ma_khoa) {
      whereClause += ` AND mh.ma_khoa = $${paramIndex}`;
      params.push(ma_khoa);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(*) 
       FROM lop_mo lm
       JOIN lop l ON lm.ma_lop = l.ma_lop
       JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách lớp mở
    const result = await pool.query(
      `SELECT lm.*, l.*, mh.ten_mon_hoc, mh.so_tin_chi, mh.loai_mon, kh.ten_khoa,
       hk.ten_hoc_ky, nh.ten_nam_hoc,
       (SELECT COUNT(*) FROM chi_tiet_dang_ky ctdk 
        JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
        WHERE ctdk.ma_lop = l.ma_lop AND pdk.ma_hoc_ky = lm.ma_hoc_ky
        AND ctdk.trang_thai = 'Đã đăng ký') as so_luong_da_dang_ky
       FROM lop_mo lm
       JOIN lop l ON lm.ma_lop = l.ma_lop
       JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
       LEFT JOIN khoa kh ON mh.ma_khoa = kh.ma_khoa
       JOIN hoc_ky hk ON lm.ma_hoc_ky = hk.ma_hoc_ky
       JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
       ${whereClause}
       ORDER BY mh.ten_mon_hoc, l.ma_lop
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Map dữ liệu
    const classes = result.rows.map(row => ({
      id: `${row.ma_lop}-${row.ma_hoc_ky}`,
      ma_lop: row.ma_lop,
      ma_hoc_ky: row.ma_hoc_ky,
      ma_mon_hoc: row.ma_mon_hoc,
      ten_mon_hoc: row.ten_mon_hoc,
      course_name: row.ten_mon_hoc,
      so_tin_chi: row.so_tin_chi,
      credits: row.so_tin_chi,
      loai_mon: row.loai_mon,
      ten_khoa: row.ten_khoa,
      ten_hoc_ky: row.ten_hoc_ky,
      ten_nam_hoc: row.ten_nam_hoc,
      so_luong_toi_da: row.so_luong_toi_da,
      max_students: row.so_luong_toi_da,
      so_luong_da_dang_ky: parseInt(row.so_luong_da_dang_ky) || 0,
      registered_count: parseInt(row.so_luong_da_dang_ky) || 0,
      ngay_bat_dau: row.ngay_bat_dau,
      ngay_ket_thuc: row.ngay_ket_thuc,
      giang_vien: row.giang_vien,
      instructor: row.giang_vien,
      phong_hoc: row.phong_hoc,
      room: row.phong_hoc,
      lich_hoc: row.lich_hoc,
      schedule: row.lich_hoc,
      trang_thai: row.trang_thai
    }));

    res.json({
      success: true,
      data: classes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get opened classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Tạo môn học mới
const createCourse = async (req, res) => {
  try {
    const { ma_mon_hoc, ten_mon_hoc, so_tin_chi, loai_mon, ma_khoa, mo_ta } = req.body;

    if (!ma_mon_hoc || !ten_mon_hoc || !so_tin_chi || !loai_mon) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
      });
    }

    // Kiểm tra mã môn học đã tồn tại
    const existing = await pool.query(
      'SELECT ma_mon_hoc FROM mon_hoc WHERE ma_mon_hoc = $1',
      [ma_mon_hoc]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã môn học đã tồn tại'
      });
    }

    const result = await pool.query(
      `INSERT INTO mon_hoc (ma_mon_hoc, ten_mon_hoc, so_tin_chi, loai_mon, ma_khoa, mo_ta)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ma_mon_hoc, ten_mon_hoc, so_tin_chi, loai_mon, ma_khoa, mo_ta]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo môn học thành công',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Cập nhật môn học
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { ten_mon_hoc, so_tin_chi, loai_mon, ma_khoa, mo_ta } = req.body;

    const existing = await pool.query(
      'SELECT ma_mon_hoc FROM mon_hoc WHERE ma_mon_hoc = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    }

    const result = await pool.query(
      `UPDATE mon_hoc SET 
        ten_mon_hoc = COALESCE($1, ten_mon_hoc),
        so_tin_chi = COALESCE($2, so_tin_chi),
        loai_mon = COALESCE($3, loai_mon),
        ma_khoa = COALESCE($4, ma_khoa),
        mo_ta = COALESCE($5, mo_ta)
       WHERE ma_mon_hoc = $6
       RETURNING *`,
      [ten_mon_hoc, so_tin_chi, loai_mon, ma_khoa, mo_ta, id]
    );

    res.json({
      success: true,
      message: 'Cập nhật môn học thành công',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Xóa môn học
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT ma_mon_hoc FROM mon_hoc WHERE ma_mon_hoc = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    }

    await pool.query('DELETE FROM mon_hoc WHERE ma_mon_hoc = $1', [id]);

    res.json({
      success: true,
      message: 'Xóa môn học thành công'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Thống kê môn học
const getCourseStats = async (req, res) => {
  try {
    // Tổng số môn học
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM mon_hoc');
    
    // Số môn theo loại
    const typeResult = await pool.query(`
      SELECT loai_mon, COUNT(*) as count 
      FROM mon_hoc 
      GROUP BY loai_mon
    `);

    // Số môn theo khoa
    const facultyResult = await pool.query(`
      SELECT kh.ten_khoa, COUNT(mh.ma_mon_hoc) as count 
      FROM mon_hoc mh
      JOIN khoa kh ON mh.ma_khoa = kh.ma_khoa
      GROUP BY kh.ten_khoa
      ORDER BY count DESC
    `);

    // Tổng số tín chỉ
    const creditsResult = await pool.query('SELECT SUM(so_tin_chi) as total_credits FROM mon_hoc');

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        totalCredits: parseInt(creditsResult.rows[0].total_credits) || 0,
        byType: typeResult.rows,
        byFaculty: facultyResult.rows
      }
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  getOpenedClasses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStats
};
