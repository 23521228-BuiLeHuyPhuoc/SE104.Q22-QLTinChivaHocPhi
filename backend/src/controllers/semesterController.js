const pool = require('../config/database');

// Lấy tất cả học kỳ
const getAllSemesters = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hk.*, nh."TenNamHoc"
      FROM "HOCKY" hk
      JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
      ORDER BY nh."TenNamHoc" DESC, hk."ThuTu" ASC
    `);

    // Map dữ liệu để tương thích với frontend
    const semesters = result.rows.map(hk => ({
      id: hk.MaHocKy,
      MaHocKy: hk.MaHocKy,
      TenHocKy: hk.TenHocKy,
      name: hk.TenHocKy,
      MaNamHoc: hk.MaNamHoc,
      TenNamHoc: hk.TenNamHoc,
      year: hk.TenNamHoc,
      LoaiHocKy: hk.LoaiHocKy,
      type: hk.LoaiHocKy,
      ThuTu: hk.ThuTu,
      NgayBatDau: hk.NgayBatDau,
      start_date: hk.NgayBatDau,
      NgayKetThuc: hk.NgayKetThuc,
      end_date: hk.NgayKetThuc,
      HanDongHocPhi: hk.HanDongHocPhi,
      tuition_deadline: hk.HanDongHocPhi,
      TrangThai: hk.TrangThai,
      status: hk.TrangThai,
      is_active: hk.TrangThai === 'Đang diễn ra'
    }));

    res.json({
      success: true,
      data: semesters
    });
  } catch (error) {
    console.error('Get all semesters error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy học kỳ đang hoạt động
const getActiveSemester = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hk.*, nh."TenNamHoc"
      FROM "HOCKY" hk
      JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
      WHERE hk."TrangThai" = 'Đang diễn ra'
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Nếu không có học kỳ đang diễn ra, lấy học kỳ sắp diễn ra
      const upcomingResult = await pool.query(`
        SELECT hk.*, nh."TenNamHoc"
        FROM "HOCKY" hk
        JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
        WHERE hk."TrangThai" = 'Sắp diễn ra'
        ORDER BY hk."NgayBatDau" ASC
        LIMIT 1
      `);
      
      if (upcomingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không có học kỳ nào đang hoạt động'
        });
      }
      
      const hk = upcomingResult.rows[0];
      return res.json({
        success: true,
        data: {
          id: hk.MaHocKy,
          MaHocKy: hk.MaHocKy,
          TenHocKy: hk.TenHocKy,
          name: hk.TenHocKy,
          MaNamHoc: hk.MaNamHoc,
          TenNamHoc: hk.TenNamHoc,
          year: hk.TenNamHoc,
          LoaiHocKy: hk.LoaiHocKy,
          NgayBatDau: hk.NgayBatDau,
          NgayKetThuc: hk.NgayKetThuc,
          HanDongHocPhi: hk.HanDongHocPhi,
          TrangThai: hk.TrangThai,
          is_active: false
        }
      });
    }

    const hk = result.rows[0];
    res.json({
      success: true,
      data: {
        id: hk.MaHocKy,
        MaHocKy: hk.MaHocKy,
        TenHocKy: hk.TenHocKy,
        name: hk.TenHocKy,
        MaNamHoc: hk.MaNamHoc,
        TenNamHoc: hk.TenNamHoc,
        year: hk.TenNamHoc,
        LoaiHocKy: hk.LoaiHocKy,
        NgayBatDau: hk.NgayBatDau,
        NgayKetThuc: hk.NgayKetThuc,
        HanDongHocPhi: hk.HanDongHocPhi,
        TrangThai: hk.TrangThai,
        is_active: true
      }
    });
  } catch (error) {
    console.error('Get active semester error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy học kỳ theo ID
const getSemesterById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT hk.*, nh."TenNamHoc"
      FROM "HOCKY" hk
      JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
      WHERE hk."MaHocKy" = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học kỳ'
      });
    }

    const hk = result.rows[0];
    
    // Lấy số lớp mở trong học kỳ
    const classCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM "LOPMO" WHERE "MaHocKy" = $1',
      [id]
    );

    // Lấy số phiếu đăng ký trong học kỳ
    const regCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM "PHIEUDANGKY" WHERE "MaHocKy" = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        id: hk.MaHocKy,
        MaHocKy: hk.MaHocKy,
        TenHocKy: hk.TenHocKy,
        name: hk.TenHocKy,
        MaNamHoc: hk.MaNamHoc,
        TenNamHoc: hk.TenNamHoc,
        year: hk.TenNamHoc,
        LoaiHocKy: hk.LoaiHocKy,
        ThuTu: hk.ThuTu,
        NgayBatDau: hk.NgayBatDau,
        NgayKetThuc: hk.NgayKetThuc,
        HanDongHocPhi: hk.HanDongHocPhi,
        TrangThai: hk.TrangThai,
        is_active: hk.TrangThai === 'Đang diễn ra',
        stats: {
          openedClasses: parseInt(classCountResult.rows[0].count),
          registrations: parseInt(regCountResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Get semester by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Tạo học kỳ mới
const createSemester = async (req, res) => {
  try {
    const { 
      MaHocKy, 
      TenHocKy, 
      MaNamHoc, 
      LoaiHocKy, 
      ThuTu,
      NgayBatDau, 
      NgayKetThuc, 
      HanDongHocPhi,
      TrangThai = 'Sắp diễn ra'
    } = req.body;

    if (!MaHocKy || !TenHocKy || !MaNamHoc) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
      });
    }

    // Kiểm tra mã học kỳ đã tồn tại
    const existing = await pool.query(
      'SELECT "MaHocKy" FROM "HOCKY" WHERE "MaHocKy" = $1',
      [MaHocKy]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã học kỳ đã tồn tại'
      });
    }

    const result = await pool.query(
      `INSERT INTO "HOCKY" ("MaHocKy", "TenHocKy", "MaNamHoc", "LoaiHocKy", "ThuTu", "NgayBatDau", "NgayKetThuc", "HanDongHocPhi", "TrangThai")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [MaHocKy, TenHocKy, MaNamHoc, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, HanDongHocPhi, TrangThai]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo học kỳ thành công',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create semester error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Cập nhật học kỳ
const updateSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      TenHocKy, 
      LoaiHocKy, 
      ThuTu,
      NgayBatDau, 
      NgayKetThuc, 
      HanDongHocPhi,
      TrangThai
    } = req.body;

    const existing = await pool.query(
      'SELECT "MaHocKy" FROM "HOCKY" WHERE "MaHocKy" = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học kỳ'
      });
    }

    const result = await pool.query(
      `UPDATE "HOCKY" SET 
        "TenHocKy" = COALESCE($1, "TenHocKy"),
        "LoaiHocKy" = COALESCE($2, "LoaiHocKy"),
        "ThuTu" = COALESCE($3, "ThuTu"),
        "NgayBatDau" = COALESCE($4, "NgayBatDau"),
        "NgayKetThuc" = COALESCE($5, "NgayKetThuc"),
        "HanDongHocPhi" = COALESCE($6, "HanDongHocPhi"),
        "TrangThai" = COALESCE($7, "TrangThai")
       WHERE "MaHocKy" = $8
       RETURNING *`,
      [TenHocKy, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, HanDongHocPhi, TrangThai, id]
    );

    res.json({
      success: true,
      message: 'Cập nhật học kỳ thành công',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update semester error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Xóa học kỳ
const deleteSemester = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT "MaHocKy" FROM "HOCKY" WHERE "MaHocKy" = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học kỳ'
      });
    }

    // Kiểm tra có lớp mở trong học kỳ không
    const classCount = await pool.query(
      'SELECT COUNT(*) as count FROM "LOPMO" WHERE "MaHocKy" = $1',
      [id]
    );

    if (parseInt(classCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa học kỳ đã có lớp mở'
      });
    }

    await pool.query('DELETE FROM "HOCKY" WHERE "MaHocKy" = $1', [id]);

    res.json({
      success: true,
      message: 'Xóa học kỳ thành công'
    });
  } catch (error) {
    console.error('Delete semester error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy danh sách năm học
const getAcademicYears = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM "NAMHOC" ORDER BY "TenNamHoc" DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get academic years error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  getAllSemesters,
  getActiveSemester,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
  getAcademicYears
};
