const pool = require('../config/database');

// Lấy tất cả phiếu thu với phân trang và filter
const getAllPayments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      ma_hoc_ky,
      hinh_thuc_thu,
      trang_thai
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE (sv.ma_sv ILIKE $1 OR sv.ho_ten ILIKE $1 OR pthp.so_phieu_thu::text ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (ma_hoc_ky) {
      whereClause += ` AND pdk.ma_hoc_ky = $${paramIndex}`;
      params.push(ma_hoc_ky);
      paramIndex++;
    }

    if (hinh_thuc_thu) {
      whereClause += ` AND pthp.hinh_thuc_thu = $${paramIndex}`;
      params.push(hinh_thuc_thu);
      paramIndex++;
    }

    if (trang_thai) {
      whereClause += ` AND pthp.trang_thai = $${paramIndex}`;
      params.push(trang_thai);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM phieu_thu_hoc_phi pthp
       JOIN sinh_vien sv ON pthp.ma_sv = sv.ma_sv
       JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk.so_phieu
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách phiếu thu
    const result = await pool.query(
      `SELECT pthp.*, sv.ho_ten, sv.email, hk.ten_hoc_ky, nh.ten_nam_hoc, pdk.ma_hoc_ky
       FROM phieu_thu_hoc_phi pthp
       JOIN sinh_vien sv ON pthp.ma_sv = sv.ma_sv
       JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk.so_phieu
       JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
       JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
       ${whereClause}
       ORDER BY pthp.ngay_lap DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const payments = result.rows.map(p => ({
      id: p.so_phieu_thu,
      so_phieu_thu: p.so_phieu_thu,
      receipt_number: p.so_phieu_thu,
      ma_sv: p.ma_sv,
      student_code: p.ma_sv,
      ho_ten: p.ho_ten,
      student_name: p.ho_ten,
      email: p.email,
      ma_hoc_ky: p.ma_hoc_ky,
      ten_hoc_ky: p.ten_hoc_ky,
      semester_name: p.ten_hoc_ky,
      ten_nam_hoc: p.ten_nam_hoc,
      so_tien_thu: parseFloat(p.so_tien_thu) || 0,
      amount: parseFloat(p.so_tien_thu) || 0,
      hinh_thuc_thu: p.hinh_thuc_thu,
      payment_method: p.hinh_thuc_thu,
      ngay_lap: p.ngay_lap,
      payment_date: p.ngay_lap,
      ghi_chu: p.ghi_chu,
      note: p.ghi_chu,
      nguoi_thu: p.nguoi_thu,
      collected_by: p.nguoi_thu,
      trang_thai: p.trang_thai,
      status: p.trang_thai
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
      `SELECT pthp.*, sv.ho_ten, sv.email, sv.so_dien_thoai, hk.ten_hoc_ky, nh.ten_nam_hoc, pdk.ma_hoc_ky
       FROM phieu_thu_hoc_phi pthp
       JOIN sinh_vien sv ON pthp.ma_sv = sv.ma_sv
       JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk.so_phieu
       JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
       JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
       WHERE pthp.so_phieu_thu = $1`,
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
        id: p.so_phieu_thu,
        so_phieu_thu: p.so_phieu_thu,
        ma_sv: p.ma_sv,
        ho_ten: p.ho_ten,
        email: p.email,
        so_dien_thoai: p.so_dien_thoai,
        ma_hoc_ky: p.ma_hoc_ky,
        ten_hoc_ky: p.ten_hoc_ky,
        ten_nam_hoc: p.ten_nam_hoc,
        so_tien_thu: parseFloat(p.so_tien_thu) || 0,
        amount: parseFloat(p.so_tien_thu) || 0,
        hinh_thuc_thu: p.hinh_thuc_thu,
        ngay_lap: p.ngay_lap,
        ghi_chu: p.ghi_chu,
        nguoi_thu: p.nguoi_thu,
        trang_thai: p.trang_thai
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
      `SELECT pthp.*, hk.ten_hoc_ky, nh.ten_nam_hoc, pdk.ma_hoc_ky
       FROM phieu_thu_hoc_phi pthp
       JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk.so_phieu
       JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
       JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
       WHERE pthp.ma_sv = $1
       ORDER BY pthp.ngay_lap DESC`,
      [studentId]
    );

    const payments = result.rows.map(p => ({
      id: p.so_phieu_thu,
      so_phieu_thu: p.so_phieu_thu,
      ma_hoc_ky: p.ma_hoc_ky,
      ten_hoc_ky: p.ten_hoc_ky,
      semester_name: p.ten_hoc_ky,
      ten_nam_hoc: p.ten_nam_hoc,
      so_tien_thu: parseFloat(p.so_tien_thu) || 0,
      amount: parseFloat(p.so_tien_thu) || 0,
      hinh_thuc_thu: p.hinh_thuc_thu,
      payment_method: p.hinh_thuc_thu,
      ngay_lap: p.ngay_lap,
      payment_date: p.ngay_lap,
      ghi_chu: p.ghi_chu,
      note: p.ghi_chu,
      trang_thai: p.trang_thai,
      status: p.trang_thai
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
      ma_sv, 
      ma_hoc_ky, 
      so_tien_thu, 
      hinh_thuc_thu = 'Tiền mặt',
      ghi_chu
    } = req.body;
    const nguoi_thu = req.user?.ho_ten || 'Admin';

    if (!ma_sv || !ma_hoc_ky || !so_tien_thu) {
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

    // Kiểm tra phiếu đăng ký tồn tại
    const phieuResult = await client.query(
      'SELECT so_phieu, tong_tien_phai_dong, tong_tien_da_dong FROM phieu_dang_ky WHERE ma_sv = $1 AND ma_hoc_ky = $2',
      [ma_sv, ma_hoc_ky]
    );

    if (phieuResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Sinh viên chưa đăng ký môn học trong học kỳ này'
      });
    }

    const soPhieuDangKy = phieuResult.rows[0].so_phieu;

    // Tạo phiếu thu
    const paymentResult = await client.query(
      `INSERT INTO phieu_thu_hoc_phi (so_phieu_dang_ky, ma_sv, so_tien_thu, hinh_thuc_thu, nguoi_thu, ghi_chu, trang_thai)
       VALUES ($1, $2, $3, $4, $5, $6, 'Thành công')
       RETURNING *`,
      [soPhieuDangKy, ma_sv, so_tien_thu, hinh_thuc_thu, nguoi_thu, ghi_chu]
    );

    // Cập nhật tổng tiền đã đóng trong phiếu đăng ký
    await client.query(
      `UPDATE phieu_dang_ky SET 
        tong_tien_da_dong = (
          SELECT COALESCE(SUM(so_tien_thu), 0) FROM phieu_thu_hoc_phi 
          WHERE so_phieu_dang_ky = $1 AND trang_thai = 'Thành công'
        )
       WHERE so_phieu = $1`,
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
      'SELECT * FROM phieu_thu_hoc_phi WHERE so_phieu_thu = $1',
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
      "UPDATE phieu_thu_hoc_phi SET trang_thai = 'Đã hủy' WHERE so_phieu_thu = $1",
      [id]
    );

    // Cập nhật lại tổng tiền đã đóng trong phiếu đăng ký
    await client.query(
      `UPDATE phieu_dang_ky SET 
        tong_tien_da_dong = (
          SELECT COALESCE(SUM(so_tien_thu), 0) FROM phieu_thu_hoc_phi 
          WHERE so_phieu_dang_ky = $1 AND trang_thai = 'Thành công'
        )
       WHERE so_phieu = $1`,
      [payment.so_phieu_dang_ky]
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
    const { ma_hoc_ky } = req.query;

    let whereClause = "WHERE pthp.trang_thai = 'Thành công'";
    let params = [];

    if (ma_hoc_ky) {
      whereClause += ' AND pdk.ma_hoc_ky = $1';
      params = [ma_hoc_ky];
    }

    // Tổng số phiếu thu
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM phieu_thu_hoc_phi pthp
       JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk.so_phieu
       ${whereClause}`,
      params
    );

    // Tổng tiền đã thu
    const amountResult = await pool.query(
      `SELECT COALESCE(SUM(pthp.so_tien_thu), 0) as total
       FROM phieu_thu_hoc_phi pthp
       JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk.so_phieu
       ${whereClause}`,
      params
    );

    // Thống kê theo hình thức thu
    const methodResult = await pool.query(
      `SELECT pthp.hinh_thuc_thu, COUNT(*) as count, COALESCE(SUM(pthp.so_tien_thu), 0) as total
       FROM phieu_thu_hoc_phi pthp
       JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk.so_phieu
       ${whereClause}
       GROUP BY pthp.hinh_thuc_thu`,
      params
    );

    // Thống kê theo ngày (7 ngày gần nhất)
    const dailyResult = await pool.query(
      `SELECT DATE(pthp.ngay_lap) as date, COUNT(*) as count, COALESCE(SUM(pthp.so_tien_thu), 0) as total
       FROM phieu_thu_hoc_phi pthp
       JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk.so_phieu
       ${whereClause}
       AND pthp.ngay_lap >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(pthp.ngay_lap)
       ORDER BY date DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        totalReceipts: parseInt(totalResult.rows[0].count),
        totalAmount: parseFloat(amountResult.rows[0].total),
        byMethod: methodResult.rows.map(r => ({
          hinh_thuc_thu: r.hinh_thuc_thu,
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
