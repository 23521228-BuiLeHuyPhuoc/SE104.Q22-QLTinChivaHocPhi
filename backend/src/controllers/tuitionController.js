const pool = require('../config/database');

// Lấy tất cả học phí với phân trang và filter
const getAllTuition = async (req, res) => {
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
      if (TrangThai === 'chua_dong') {
        whereClause += ` AND (pdk."TongTienDaDong" < pdk."TongTienPhaiDong" OR pdk."TongTienDaDong" IS NULL)`;
      } else if (TrangThai === 'da_dong') {
        whereClause += ` AND pdk."TongTienDaDong" >= pdk."TongTienPhaiDong"`;
      }
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

    // Lấy danh sách học phí
    const result = await pool.query(
      `SELECT pdk.*, sv."HoTen", sv."Email", hk."TenHocKy", nh."TenNamHoc",
       (SELECT COUNT(*) FROM "CHITIETDANGKY" WHERE "SoPhieu" = pdk."SoPhieu" AND "TrangThai" = 'Đã đăng ký') as so_mon,
       (SELECT COALESCE(SUM("SoTienThu"), 0) FROM "PHIEUTHUHOCPHI" WHERE "SoPhieuDangKy" = pdk."SoPhieu" AND "TrangThai" = 'Thành công') as da_thu
       FROM "PHIEUDANGKY" pdk
       JOIN "SINHVIEN" sv ON pdk."MaSv" = sv."MaSv"
       JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
       JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
       ${whereClause}
       ORDER BY pdk."NgayDangKy" DESC
       LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const tuitions = result.rows.map(t => ({
      id: t.SoPhieu,
      SoPhieu: t.SoPhieu,
      MaSv: t.MaSv,
      student_code: t.MaSv,
      HoTen: t.HoTen,
      student_name: t.HoTen,
      Email: t.Email,
      MaHocKy: t.MaHocKy,
      TenHocKy: t.TenHocKy,
      semester_name: t.TenHocKy,
      TenNamHoc: t.TenNamHoc,
      so_mon: parseInt(t.so_mon) || 0,
      courses_count: parseInt(t.so_mon) || 0,
      TongTienPhaiDong: parseFloat(t.TongTienPhaiDong) || 0,
      total_amount: parseFloat(t.TongTienPhaiDong) || 0,
      TongTienDaDong: parseFloat(t.da_thu) || 0,
      paid_amount: parseFloat(t.da_thu) || 0,
      con_no: (parseFloat(t.TongTienPhaiDong) || 0) - (parseFloat(t.da_thu) || 0),
      remaining: (parseFloat(t.TongTienPhaiDong) || 0) - (parseFloat(t.da_thu) || 0),
      TrangThai: (parseFloat(t.da_thu) || 0) >= (parseFloat(t.TongTienPhaiDong) || 0) ? 'Đã đóng đủ' : 'Còn nợ',
      status: (parseFloat(t.da_thu) || 0) >= (parseFloat(t.TongTienPhaiDong) || 0) ? 'paid' : 'pending'
    }));

    res.json({
      success: true,
      data: tuitions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all tuition error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy học phí theo ID phiếu
const getTuitionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT pdk.*, sv."HoTen", sv."Email", sv.so_dien_thoai, hk."TenHocKy", nh."TenNamHoc",
       (SELECT COALESCE(SUM("SoTienThu"), 0) FROM "PHIEUTHUHOCPHI" 
        WHERE "SoPhieuDangKy" = pdk."SoPhieu" AND "TrangThai" = 'Thành công') as da_thu
       FROM "PHIEUDANGKY" pdk
       JOIN "SINHVIEN" sv ON pdk."MaSv" = sv."MaSv"
       JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
       JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
       WHERE pdk."SoPhieu" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin học phí'
      });
    }

    const t = result.rows[0];

    // Lấy chi tiết môn đăng ký
    const detailsResult = await pool.query(
      `SELECT ctdk.*, l."MaLop", mh."MaMonHoc", mh."TenMonHoc", mh."LoaiMon"
       FROM "CHITIETDANGKY" ctdk
       JOIN "LOP" l ON ctdk."MaLop" = l."MaLop"
       JOIN "MONHOC" mh ON l."MaMonHoc" = mh."MaMonHoc"
       WHERE ctdk."SoPhieu" = $1 AND ctdk."TrangThai" = 'Đã đăng ký'
       ORDER BY mh."TenMonHoc"`,
      [id]
    );

    // Lấy lịch sử thanh toán
    const paymentsResult = await pool.query(
      `SELECT * FROM "PHIEUTHUHOCPHI" 
       WHERE "SoPhieuDangKy" = $1
       ORDER BY "NgayLap" DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: t.SoPhieu,
        SoPhieu: t.SoPhieu,
        MaSv: t.MaSv,
        HoTen: t.HoTen,
        Email: t.Email,
        so_dien_thoai: t.so_dien_thoai,
        MaHocKy: t.MaHocKy,
        TenHocKy: t.TenHocKy,
        TenNamHoc: t.TenNamHoc,
        TongTienPhaiDong: parseFloat(t.TongTienPhaiDong) || 0,
        total_amount: parseFloat(t.TongTienPhaiDong) || 0,
        TongTienDaDong: parseFloat(t.da_thu) || 0,
        paid_amount: parseFloat(t.da_thu) || 0,
        con_no: (parseFloat(t.TongTienPhaiDong) || 0) - (parseFloat(t.da_thu) || 0),
        remaining: (parseFloat(t.TongTienPhaiDong) || 0) - (parseFloat(t.da_thu) || 0),
        courses: detailsResult.rows.map(c => ({
          MaMonHoc: c.MaMonHoc,
          TenMonHoc: c.TenMonHoc,
          SoTinChi: c.SoTinChi,
          DonGia: c.DonGia,
          SoTien: c.SoTien,
          LoaiDangKy: c.LoaiDangKy
        })),
        payments: paymentsResult.rows
      }
    });
  } catch (error) {
    console.error('Get tuition by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy học phí của sinh viên
const getStudentTuition = async (req, res) => {
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

    const result = await pool.query(
      `SELECT pdk.*, hk."TenHocKy", nh."TenNamHoc",
       (SELECT COALESCE(SUM("SoTienThu"), 0) FROM "PHIEUTHUHOCPHI" 
        WHERE "SoPhieuDangKy" = pdk."SoPhieu" AND "TrangThai" = 'Thành công') as da_thu
       FROM "PHIEUDANGKY" pdk
       JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
       JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
       ${whereClause}
       ORDER BY pdk."NgayDangKy" DESC`,
      params
    );

    const tuitions = result.rows.map(t => ({
      id: t.SoPhieu,
      SoPhieu: t.SoPhieu,
      MaHocKy: t.MaHocKy,
      TenHocKy: t.TenHocKy,
      semester_name: t.TenHocKy,
      TenNamHoc: t.TenNamHoc,
      TongTienPhaiDong: parseFloat(t.TongTienPhaiDong) || 0,
      total_amount: parseFloat(t.TongTienPhaiDong) || 0,
      TongTienDaDong: parseFloat(t.da_thu) || 0,
      paid_amount: parseFloat(t.da_thu) || 0,
      con_no: (parseFloat(t.TongTienPhaiDong) || 0) - (parseFloat(t.da_thu) || 0),
      remaining: (parseFloat(t.TongTienPhaiDong) || 0) - (parseFloat(t.da_thu) || 0),
      TrangThai: (parseFloat(t.da_thu) || 0) >= (parseFloat(t.TongTienPhaiDong) || 0) ? 'Đã đóng đủ' : 'Còn nợ',
      status: (parseFloat(t.da_thu) || 0) >= (parseFloat(t.TongTienPhaiDong) || 0) ? 'paid' : 'pending'
    }));

    res.json({
      success: true,
      data: tuitions
    });
  } catch (error) {
    console.error('Get student tuition error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Tính học phí cho sinh viên
const calculateTuition = async (req, res) => {
  try {
    const { MaSv, MaHocKy } = req.body;

    if (!MaSv || !MaHocKy) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã sinh viên và học kỳ'
      });
    }

    // Lấy phiếu đăng ký
    const phieuResult = await pool.query(
      'SELECT "SoPhieu" FROM "PHIEUDANGKY" WHERE "MaSv" = $1 AND "MaHocKy" = $2',
      [MaSv, MaHocKy]
    );

    if (phieuResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên chưa đăng ký môn học trong học kỳ này'
      });
    }

    const SoPhieu = phieuResult.rows[0].SoPhieu;

    // Tính lại tổng tiền
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM("SoTien"), 0) as total
       FROM "CHITIETDANGKY"
       WHERE "SoPhieu" = $1 AND "TrangThai" = 'Đã đăng ký'`,
      [SoPhieu]
    );

    const total = parseFloat(totalResult.rows[0].total);

    // Cập nhật phiếu đăng ký
    await pool.query(
      'UPDATE "PHIEUDANGKY" SET "TongTienPhaiDong" = $1 WHERE "SoPhieu" = $2',
      [total, SoPhieu]
    );

    res.json({
      success: true,
      message: 'Tính học phí thành công',
      data: {
        SoPhieu,
        TongTienPhaiDong: total
      }
    });
  } catch (error) {
    console.error('Calculate tuition error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Thống kê học phí
const getTuitionStats = async (req, res) => {
  try {
    const { MaHocKy } = req.query;

    let whereClause = '';
    let params = [];

    if (MaHocKy) {
      whereClause = 'WHERE pdk."MaHocKy" = $1';
      params = [MaHocKy];
    }

    // Tổng tiền phải thu
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM("TongTienPhaiDong"), 0) as total
       FROM "PHIEUDANGKY" pdk ${whereClause}`,
      params
    );

    // Tổng tiền đã thu
    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(pthp."SoTienThu"), 0) as total
       FROM "PHIEUTHUHOCPHI" pthp
       JOIN "PHIEUDANGKY" pdk ON pthp."SoPhieuDangKy" = pdk."SoPhieu"
       WHERE pthp."TrangThai" = 'Thành công'
       ${"MaHocKy" ? 'AND pdk.MaHocKy = $1' : ''}`,
      params
    );

    // Số sinh viên đã đóng đủ
    const paidStudentsResult = await pool.query(
      `SELECT COUNT(DISTINCT pdk."MaSv") as count
       FROM "PHIEUDANGKY" pdk
       WHERE pdk."TongTienDaDong" >= pdk."TongTienPhaiDong"
       ${"MaHocKy" ? 'AND pdk.MaHocKy = $1' : ''}`,
      params
    );

    // Số sinh viên còn nợ
    const owingStudentsResult = await pool.query(
      `SELECT COUNT(DISTINCT pdk."MaSv") as count
       FROM "PHIEUDANGKY" pdk
       WHERE (pdk."TongTienDaDong" < pdk."TongTienPhaiDong" OR pdk."TongTienDaDong" IS NULL)
       AND pdk."TongTienPhaiDong" > 0
       ${"MaHocKy" ? 'AND pdk.MaHocKy = $1' : ''}`,
      params
    );

    res.json({
      success: true,
      data: {
        totalAmount: parseFloat(totalResult.rows[0].total),
        paidAmount: parseFloat(paidResult.rows[0].total) || 0,
        remainingAmount: parseFloat(totalResult.rows[0].total) - (parseFloat(paidResult.rows[0].total) || 0),
        paidStudents: parseInt(paidStudentsResult.rows[0].count),
        owingStudents: parseInt(owingStudentsResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get tuition stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy đơn giá tín chỉ
const getCreditPrices = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "DONGIATINCHI" ORDER BY "LoaiMon", "LoaiHoc"');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get credit prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  getAllTuition,
  getTuitionById,
  getStudentTuition,
  calculateTuition,
  getTuitionStats,
  getCreditPrices
};
