const pool = require('../config/database');

// Lấy tất cả đăng ký với filter
const getAllRegistrations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      MaHocKy,
      TrangThai
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE (sv."MaSv" ILIKE $1 OR sv."HoTen" ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (MaHocKy) {
      whereClause += ` AND pdk."MaHocKy" = ${paramIndex}`;
      params.push(MaHocKy);
      paramIndex++;
    }

    if (TrangThai) {
      whereClause += ` AND pdk."TrangThai" = ${paramIndex}`;
      params.push(TrangThai);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT pdk."SoPhieu") 
       FROM "PHIEUDANGKY" pdk
       JOIN "SINHVIEN" sv ON pdk."MaSv" = sv."MaSv"
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách phiếu đăng ký
    const result = await pool.query(
      `SELECT pdk.*, sv."HoTen", sv."Email", hk."TenHocKy", nh."TenNamHoc",
       (SELECT COUNT(*) FROM "CHITIETDANGKY" WHERE "SoPhieu" = pdk."SoPhieu") as so_mon_dang_ky,
       (SELECT SUM(mh."SoTinChi") FROM "CHITIETDANGKY" ctdk 
        JOIN "LOP" l ON ctdk."MaLop" = l."MaLop" 
        JOIN "MONHOC" mh ON l."MaMonHoc" = mh."MaMonHoc"
        WHERE ctdk."SoPhieu" = pdk."SoPhieu") as "TongTinChi"
       FROM "PHIEUDANGKY" pdk
       JOIN "SINHVIEN" sv ON pdk."MaSv" = sv."MaSv"
       JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
       JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
       ${whereClause}
       ORDER BY pdk."NgayDangKy" DESC
       LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const registrations = result.rows.map(r => ({
      id: r.SoPhieu,
      SoPhieu: r.SoPhieu,
      MaSv: r.MaSv,
      student_code: r.MaSv,
      HoTen: r.HoTen,
      student_name: r.HoTen,
      Email: r.Email,
      MaHocKy: r.MaHocKy,
      TenHocKy: r.TenHocKy,
      semester_name: r.TenHocKy,
      TenNamHoc: r.TenNamHoc,
      so_mon_dang_ky: parseInt(r.so_mon_dang_ky) || 0,
      courses_count: parseInt(r.so_mon_dang_ky) || 0,
      TongTinChi: parseInt(r.TongTinChi) || 0,
      total_credits: parseInt(r.TongTinChi) || 0,
      TongTienPhaiDong: r.TongTienPhaiDong,
      total_amount: r.TongTienPhaiDong,
      NgayDangKy: r.NgayDangKy,
      created_at: r.NgayDangKy,
      TrangThai: r.TrangThai,
      status: r.TrangThai
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
    const { MaHocKy } = req.query;

    let whereClause = `WHERE pdk."MaSv" = $1`;
    let params = [studentId];
    let paramIndex = 2;

    if (MaHocKy) {
      whereClause += ` AND pdk."MaHocKy" = ${paramIndex}`;
      params.push(MaHocKy);
    }

    // Lấy chi tiết môn đăng ký
    const result = await pool.query(
      `SELECT ctdk.*, l.*, mh."TenMonHoc", mh."SoTinChi", mh."LoaiMon",
       pdk."MaHocKy", hk."TenHocKy", nh."TenNamHoc"
       FROM "CHITIETDANGKY" ctdk
       JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
       JOIN "LOP" l ON ctdk."MaLop" = l."MaLop"
       JOIN "MONHOC" mh ON l."MaMonHoc" = mh."MaMonHoc"
       JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
       JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
       ${whereClause}
       ORDER BY mh."TenMonHoc"`,
      params
    );

    const courses = result.rows.map(c => ({
      id: c.id,
      MaLop: c.MaLop,
      class_code: c.MaLop,
      MaMonHoc: c.MaMonHoc,
      course_code: c.MaMonHoc,
      TenMonHoc: c.TenMonHoc,
      course_name: c.TenMonHoc,
      SoTinChi: c.SoTinChi,
      credits: c.SoTinChi,
      LoaiMon: c.LoaiMon,
      type: c.LoaiMon,
      GiangVien: c.GiangVien,
      instructor: c.GiangVien,
      PhongHoc: c.PhongHoc,
      room: c.PhongHoc,
      LichHoc: c.LichHoc,
      schedule: c.LichHoc,
      MaHocKy: c.MaHocKy,
      TenHocKy: c.TenHocKy,
      semester_name: c.TenHocKy,
      TenNamHoc: c.TenNamHoc,
      TrangThai: c.TrangThai,
      status: c.TrangThai
    }));

    // Tính tổng
    const totalCredits = courses.reduce((sum, c) => sum + (c.SoTinChi || 0), 0);
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
    const { MaHocKy, search = '', MaKhoa } = req.query;

    if (!MaHocKy) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn học kỳ'
      });
    }

    let whereClause = `WHERE lm."MaHocKy" = $1 AND (mh."MaMonHoc" ILIKE $2 OR mh."TenMonHoc" ILIKE $2)`;
    let params = [MaHocKy, `%${search}%`];
    let paramIndex = 3;

    if (MaKhoa) {
      whereClause += ` AND mh."MaKhoa" = ${paramIndex}`;
      params.push(MaKhoa);
    }

    const result = await pool.query(
      `SELECT lm.*, l.*, mh."TenMonHoc", mh."SoTinChi", mh."LoaiMon", kh."TenKhoa",
       (SELECT COUNT(*) FROM "CHITIETDANGKY" ctdk 
        JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
        WHERE ctdk."MaLop" = l."MaLop" AND pdk."MaHocKy" = lm."MaHocKy"
        AND ctdk."TrangThai" = 'Đã đăng ký') as "SoLuongDaDangKy"
       FROM "LOPMO" lm
       JOIN "LOP" l ON lm."MaLop" = l."MaLop"
       JOIN "MONHOC" mh ON l."MaMonHoc" = mh."MaMonHoc"
       LEFT JOIN "KHOA" kh ON mh."MaKhoa" = kh."MaKhoa"
       ${whereClause}
       ORDER BY mh."TenMonHoc", l."MaLop"`,
      params
    );

    const availableCourses = result.rows.map(c => ({
      id: `${c.MaLop}-${c.MaHocKy}`,
      MaLop: c.MaLop,
      class_code: c.MaLop,
      MaMonHoc: c.MaMonHoc,
      course_code: c.MaMonHoc,
      TenMonHoc: c.TenMonHoc,
      course_name: c.TenMonHoc,
      SoTinChi: c.SoTinChi,
      credits: c.SoTinChi,
      LoaiMon: c.LoaiMon,
      type: c.LoaiMon,
      TenKhoa: c.TenKhoa,
      faculty: c.TenKhoa,
      SoLuongToiDa: c.SoLuongToiDa,
      max_students: c.SoLuongToiDa,
      SoLuongDaDangKy: parseInt(c.SoLuongDaDangKy) || 0,
      registered_count: parseInt(c.SoLuongDaDangKy) || 0,
      con_trong: c.SoLuongToiDa - (parseInt(c.SoLuongDaDangKy) || 0),
      available_slots: c.SoLuongToiDa - (parseInt(c.SoLuongDaDangKy) || 0),
      GiangVien: c.GiangVien,
      instructor: c.GiangVien,
      PhongHoc: c.PhongHoc,
      room: c.PhongHoc,
      LichHoc: c.LichHoc,
      schedule: c.LichHoc,
      NgayBatDau: c.NgayBatDau,
      NgayKetThuc: c.NgayKetThuc
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
    const { MaSv, MaHocKy, MaLop, LoaiDangKy = 'hoc_moi' } = req.body;

    if (!MaSv || !MaHocKy || !MaLop) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin'
      });
    }

    await client.query('BEGIN');

    // Kiểm tra sinh viên tồn tại
    const studentResult = await client.query(
      'SELECT "MaSv" FROM "SINHVIEN" WHERE "MaSv" = $1',
      [MaSv]
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
      `SELECT lm.*, l."SoLuongToiDa", l."MaMonHoc", mh."SoTinChi", mh."LoaiMon",
       (SELECT COUNT(*) FROM "CHITIETDANGKY" ctdk 
        JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
        WHERE ctdk."MaLop" = l."MaLop" AND pdk."MaHocKy" = lm."MaHocKy"
        AND ctdk."TrangThai" = 'Đã đăng ký') as registered
       FROM "LOPMO" lm
       JOIN "LOP" l ON lm."MaLop" = l."MaLop"
       JOIN "MONHOC" mh ON l."MaMonHoc" = mh."MaMonHoc"
       WHERE lm."MaLop" = $1 AND lm."MaHocKy" = $2`,
      [MaLop, MaHocKy]
    );

    if (classResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Lớp học không tồn tại trong học kỳ này'
      });
    }

    const classInfo = classResult.rows[0];
    if (parseInt(classInfo.registered) >= classInfo.SoLuongToiDa) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Lớp học đã đầy'
      });
    }

    // Lấy hoặc tạo phiếu đăng ký
    let phieuResult = await client.query(
      'SELECT "SoPhieu" FROM "PHIEUDANGKY" WHERE "MaSv" = $1 AND "MaHocKy" = $2',
      [MaSv, MaHocKy]
    );

    let SoPhieu;
    if (phieuResult.rows.length === 0) {
      // Tạo phiếu đăng ký mới
      const newPhieuResult = await client.query(
        `INSERT INTO "PHIEUDANGKY" ("MaSv", "MaHocKy", "TrangThai")
         VALUES ($1, $2, 'Chờ xử lý')
         RETURNING "SoPhieu"`,
        [MaSv, MaHocKy]
      );
      SoPhieu = newPhieuResult.rows[0].SoPhieu;
    } else {
      SoPhieu = phieuResult.rows[0].SoPhieu;
    }

    // Kiểm tra đã đăng ký môn này chưa
    const existingRegResult = await client.query(
      `SELECT ctdk.id FROM "CHITIETDANGKY" ctdk
       JOIN "LOP" l ON ctdk."MaLop" = l."MaLop"
       JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
       WHERE pdk."MaSv" = $1 AND pdk."MaHocKy" = $2 AND l."MaMonHoc" = $3
       AND ctdk."TrangThai" != 'Đã hủy'`,
      [MaSv, MaHocKy, classInfo.MaMonHoc]
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
      'SELECT "DonGia" FROM "DONGIATINCHI" WHERE "LoaiMon" = $1 AND "LoaiHoc" = $2',
      [classInfo.LoaiMon, LoaiDangKy]
    );
    const donGia = priceResult.rows.length > 0 ? parseFloat(priceResult.rows[0].DonGia) : 27000;
    const soTien = donGia * classInfo.SoTinChi;

    // Thêm chi tiết đăng ký
    const regResult = await client.query(
      `INSERT INTO "CHITIETDANGKY" ("SoPhieu", "MaLop", "LoaiDangKy", "SoTinChi", "DonGia", "SoTien", "TrangThai")
       VALUES ($1, $2, $3, $4, $5, $6, 'Đã đăng ký')
       RETURNING *`,
      [SoPhieu, MaLop, LoaiDangKy, classInfo.SoTinChi, donGia, soTien]
    );

    // Cập nhật tổng tiền phiếu đăng ký
    await client.query(
      `UPDATE "PHIEUDANGKY" SET 
        "TongTienPhaiDong" = (
          SELECT COALESCE(SUM("SoTien"), 0) FROM "CHITIETDANGKY" 
          WHERE "SoPhieu" = $1 AND "TrangThai" = 'Đã đăng ký'
        )
       WHERE "SoPhieu" = $1`,
      [SoPhieu]
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
      `SELECT ctdk.*, pdk."SoPhieu", pdk."MaSv", pdk."MaHocKy"
       FROM "CHITIETDANGKY" ctdk
       JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
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
      `UPDATE "CHITIETDANGKY" SET "TrangThai" = 'Đã hủy' WHERE id = $1`,
      [id]
    );

    // Cập nhật tổng tiền phiếu đăng ký
    await client.query(
      `UPDATE "PHIEUDANGKY" SET 
        "TongTienPhaiDong" = (
          SELECT COALESCE(SUM("SoTien"), 0) FROM "CHITIETDANGKY" 
          WHERE "SoPhieu" = $1 AND "TrangThai" = 'Đã đăng ký'
        )
       WHERE "SoPhieu" = $1`,
      [registration.SoPhieu]
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
    const { MaHocKy } = req.query;

    let whereClause = '';
    let params = [];

    if (MaHocKy) {
      whereClause = 'WHERE pdk."MaHocKy" = $1';
      params = [MaHocKy];
    }

    // Tổng số phiếu đăng ký
    const totalResult = await pool.query(
      `SELECT COUNT(DISTINCT pdk."SoPhieu") as total
       FROM "PHIEUDANGKY" pdk ${whereClause}`,
      params
    );

    // Tổng số môn đăng ký
    const coursesResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM "CHITIETDANGKY" ctdk
       JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
       ${whereClause} ${whereClause ? 'AND' : 'WHERE'} ctdk."TrangThai" = 'Đã đăng ký'`,
      params
    );

    // Tổng số tín chỉ
    const creditsResult = await pool.query(
      `SELECT COALESCE(SUM(ctdk."SoTinChi"), 0) as total
       FROM "CHITIETDANGKY" ctdk
       JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
       ${whereClause} ${whereClause ? 'AND' : 'WHERE'} ctdk."TrangThai" = 'Đã đăng ký'`,
      params
    );

    // Tổng tiền học phí
    const tuitionResult = await pool.query(
      `SELECT COALESCE(SUM(pdk."TongTienPhaiDong"), 0) as total
       FROM "PHIEUDANGKY" pdk ${whereClause}`,
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
