const pool = require('../config/database');

// Lấy tất cả đăng ký với filter
const getAllRegistrations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      ma_hoc_ky,
      trang_thai
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE (sv.ma_sv ILIKE $1 OR sv.ho_ten ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (ma_hoc_ky) {
      whereClause += ` AND pdk.ma_hoc_ky = $${paramIndex}`;
      params.push(ma_hoc_ky);
      paramIndex++;
    }

    if (trang_thai) {
      whereClause += ` AND pdk.trang_thai = $${paramIndex}`;
      params.push(trang_thai);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT pdk.so_phieu) 
       FROM phieu_dang_ky pdk
       JOIN sinh_vien sv ON pdk.ma_sv = sv.ma_sv
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách phiếu đăng ký
    const result = await pool.query(
      `SELECT pdk.*, sv.ho_ten, sv.email, hk.ten_hoc_ky, nh.ten_nam_hoc,
       (SELECT COUNT(*) FROM chi_tiet_dang_ky WHERE so_phieu = pdk.so_phieu) as so_mon_dang_ky,
       (SELECT SUM(mh.so_tin_chi) FROM chi_tiet_dang_ky ctdk 
        JOIN lop l ON ctdk.ma_lop = l.ma_lop 
        JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
        WHERE ctdk.so_phieu = pdk.so_phieu) as tong_tin_chi
       FROM phieu_dang_ky pdk
       JOIN sinh_vien sv ON pdk.ma_sv = sv.ma_sv
       JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
       JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
       ${whereClause}
       ORDER BY pdk.ngay_dang_ky DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const registrations = result.rows.map(r => ({
      id: r.so_phieu,
      so_phieu: r.so_phieu,
      ma_sv: r.ma_sv,
      student_code: r.ma_sv,
      ho_ten: r.ho_ten,
      student_name: r.ho_ten,
      email: r.email,
      ma_hoc_ky: r.ma_hoc_ky,
      ten_hoc_ky: r.ten_hoc_ky,
      semester_name: r.ten_hoc_ky,
      ten_nam_hoc: r.ten_nam_hoc,
      so_mon_dang_ky: parseInt(r.so_mon_dang_ky) || 0,
      courses_count: parseInt(r.so_mon_dang_ky) || 0,
      tong_tin_chi: parseInt(r.tong_tin_chi) || 0,
      total_credits: parseInt(r.tong_tin_chi) || 0,
      tong_tien_phai_dong: r.tong_tien_phai_dong,
      total_amount: r.tong_tien_phai_dong,
      ngay_dang_ky: r.ngay_dang_ky,
      created_at: r.ngay_dang_ky,
      trang_thai: r.trang_thai,
      status: r.trang_thai
    }));

    res.json({
      success: true,
      data: registrations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy môn học đã đăng ký của sinh viên
const getStudentCourses = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { ma_hoc_ky } = req.query;

    let whereClause = `WHERE pdk.ma_sv = $1`;
    let params = [studentId];
    let paramIndex = 2;

    if (ma_hoc_ky) {
      whereClause += ` AND pdk.ma_hoc_ky = $${paramIndex}`;
      params.push(ma_hoc_ky);
    }

    // Lấy chi tiết môn đăng ký
    const result = await pool.query(
      `SELECT ctdk.*, l.*, mh.ten_mon_hoc, mh.so_tin_chi, mh.loai_mon,
       pdk.ma_hoc_ky, hk.ten_hoc_ky, nh.ten_nam_hoc
       FROM chi_tiet_dang_ky ctdk
       JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
       JOIN lop l ON ctdk.ma_lop = l.ma_lop
       JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
       JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
       JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
       ${whereClause}
       ORDER BY mh.ten_mon_hoc`,
      params
    );

    const courses = result.rows.map(c => ({
      id: c.id,
      ma_lop: c.ma_lop,
      class_code: c.ma_lop,
      ma_mon_hoc: c.ma_mon_hoc,
      course_code: c.ma_mon_hoc,
      ten_mon_hoc: c.ten_mon_hoc,
      course_name: c.ten_mon_hoc,
      so_tin_chi: c.so_tin_chi,
      credits: c.so_tin_chi,
      loai_mon: c.loai_mon,
      type: c.loai_mon,
      giang_vien: c.giang_vien,
      instructor: c.giang_vien,
      phong_hoc: c.phong_hoc,
      room: c.phong_hoc,
      lich_hoc: c.lich_hoc,
      schedule: c.lich_hoc,
      ma_hoc_ky: c.ma_hoc_ky,
      ten_hoc_ky: c.ten_hoc_ky,
      semester_name: c.ten_hoc_ky,
      ten_nam_hoc: c.ten_nam_hoc,
      trang_thai: c.trang_thai,
      status: c.trang_thai
    }));

    // Tính tổng
    const totalCredits = courses.reduce((sum, c) => sum + (c.so_tin_chi || 0), 0);
    const totalCourses = courses.length;

    res.json({
      success: true,
      data: {
        courses,
        summary: {
          totalCourses,
          totalCredits
        }
      }
    });
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy danh sách lớp có thể đăng ký
const getAvailableCourses = async (req, res) => {
  try {
    const { ma_hoc_ky, search = '', ma_khoa } = req.query;

    if (!ma_hoc_ky) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn học kỳ'
      });
    }

    let whereClause = `WHERE lm.ma_hoc_ky = $1 AND (mh.ma_mon_hoc ILIKE $2 OR mh.ten_mon_hoc ILIKE $2)`;
    let params = [ma_hoc_ky, `%${search}%`];
    let paramIndex = 3;

    if (ma_khoa) {
      whereClause += ` AND mh.ma_khoa = $${paramIndex}`;
      params.push(ma_khoa);
    }

    const result = await pool.query(
      `SELECT lm.*, l.*, mh.ten_mon_hoc, mh.so_tin_chi, mh.loai_mon, kh.ten_khoa,
       (SELECT COUNT(*) FROM chi_tiet_dang_ky ctdk 
        JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
        WHERE ctdk.ma_lop = l.ma_lop AND pdk.ma_hoc_ky = lm.ma_hoc_ky
        AND ctdk.trang_thai = 'Đã đăng ký') as so_luong_da_dang_ky
       FROM lop_mo lm
       JOIN lop l ON lm.ma_lop = l.ma_lop
       JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
       LEFT JOIN khoa kh ON mh.ma_khoa = kh.ma_khoa
       ${whereClause}
       ORDER BY mh.ten_mon_hoc, l.ma_lop`,
      params
    );

    const availableCourses = result.rows.map(c => ({
      id: `${c.ma_lop}-${c.ma_hoc_ky}`,
      ma_lop: c.ma_lop,
      class_code: c.ma_lop,
      ma_mon_hoc: c.ma_mon_hoc,
      course_code: c.ma_mon_hoc,
      ten_mon_hoc: c.ten_mon_hoc,
      course_name: c.ten_mon_hoc,
      so_tin_chi: c.so_tin_chi,
      credits: c.so_tin_chi,
      loai_mon: c.loai_mon,
      type: c.loai_mon,
      ten_khoa: c.ten_khoa,
      faculty: c.ten_khoa,
      so_luong_toi_da: c.so_luong_toi_da,
      max_students: c.so_luong_toi_da,
      so_luong_da_dang_ky: parseInt(c.so_luong_da_dang_ky) || 0,
      registered_count: parseInt(c.so_luong_da_dang_ky) || 0,
      con_trong: c.so_luong_toi_da - (parseInt(c.so_luong_da_dang_ky) || 0),
      available_slots: c.so_luong_toi_da - (parseInt(c.so_luong_da_dang_ky) || 0),
      giang_vien: c.giang_vien,
      instructor: c.giang_vien,
      phong_hoc: c.phong_hoc,
      room: c.phong_hoc,
      lich_hoc: c.lich_hoc,
      schedule: c.lich_hoc,
      ngay_bat_dau: c.ngay_bat_dau,
      ngay_ket_thuc: c.ngay_ket_thuc
    }));

    res.json({
      success: true,
      data: availableCourses
    });
  } catch (error) {
    console.error('Get available courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Đăng ký môn học
const registerCourse = async (req, res) => {
  const client = await pool.connect();
  try {
    const { ma_sv, ma_hoc_ky, ma_lop, loai_dang_ky = 'hoc_moi' } = req.body;

    if (!ma_sv || !ma_hoc_ky || !ma_lop) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin'
      });
    }

    await client.query('BEGIN');

    // Kiểm tra sinh viên tồn tại
    const studentResult = await client.query(
      'SELECT ma_sv FROM sinh_vien WHERE ma_sv = $1',
      [ma_sv]
    );
    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    // Kiểm tra lớp mở tồn tại và còn chỗ
    const classResult = await client.query(
      `SELECT lm.*, l.so_luong_toi_da, l.ma_mon_hoc, mh.so_tin_chi, mh.loai_mon,
       (SELECT COUNT(*) FROM chi_tiet_dang_ky ctdk 
        JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
        WHERE ctdk.ma_lop = l.ma_lop AND pdk.ma_hoc_ky = lm.ma_hoc_ky
        AND ctdk.trang_thai = 'Đã đăng ký') as registered
       FROM lop_mo lm
       JOIN lop l ON lm.ma_lop = l.ma_lop
       JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
       WHERE lm.ma_lop = $1 AND lm.ma_hoc_ky = $2`,
      [ma_lop, ma_hoc_ky]
    );

    if (classResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Lớp học không tồn tại trong học kỳ này'
      });
    }

    const classInfo = classResult.rows[0];
    if (parseInt(classInfo.registered) >= classInfo.so_luong_toi_da) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Lớp học đã đầy'
      });
    }

    // Lấy hoặc tạo phiếu đăng ký
    let phieuResult = await client.query(
      'SELECT so_phieu FROM phieu_dang_ky WHERE ma_sv = $1 AND ma_hoc_ky = $2',
      [ma_sv, ma_hoc_ky]
    );

    let so_phieu;
    if (phieuResult.rows.length === 0) {
      // Tạo phiếu đăng ký mới
      const newPhieuResult = await client.query(
        `INSERT INTO phieu_dang_ky (ma_sv, ma_hoc_ky, trang_thai)
         VALUES ($1, $2, 'Chờ xử lý')
         RETURNING so_phieu`,
        [ma_sv, ma_hoc_ky]
      );
      so_phieu = newPhieuResult.rows[0].so_phieu;
    } else {
      so_phieu = phieuResult.rows[0].so_phieu;
    }

    // Kiểm tra đã đăng ký môn này chưa
    const existingRegResult = await client.query(
      `SELECT ctdk.id FROM chi_tiet_dang_ky ctdk
       JOIN lop l ON ctdk.ma_lop = l.ma_lop
       JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
       WHERE pdk.ma_sv = $1 AND pdk.ma_hoc_ky = $2 AND l.ma_mon_hoc = $3
       AND ctdk.trang_thai != 'Đã hủy'`,
      [ma_sv, ma_hoc_ky, classInfo.ma_mon_hoc]
    );

    if (existingRegResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đăng ký môn học này rồi'
      });
    }

    // Tính tiền
    const priceResult = await client.query(
      'SELECT don_gia FROM don_gia_tin_chi WHERE loai_mon = $1 AND loai_hoc = $2',
      [classInfo.loai_mon, loai_dang_ky]
    );
    const donGia = priceResult.rows.length > 0 ? parseFloat(priceResult.rows[0].don_gia) : 27000;
    const soTien = donGia * classInfo.so_tin_chi;

    // Thêm chi tiết đăng ký
    const regResult = await client.query(
      `INSERT INTO chi_tiet_dang_ky (so_phieu, ma_lop, loai_dang_ky, so_tin_chi, don_gia, so_tien, trang_thai)
       VALUES ($1, $2, $3, $4, $5, $6, 'Đã đăng ký')
       RETURNING *`,
      [so_phieu, ma_lop, loai_dang_ky, classInfo.so_tin_chi, donGia, soTien]
    );

    // Cập nhật tổng tiền phiếu đăng ký
    await client.query(
      `UPDATE phieu_dang_ky SET 
        tong_tien_phai_dong = (
          SELECT COALESCE(SUM(so_tien), 0) FROM chi_tiet_dang_ky 
          WHERE so_phieu = $1 AND trang_thai = 'Đã đăng ký'
        )
       WHERE so_phieu = $1`,
      [so_phieu]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Đăng ký môn học thành công',
      data: regResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Register course error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  } finally {
    client.release();
  }
};

// Hủy đăng ký môn học
const cancelRegistration = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Lấy thông tin đăng ký
    const regResult = await client.query(
      `SELECT ctdk.*, pdk.so_phieu, pdk.ma_sv, pdk.ma_hoc_ky
       FROM chi_tiet_dang_ky ctdk
       JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
       WHERE ctdk.id = $1`,
      [id]
    );

    if (regResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký'
      });
    }

    const registration = regResult.rows[0];

    // Cập nhật trạng thái
    await client.query(
      `UPDATE chi_tiet_dang_ky SET trang_thai = 'Đã hủy' WHERE id = $1`,
      [id]
    );

    // Cập nhật tổng tiền phiếu đăng ký
    await client.query(
      `UPDATE phieu_dang_ky SET 
        tong_tien_phai_dong = (
          SELECT COALESCE(SUM(so_tien), 0) FROM chi_tiet_dang_ky 
          WHERE so_phieu = $1 AND trang_thai = 'Đã đăng ký'
        )
       WHERE so_phieu = $1`,
      [registration.so_phieu]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Hủy đăng ký thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  } finally {
    client.release();
  }
};

// Thống kê đăng ký
const getRegistrationStats = async (req, res) => {
  try {
    const { ma_hoc_ky } = req.query;

    let whereClause = '';
    let params = [];

    if (ma_hoc_ky) {
      whereClause = 'WHERE pdk.ma_hoc_ky = $1';
      params = [ma_hoc_ky];
    }

    // Tổng số phiếu đăng ký
    const totalResult = await pool.query(
      `SELECT COUNT(DISTINCT pdk.so_phieu) as total
       FROM phieu_dang_ky pdk ${whereClause}`,
      params
    );

    // Tổng số môn đăng ký
    const coursesResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM chi_tiet_dang_ky ctdk
       JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
       ${whereClause} ${whereClause ? 'AND' : 'WHERE'} ctdk.trang_thai = 'Đã đăng ký'`,
      params
    );

    // Tổng số tín chỉ
    const creditsResult = await pool.query(
      `SELECT COALESCE(SUM(ctdk.so_tin_chi), 0) as total
       FROM chi_tiet_dang_ky ctdk
       JOIN phieu_dang_ky pdk ON ctdk.so_phieu = pdk.so_phieu
       ${whereClause} ${whereClause ? 'AND' : 'WHERE'} ctdk.trang_thai = 'Đã đăng ký'`,
      params
    );

    // Tổng tiền học phí
    const tuitionResult = await pool.query(
      `SELECT COALESCE(SUM(pdk.tong_tien_phai_dong), 0) as total
       FROM phieu_dang_ky pdk ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        totalRegistrations: parseInt(totalResult.rows[0].total),
        totalCourses: parseInt(coursesResult.rows[0].total),
        totalCredits: parseInt(creditsResult.rows[0].total),
        totalTuition: parseFloat(tuitionResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Get registration stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  getAllRegistrations,
  getStudentCourses,
  getAvailableCourses,
  registerCourse,
  cancelRegistration,
  getRegistrationStats
};
