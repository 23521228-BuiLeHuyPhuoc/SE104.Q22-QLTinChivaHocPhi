const pool = require('../config/database');

// Lấy danh sách môn học với phân trang và filter
const getAllCourses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      LoaiMon,
      MaKhoa,
      sortBy = 'MaMonHoc', 
      sortOrder = 'ASC' 
    } = req.query;
    const offset = (page - 1) * limit;

    const validSortFields = ['MaMonHoc', 'TenMonHoc', 'SoTinChi', 'LoaiMon'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'MaMonHoc';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let whereClause = `WHERE (mh."MaMonHoc" ILIKE $1 OR mh."TenMonHoc" ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (LoaiMon) {
      whereClause += ` AND mh."LoaiMon" = ${paramIndex}`;
      params.push(LoaiMon);
      paramIndex++;
    }

    if (MaKhoa) {
      whereClause += ` AND mh."MaKhoa" = ${paramIndex}`;
      params.push(MaKhoa);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM "MONHOC" mh ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách môn học
    const result = await pool.query(
      `SELECT mh.*, kh."TenKhoa"
       FROM "MONHOC" mh
       LEFT JOIN "KHOA" kh ON mh."MaKhoa" = kh."MaKhoa"
       ${whereClause}
       ORDER BY mh.${sortField} ${order}
       LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Map dữ liệu để tương thích với frontend
    const courses = result.rows.map(mh => ({
      id: mh.MaMonHoc,
      MaMonHoc: mh.MaMonHoc,
      course_code: mh.MaMonHoc,
      TenMonHoc: mh.TenMonHoc,
      course_name: mh.TenMonHoc,
      SoTinChi: mh.SoTinChi,
      credits: mh.SoTinChi,
      LoaiMon: mh.LoaiMon,
      type: mh.LoaiMon,
      MaKhoa: mh.MaKhoa,
      TenKhoa: mh.TenKhoa,
      MoTa: mh.MoTa,
      description: mh.MoTa
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
      `SELECT mh.*, kh."TenKhoa"
       FROM "MONHOC" mh
       LEFT JOIN "KHOA" kh ON mh."MaKhoa" = kh."MaKhoa"
       WHERE mh."MaMonHoc" = $1`,
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
      `SELECT dk.*, mh_tq."TenMonHoc" as ten_mon_tien_quyet
       FROM "DIEUKIENMONHOC" dk
       JOIN "MONHOC" mh_tq ON dk.ma_mon_hoc_truoc = mh_tq."MaMonHoc"
       WHERE dk."MaMonHoc" = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: mh.MaMonHoc,
        MaMonHoc: mh.MaMonHoc,
        course_code: mh.MaMonHoc,
        TenMonHoc: mh.TenMonHoc,
        course_name: mh.TenMonHoc,
        SoTinChi: mh.SoTinChi,
        credits: mh.SoTinChi,
        LoaiMon: mh.LoaiMon,
        type: mh.LoaiMon,
        MaKhoa: mh.MaKhoa,
        TenKhoa: mh.TenKhoa,
        MoTa: mh.MoTa,
        description: mh.MoTa,
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
      MaHocKy,
      MaKhoa
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE (mh."MaMonHoc" ILIKE $1 OR mh."TenMonHoc" ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (MaHocKy) {
      whereClause += ` AND lm."MaHocKy" = ${paramIndex}`;
      params.push(MaHocKy);
      paramIndex++;
    }

    if (MaKhoa) {
      whereClause += ` AND mh."MaKhoa" = ${paramIndex}`;
      params.push(MaKhoa);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(*) 
       FROM "LOPMO" lm
       JOIN "LOP" l ON lm."MaLop" = l."MaLop"
       JOIN "MONHOC" mh ON l."MaMonHoc" = mh."MaMonHoc"
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách lớp mở
    const result = await pool.query(
      `SELECT lm.*, l.*, mh."TenMonHoc", mh."SoTinChi", mh."LoaiMon", kh."TenKhoa",
       hk."TenHocKy", nh."TenNamHoc",
       (SELECT COUNT(*) FROM "CHITIETDANGKY" ctdk 
        JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
        WHERE ctdk."MaLop" = l."MaLop" AND pdk."MaHocKy" = lm."MaHocKy"
        AND ctdk."TrangThai" = 'Đã đăng ký') as "SoLuongDaDangKy"
       FROM "LOPMO" lm
       JOIN "LOP" l ON lm."MaLop" = l."MaLop"
       JOIN "MONHOC" mh ON l."MaMonHoc" = mh."MaMonHoc"
       LEFT JOIN "KHOA" kh ON mh."MaKhoa" = kh."MaKhoa"
       JOIN "HOCKY" hk ON lm."MaHocKy" = hk."MaHocKy"
       JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
       ${whereClause}
       ORDER BY mh."TenMonHoc", l."MaLop"
       LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Map dữ liệu
    const classes = result.rows.map(row => ({
      id: `${row.MaLop}-${row.MaHocKy}`,
      MaLop: row.MaLop,
      MaHocKy: row.MaHocKy,
      MaMonHoc: row.MaMonHoc,
      TenMonHoc: row.TenMonHoc,
      course_name: row.TenMonHoc,
      SoTinChi: row.SoTinChi,
      credits: row.SoTinChi,
      LoaiMon: row.LoaiMon,
      TenKhoa: row.TenKhoa,
      TenHocKy: row.TenHocKy,
      TenNamHoc: row.TenNamHoc,
      SoLuongToiDa: row.SoLuongToiDa,
      max_students: row.SoLuongToiDa,
      SoLuongDaDangKy: parseInt(row.SoLuongDaDangKy) || 0,
      registered_count: parseInt(row.SoLuongDaDangKy) || 0,
      NgayBatDau: row.NgayBatDau,
      NgayKetThuc: row.NgayKetThuc,
      GiangVien: row.GiangVien,
      instructor: row.GiangVien,
      PhongHoc: row.PhongHoc,
      room: row.PhongHoc,
      LichHoc: row.LichHoc,
      schedule: row.LichHoc,
      TrangThai: row.TrangThai
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
    const { MaMonHoc, TenMonHoc, SoTinChi, LoaiMon, MaKhoa, MoTa } = req.body;

    if (!MaMonHoc || !TenMonHoc || !SoTinChi || !LoaiMon) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
      });
    }

    // Kiểm tra mã môn học đã tồn tại
    const existing = await pool.query(
      'SELECT "MaMonHoc" FROM "MONHOC" WHERE "MaMonHoc" = $1',
      [MaMonHoc]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã môn học đã tồn tại'
      });
    }

    const result = await pool.query(
      `INSERT INTO "MONHOC" ("MaMonHoc", "TenMonHoc", "SoTinChi", "LoaiMon", "MaKhoa", "MoTa")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [MaMonHoc, TenMonHoc, SoTinChi, LoaiMon, MaKhoa, MoTa]
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
    const { TenMonHoc, SoTinChi, LoaiMon, MaKhoa, MoTa } = req.body;

    const existing = await pool.query(
      'SELECT "MaMonHoc" FROM "MONHOC" WHERE "MaMonHoc" = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    }

    const result = await pool.query(
      `UPDATE "MONHOC" SET 
        "TenMonHoc" = COALESCE($1, "TenMonHoc"),
        "SoTinChi" = COALESCE($2, "SoTinChi"),
        "LoaiMon" = COALESCE($3, "LoaiMon"),
        "MaKhoa" = COALESCE($4, "MaKhoa"),
        "MoTa" = COALESCE($5, "MoTa")
       WHERE "MaMonHoc" = $6
       RETURNING *`,
      [TenMonHoc, SoTinChi, LoaiMon, MaKhoa, MoTa, id]
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
      'SELECT "MaMonHoc" FROM "MONHOC" WHERE "MaMonHoc" = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy môn học'
      });
    }

    await pool.query('DELETE FROM "MONHOC" WHERE "MaMonHoc" = $1', [id]);

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
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM "MONHOC"');
    
    // Số môn theo loại
    const typeResult = await pool.query(`
      SELECT "LoaiMon", COUNT(*) as count 
      FROM "MONHOC" 
      GROUP BY "LoaiMon"
    `);

    // Số môn theo khoa
    const facultyResult = await pool.query(`
      SELECT kh."TenKhoa", COUNT(mh."MaMonHoc") as count 
      FROM "MONHOC" mh
      JOIN "KHOA" kh ON mh."MaKhoa" = kh."MaKhoa"
      GROUP BY kh."TenKhoa"
      ORDER BY count DESC
    `);

    // Tổng số tín chỉ
    const creditsResult = await pool.query('SELECT SUM("SoTinChi") as total_credits FROM "MONHOC"');

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
