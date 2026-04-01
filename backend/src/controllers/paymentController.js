const pool = require('../config/database');

// Lấy tất cả phiếu thu với phân trang và filter
const getAllPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      MaHocKy,
      HinhThucThu,
      TrangThai
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE (sv."MaSv" ILIKE $1 OR sv."HoTen" ILIKE $1 OR pthp."SoPhieuThu"::text ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (MaHocKy) {
      whereClause += ` AND pdk."MaHocKy" = ${paramIndex}`;
      params.push(MaHocKy);
      paramIndex++;
    }

    if (HinhThucThu) {
      whereClause += ` AND pthp."HinhThucThu" = ${paramIndex}`;
      params.push(HinhThucThu);
      paramIndex++;
    }

    if (TrangThai) {
      whereClause += ` AND pthp."TrangThai" = ${paramIndex}`;
      params.push(TrangThai);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM "PHIEUTHUHOCPHI" pthp
       JOIN "SINHVIEN" sv ON pthp."MaSv" = sv."MaSv"
       JOIN "PHIEUDANGKY" pdk ON pthp."SoPhieuDangKy" = pdk."SoPhieu"
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách phiếu thu
    const result = await pool.query(
      `SELECT pthp.*, sv."HoTen", sv."Email", hk."TenHocKy", nh."TenNamHoc", pdk."MaHocKy"
       FROM "PHIEUTHUHOCPHI" pthp
       JOIN "SINHVIEN" sv ON pthp."MaSv" = sv."MaSv"
       JOIN "PHIEUDANGKY" pdk ON pthp."SoPhieuDangKy" = pdk."SoPhieu"
       JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
       JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
       ${whereClause}
       ORDER BY pthp."NgayLap" DESC
       LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const payments = result.rows.map(p => ({
      id: p.SoPhieuThu,
      SoPhieuThu: p.SoPhieuThu,
      receipt_number: p.SoPhieuThu,
      MaSv: p.MaSv,
      student_code: p.MaSv,
      HoTen: p.HoTen,
      student_name: p.HoTen,
      Email: p.Email,
      MaHocKy: p.MaHocKy,
      TenHocKy: p.TenHocKy,
      semester_name: p.TenHocKy,
      TenNamHoc: p.TenNamHoc,
      SoTienThu: parseFloat(p.SoTienThu) || 0,
      amount: parseFloat(p.SoTienThu) || 0,
      HinhThucThu: p.HinhThucThu,
      payment_method: p.HinhThucThu,
      NgayLap: p.NgayLap,
      payment_date: p.NgayLap,
      GhiChu: p.GhiChu,
      note: p.GhiChu,
      NguoiThu: p.NguoiThu,
      collected_by: p.NguoiThu,
      TrangThai: p.TrangThai,
      status: p.TrangThai
    }));

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy phiếu thu theo ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT pthp.*, sv."HoTen", sv."Email", sv.so_dien_thoai, hk."TenHocKy", nh."TenNamHoc", pdk."MaHocKy"
       FROM "PHIEUTHUHOCPHI" pthp
       JOIN "SINHVIEN" sv ON pthp."MaSv" = sv."MaSv"
       JOIN "PHIEUDANGKY" pdk ON pthp."SoPhieuDangKy" = pdk."SoPhieu"
       JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
       JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
       WHERE pthp."SoPhieuThu" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu thu'
      });
    }

    const p = result.rows[0];
    res.json({
      success: true,
      data: {
        id: p.SoPhieuThu,
        SoPhieuThu: p.SoPhieuThu,
        MaSv: p.MaSv,
        HoTen: p.HoTen,
        Email: p.Email,
        so_dien_thoai: p.so_dien_thoai,
        MaHocKy: p.MaHocKy,
        TenHocKy: p.TenHocKy,
        TenNamHoc: p.TenNamHoc,
        SoTienThu: parseFloat(p.SoTienThu) || 0,
        amount: parseFloat(p.SoTienThu) || 0,
        HinhThucThu: p.HinhThucThu,
        NgayLap: p.NgayLap,
        GhiChu: p.GhiChu,
        NguoiThu: p.NguoiThu,
        TrangThai: p.TrangThai
      }
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy các khoản thanh toán của sinh viên
const getStudentPayments = async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      `SELECT pthp.*, hk."TenHocKy", nh."TenNamHoc", pdk."MaHocKy"
       FROM "PHIEUTHUHOCPHI" pthp
       JOIN "PHIEUDANGKY" pdk ON pthp."SoPhieuDangKy" = pdk."SoPhieu"
       JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
       JOIN "NAMHOC" nh ON hk."MaNamHoc" = nh."MaNamHoc"
       WHERE pthp."MaSv" = $1
       ORDER BY pthp."NgayLap" DESC`,
      [studentId]
    );

    const payments = result.rows.map(p => ({
      id: p.SoPhieuThu,
      SoPhieuThu: p.SoPhieuThu,
      MaHocKy: p.MaHocKy,
      TenHocKy: p.TenHocKy,
      semester_name: p.TenHocKy,
      TenNamHoc: p.TenNamHoc,
      SoTienThu: parseFloat(p.SoTienThu) || 0,
      amount: parseFloat(p.SoTienThu) || 0,
      HinhThucThu: p.HinhThucThu,
      payment_method: p.HinhThucThu,
      NgayLap: p.NgayLap,
      payment_date: p.NgayLap,
      GhiChu: p.GhiChu,
      note: p.GhiChu,
      TrangThai: p.TrangThai,
      status: p.TrangThai
    }));

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get student payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Tạo phiếu thu mới
const createPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      MaSv, 
      MaHocKy, 
      SoTienThu, 
      HinhThucThu = 'Tiền mặt',
      GhiChu
    } = req.body;
    const NguoiThu = req.user?.HoTen || 'Admin';

    if (!MaSv || !MaHocKy || !SoTienThu) {
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

    // Kiểm tra phiếu đăng ký tồn tại
    const phieuResult = await client.query(
      'SELECT "SoPhieu", "TongTienPhaiDong", "TongTienDaDong" FROM "PHIEUDANGKY" WHERE "MaSv" = $1 AND "MaHocKy" = $2',
      [MaSv, MaHocKy]
    );

    if (phieuResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Sinh viên chưa đăng ký môn học trong học kỳ này'
      });
    }

    const soPhieuDangKy = phieuResult.rows[0].SoPhieu;

    // Tạo phiếu thu
    const paymentResult = await client.query(
      `INSERT INTO "PHIEUTHUHOCPHI" ("SoPhieuDangKy", "MaSv", "SoTienThu", "HinhThucThu", "NguoiThu", "GhiChu", "TrangThai")
       VALUES ($1, $2, $3, $4, $5, $6, 'Thành công')
       RETURNING *`,
      [soPhieuDangKy, MaSv, SoTienThu, HinhThucThu, NguoiThu, GhiChu]
    );

    // Cập nhật tổng tiền đã đóng trong phiếu đăng ký
    await client.query(
      `UPDATE "PHIEUDANGKY" SET 
        "TongTienDaDong" = (
          SELECT COALESCE(SUM("SoTienThu"), 0) FROM "PHIEUTHUHOCPHI" 
          WHERE "SoPhieuDangKy" = $1 AND "TrangThai" = 'Thành công'
        )
       WHERE "SoPhieu" = $1`,
      [soPhieuDangKy]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Tạo phiếu thu thành công',
      data: paymentResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  } finally {
    client.release();
  }
};

// Hủy phiếu thu
const cancelPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Lấy thông tin phiếu thu
    const paymentResult = await client.query(
      'SELECT * FROM "PHIEUTHUHOCPHI" WHERE "SoPhieuThu" = $1',
      [id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu thu'
      });
    }

    const payment = paymentResult.rows[0];

    // Cập nhật trạng thái phiếu thu
    await client.query(
      "UPDATE phieu_thu_hoc_phi SET TrangThai = 'Đã hủy' WHERE SoPhieuThu = $1",
      [id]
    );

    // Cập nhật lại tổng tiền đã đóng trong phiếu đăng ký
    await client.query(
      `UPDATE "PHIEUDANGKY" SET 
        "TongTienDaDong" = (
          SELECT COALESCE(SUM("SoTienThu"), 0) FROM "PHIEUTHUHOCPHI" 
          WHERE "SoPhieuDangKy" = $1 AND "TrangThai" = 'Thành công'
        )
       WHERE "SoPhieu" = $1`,
      [payment.SoPhieuDangKy]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Hủy phiếu thu thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  } finally {
    client.release();
  }
};

// Thống kê thanh toán
const getPaymentStats = async (req, res) => {
  try {
    const { MaHocKy } = req.query;

    let whereClause = "WHERE pthp.TrangThai = 'Thành công'";
    let params = [];

    if (MaHocKy) {
      whereClause += ' AND pdk.MaHocKy = $1';
      params = [MaHocKy];
    }

    // Tổng số phiếu thu
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM "PHIEUTHUHOCPHI" pthp
       JOIN "PHIEUDANGKY" pdk ON pthp."SoPhieuDangKy" = pdk."SoPhieu"
       ${whereClause}`,
      params
    );

    // Tổng tiền đã thu
    const amountResult = await pool.query(
      `SELECT COALESCE(SUM(pthp."SoTienThu"), 0) as total
       FROM "PHIEUTHUHOCPHI" pthp
       JOIN "PHIEUDANGKY" pdk ON pthp."SoPhieuDangKy" = pdk."SoPhieu"
       ${whereClause}`,
      params
    );

    // Thống kê theo hình thức thu
    const methodResult = await pool.query(
      `SELECT pthp."HinhThucThu", COUNT(*) as count, COALESCE(SUM(pthp."SoTienThu"), 0) as total
       FROM "PHIEUTHUHOCPHI" pthp
       JOIN "PHIEUDANGKY" pdk ON pthp."SoPhieuDangKy" = pdk."SoPhieu"
       ${whereClause}
       GROUP BY pthp."HinhThucThu"`,
      params
    );

    // Thống kê theo ngày (7 ngày gần nhất)
    const dailyResult = await pool.query(
      `SELECT DATE(pthp."NgayLap") as date, COUNT(*) as count, COALESCE(SUM(pthp."SoTienThu"), 0) as total
       FROM "PHIEUTHUHOCPHI" pthp
       JOIN "PHIEUDANGKY" pdk ON pthp."SoPhieuDangKy" = pdk."SoPhieu"
       ${whereClause}
       AND pthp."NgayLap" >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(pthp."NgayLap")
       ORDER BY date DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        totalReceipts: parseInt(totalResult.rows[0].count),
        totalAmount: parseFloat(amountResult.rows[0].total),
        byMethod: methodResult.rows.map(r => ({
          HinhThucThu: r.HinhThucThu,
          count: parseInt(r.count),
          total: parseFloat(r.total)
        })),
        byDay: dailyResult.rows.map(r => ({
          date: r.date,
          count: parseInt(r.count),
          total: parseFloat(r.total)
        }))
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  getStudentPayments,
  createPayment,
  cancelPayment,
  getPaymentStats
};
