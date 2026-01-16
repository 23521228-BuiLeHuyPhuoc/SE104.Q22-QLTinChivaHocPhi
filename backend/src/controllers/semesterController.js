const pool = require('../config/database');

// Lấy tất cả học kỳ
const getAllSemesters = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hk.*, nh.ten_nam_hoc
      FROM hoc_ky hk
      JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
      ORDER BY nh.ten_nam_hoc DESC, hk.thu_tu ASC
    `);

    // Map dữ liệu để tương thích với frontend
    const semesters = result.rows.map(hk => ({
      id: hk.ma_hoc_ky,
      ma_hoc_ky: hk.ma_hoc_ky,
      ten_hoc_ky: hk.ten_hoc_ky,
      name: hk.ten_hoc_ky,
      ma_nam_hoc: hk.ma_nam_hoc,
      ten_nam_hoc: hk.ten_nam_hoc,
      year: hk.ten_nam_hoc,
      loai_hoc_ky: hk.loai_hoc_ky,
      type: hk.loai_hoc_ky,
      thu_tu: hk.thu_tu,
      ngay_bat_dau: hk.ngay_bat_dau,
      start_date: hk.ngay_bat_dau,
      ngay_ket_thuc: hk.ngay_ket_thuc,
      end_date: hk.ngay_ket_thuc,
      han_dong_hoc_phi: hk.han_dong_hoc_phi,
      tuition_deadline: hk.han_dong_hoc_phi,
      trang_thai: hk.trang_thai,
      status: hk.trang_thai,
      is_active: hk.trang_thai === 'Đang diễn ra'
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
      SELECT hk.*, nh.ten_nam_hoc
      FROM hoc_ky hk
      JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
      WHERE hk.trang_thai = 'Đang diễn ra'
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Nếu không có học kỳ đang diễn ra, lấy học kỳ sắp diễn ra
      const upcomingResult = await pool.query(`
        SELECT hk.*, nh.ten_nam_hoc
        FROM hoc_ky hk
        JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
        WHERE hk.trang_thai = 'Sắp diễn ra'
        ORDER BY hk.ngay_bat_dau ASC
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
          id: hk.ma_hoc_ky,
          ma_hoc_ky: hk.ma_hoc_ky,
          ten_hoc_ky: hk.ten_hoc_ky,
          name: hk.ten_hoc_ky,
          ma_nam_hoc: hk.ma_nam_hoc,
          ten_nam_hoc: hk.ten_nam_hoc,
          year: hk.ten_nam_hoc,
          loai_hoc_ky: hk.loai_hoc_ky,
          ngay_bat_dau: hk.ngay_bat_dau,
          ngay_ket_thuc: hk.ngay_ket_thuc,
          han_dong_hoc_phi: hk.han_dong_hoc_phi,
          trang_thai: hk.trang_thai,
          is_active: false
        }
      });
    }

    const hk = result.rows[0];
    res.json({
      success: true,
      data: {
        id: hk.ma_hoc_ky,
        ma_hoc_ky: hk.ma_hoc_ky,
        ten_hoc_ky: hk.ten_hoc_ky,
        name: hk.ten_hoc_ky,
        ma_nam_hoc: hk.ma_nam_hoc,
        ten_nam_hoc: hk.ten_nam_hoc,
        year: hk.ten_nam_hoc,
        loai_hoc_ky: hk.loai_hoc_ky,
        ngay_bat_dau: hk.ngay_bat_dau,
        ngay_ket_thuc: hk.ngay_ket_thuc,
        han_dong_hoc_phi: hk.han_dong_hoc_phi,
        trang_thai: hk.trang_thai,
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
      SELECT hk.*, nh.ten_nam_hoc
      FROM hoc_ky hk
      JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
      WHERE hk.ma_hoc_ky = $1
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
      'SELECT COUNT(*) as count FROM lop_mo WHERE ma_hoc_ky = $1',
      [id]
    );

    // Lấy số phiếu đăng ký trong học kỳ
    const regCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM phieu_dang_ky WHERE ma_hoc_ky = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        id: hk.ma_hoc_ky,
        ma_hoc_ky: hk.ma_hoc_ky,
        ten_hoc_ky: hk.ten_hoc_ky,
        name: hk.ten_hoc_ky,
        ma_nam_hoc: hk.ma_nam_hoc,
        ten_nam_hoc: hk.ten_nam_hoc,
        year: hk.ten_nam_hoc,
        loai_hoc_ky: hk.loai_hoc_ky,
        thu_tu: hk.thu_tu,
        ngay_bat_dau: hk.ngay_bat_dau,
        ngay_ket_thuc: hk.ngay_ket_thuc,
        han_dong_hoc_phi: hk.han_dong_hoc_phi,
        trang_thai: hk.trang_thai,
        is_active: hk.trang_thai === 'Đang diễn ra',
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
      ma_hoc_ky, 
      ten_hoc_ky, 
      ma_nam_hoc, 
      loai_hoc_ky, 
      thu_tu,
      ngay_bat_dau, 
      ngay_ket_thuc, 
      han_dong_hoc_phi,
      trang_thai = 'Sắp diễn ra'
    } = req.body;

    if (!ma_hoc_ky || !ten_hoc_ky || !ma_nam_hoc) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
      });
    }

    // Kiểm tra mã học kỳ đã tồn tại
    const existing = await pool.query(
      'SELECT ma_hoc_ky FROM hoc_ky WHERE ma_hoc_ky = $1',
      [ma_hoc_ky]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã học kỳ đã tồn tại'
      });
    }

    const result = await pool.query(
      `INSERT INTO hoc_ky (ma_hoc_ky, ten_hoc_ky, ma_nam_hoc, loai_hoc_ky, thu_tu, ngay_bat_dau, ngay_ket_thuc, han_dong_hoc_phi, trang_thai)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [ma_hoc_ky, ten_hoc_ky, ma_nam_hoc, loai_hoc_ky, thu_tu, ngay_bat_dau, ngay_ket_thuc, han_dong_hoc_phi, trang_thai]
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
      ten_hoc_ky, 
      loai_hoc_ky, 
      thu_tu,
      ngay_bat_dau, 
      ngay_ket_thuc, 
      han_dong_hoc_phi,
      trang_thai
    } = req.body;

    const existing = await pool.query(
      'SELECT ma_hoc_ky FROM hoc_ky WHERE ma_hoc_ky = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học kỳ'
      });
    }

    const result = await pool.query(
      `UPDATE hoc_ky SET 
        ten_hoc_ky = COALESCE($1, ten_hoc_ky),
        loai_hoc_ky = COALESCE($2, loai_hoc_ky),
        thu_tu = COALESCE($3, thu_tu),
        ngay_bat_dau = COALESCE($4, ngay_bat_dau),
        ngay_ket_thuc = COALESCE($5, ngay_ket_thuc),
        han_dong_hoc_phi = COALESCE($6, han_dong_hoc_phi),
        trang_thai = COALESCE($7, trang_thai)
       WHERE ma_hoc_ky = $8
       RETURNING *`,
      [ten_hoc_ky, loai_hoc_ky, thu_tu, ngay_bat_dau, ngay_ket_thuc, han_dong_hoc_phi, trang_thai, id]
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
      'SELECT ma_hoc_ky FROM hoc_ky WHERE ma_hoc_ky = $1',
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
      'SELECT COUNT(*) as count FROM lop_mo WHERE ma_hoc_ky = $1',
      [id]
    );

    if (parseInt(classCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa học kỳ đã có lớp mở'
      });
    }

    await pool.query('DELETE FROM hoc_ky WHERE ma_hoc_ky = $1', [id]);

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
      SELECT * FROM nam_hoc ORDER BY ten_nam_hoc DESC
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
