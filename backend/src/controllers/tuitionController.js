const pool = require('../config/database');

// Lấy tất cả học phí với phân trang và filter
const getAllTuition = async (req, res) => {
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
      if (trang_thai === 'chua_dong') {
        whereClause += ` AND (pdk.tong_tien_da_dong < pdk.tong_tien_phai_dong OR pdk.tong_tien_da_dong IS NULL)`;
      } else if (trang_thai === 'da_dong') {
        whereClause += ` AND pdk.tong_tien_da_dong >= pdk.tong_tien_phai_dong`;
      }
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

    // Lấy danh sách học phí
    const result = await pool.query(
      `SELECT pdk.*, sv.ho_ten, sv.email, hk.ten_hoc_ky, nh.ten_nam_hoc,
       (SELECT COUNT(*) FROM chi_tiet_dang_ky WHERE so_phieu = pdk.so_phieu AND trang_thai = 'Đã đăng ký') as so_mon,
       (SELECT COALESCE(SUM(so_tien_thu), 0) FROM phieu_thu_hoc_phi WHERE so_phieu_dang_ky = pdk.so_phieu AND trang_thai = 'Thành công') as da_thu
       FROM phieu_dang_ky pdk
       JOIN sinh_vien sv ON pdk.ma_sv = sv.ma_sv
       JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
       JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
       ${whereClause}
       ORDER BY pdk.ngay_dang_ky DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const tuitions = result.rows.map(t => ({
      id: t.so_phieu,
      so_phieu: t.so_phieu,
      ma_sv: t.ma_sv,
      student_code: t.ma_sv,
      ho_ten: t.ho_ten,
      student_name: t.ho_ten,
      email: t.email,
      ma_hoc_ky: t.ma_hoc_ky,
      ten_hoc_ky: t.ten_hoc_ky,
      semester_name: t.ten_hoc_ky,
      ten_nam_hoc: t.ten_nam_hoc,
      so_mon: parseInt(t.so_mon) || 0,
      courses_count: parseInt(t.so_mon) || 0,
      tong_tien_phai_dong: parseFloat(t.tong_tien_phai_dong) || 0,
      total_amount: parseFloat(t.tong_tien_phai_dong) || 0,
      tong_tien_da_dong: parseFloat(t.da_thu) || 0,
      paid_amount: parseFloat(t.da_thu) || 0,
      con_no: (parseFloat(t.tong_tien_phai_dong) || 0) - (parseFloat(t.da_thu) || 0),
      remaining: (parseFloat(t.tong_tien_phai_dong) || 0) - (parseFloat(t.da_thu) || 0),
      trang_thai: (parseFloat(t.da_thu) || 0) >= (parseFloat(t.tong_tien_phai_dong) || 0) ? 'Đã đóng đủ' : 'Còn nợ',
      status: (parseFloat(t.da_thu) || 0) >= (parseFloat(t.tong_tien_phai_dong) || 0) ? 'paid' : 'pending'
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
      `SELECT pdk.*, sv.ho_ten, sv.email, sv.so_dien_thoai, hk.ten_hoc_ky, nh.ten_nam_hoc,
       (SELECT COALESCE(SUM(so_tien_thu), 0) FROM phieu_thu_hoc_phi 
        WHERE so_phieu_dang_ky = pdk.so_phieu AND trang_thai = 'Thành công') as da_thu
       FROM phieu_dang_ky pdk
       JOIN sinh_vien sv ON pdk.ma_sv = sv.ma_sv
       JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
       JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
       WHERE pdk.so_phieu = $1`,
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
      `SELECT ctdk.*, l.ma_lop, mh.ma_mon_hoc, mh.ten_mon_hoc, mh.loai_mon
       FROM chi_tiet_dang_ky ctdk
       JOIN lop l ON ctdk.ma_lop = l.ma_lop
       JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
       WHERE ctdk.so_phieu = $1 AND ctdk.trang_thai = 'Đã đăng ký'
       ORDER BY mh.ten_mon_hoc`,
      [id]
    );

    // Lấy lịch sử thanh toán
    const paymentsResult = await pool.query(
      `SELECT * FROM phieu_thu_hoc_phi 
       WHERE so_phieu_dang_ky = $1
       ORDER BY ngay_lap DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: t.so_phieu,
        so_phieu: t.so_phieu,
        ma_sv: t.ma_sv,
        ho_ten: t.ho_ten,
        email: t.email,
        so_dien_thoai: t.so_dien_thoai,
        ma_hoc_ky: t.ma_hoc_ky,
        ten_hoc_ky: t.ten_hoc_ky,
        ten_nam_hoc: t.ten_nam_hoc,
        tong_tien_phai_dong: parseFloat(t.tong_tien_phai_dong) || 0,
        total_amount: parseFloat(t.tong_tien_phai_dong) || 0,
        tong_tien_da_dong: parseFloat(t.da_thu) || 0,
        paid_amount: parseFloat(t.da_thu) || 0,
        con_no: (parseFloat(t.tong_tien_phai_dong) || 0) - (parseFloat(t.da_thu) || 0),
        remaining: (parseFloat(t.tong_tien_phai_dong) || 0) - (parseFloat(t.da_thu) || 0),
        courses: detailsResult.rows.map(c => ({
          ma_mon_hoc: c.ma_mon_hoc,
          ten_mon_hoc: c.ten_mon_hoc,
          so_tin_chi: c.so_tin_chi,
          don_gia: c.don_gia,
          so_tien: c.so_tien,
          loai_dang_ky: c.loai_dang_ky
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
    const { ma_hoc_ky } = req.query;

    let whereClause = `WHERE pdk.ma_sv = $1`;
    let params = [studentId];
    let paramIndex = 2;

    if (ma_hoc_ky) {
      whereClause += ` AND pdk.ma_hoc_ky = $${paramIndex}`;
      params.push(ma_hoc_ky);
    }

    const result = await pool.query(
      `SELECT pdk.*, hk.ten_hoc_ky, nh.ten_nam_hoc,
       (SELECT COALESCE(SUM(so_tien_thu), 0) FROM phieu_thu_hoc_phi 
        WHERE so_phieu_dang_ky = pdk.so_phieu AND trang_thai = 'Thành công') as da_thu
       FROM phieu_dang_ky pdk
       JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
       JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
       ${whereClause}
       ORDER BY pdk.ngay_dang_ky DESC`,
      params
    );

    const tuitions = result.rows.map(t => ({
      id: t.so_phieu,
      so_phieu: t.so_phieu,
      ma_hoc_ky: t.ma_hoc_ky,
      ten_hoc_ky: t.ten_hoc_ky,
      semester_name: t.ten_hoc_ky,
      ten_nam_hoc: t.ten_nam_hoc,
      tong_tien_phai_dong: parseFloat(t.tong_tien_phai_dong) || 0,
      total_amount: parseFloat(t.tong_tien_phai_dong) || 0,
      tong_tien_da_dong: parseFloat(t.da_thu) || 0,
      paid_amount: parseFloat(t.da_thu) || 0,
      con_no: (parseFloat(t.tong_tien_phai_dong) || 0) - (parseFloat(t.da_thu) || 0),
      remaining: (parseFloat(t.tong_tien_phai_dong) || 0) - (parseFloat(t.da_thu) || 0),
      trang_thai: (parseFloat(t.da_thu) || 0) >= (parseFloat(t.tong_tien_phai_dong) || 0) ? 'Đã đóng đủ' : 'Còn nợ',
      status: (parseFloat(t.da_thu) || 0) >= (parseFloat(t.tong_tien_phai_dong) || 0) ? 'paid' : 'pending'
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
    const { ma_sv, ma_hoc_ky } = req.body;

    if (!ma_sv || !ma_hoc_ky) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã sinh viên và học kỳ'
      });
    }

    // Lấy phiếu đăng ký
    const phieuResult = await pool.query(
      'SELECT so_phieu FROM phieu_dang_ky WHERE ma_sv = $1 AND ma_hoc_ky = $2',
      [ma_sv, ma_hoc_ky]
    );

    if (phieuResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sinh viên chưa đăng ký môn học trong học kỳ này'
      });
    }

    const so_phieu = phieuResult.rows[0].so_phieu;

    // Tính lại tổng tiền
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(so_tien), 0) as total
       FROM chi_tiet_dang_ky
       WHERE so_phieu = $1 AND trang_thai = 'Đã đăng ký'`,
      [so_phieu]
    );

    const total = parseFloat(totalResult.rows[0].total);

    // Cập nhật phiếu đăng ký
    await pool.query(
      'UPDATE phieu_dang_ky SET tong_tien_phai_dong = $1 WHERE so_phieu = $2',
      [total, so_phieu]
    );

    res.json({
      success: true,
      message: 'Tính học phí thành công',
      data: {
        so_phieu,
        tong_tien_phai_dong: total
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
    const { ma_hoc_ky } = req.query;

    let whereClause = '';
    let params = [];

    if (ma_hoc_ky) {
      whereClause = 'WHERE pdk.ma_hoc_ky = $1';
      params = [ma_hoc_ky];
    }

    // Tổng tiền phải thu
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(tong_tien_phai_dong), 0) as total
       FROM phieu_dang_ky pdk ${whereClause}`,
      params
    );

    // Tổng tiền đã thu
    const paidResult = await pool.query(
      `SELECT COALESCE(SUM(pthp.so_tien_thu), 0) as total
       FROM phieu_thu_hoc_phi pthp
       JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk.so_phieu
       WHERE pthp.trang_thai = 'Thành công'
       ${ma_hoc_ky ? 'AND pdk.ma_hoc_ky = $1' : ''}`,
      params
    );

    // Số sinh viên đã đóng đủ
    const paidStudentsResult = await pool.query(
      `SELECT COUNT(DISTINCT pdk.ma_sv) as count
       FROM phieu_dang_ky pdk
       WHERE pdk.tong_tien_da_dong >= pdk.tong_tien_phai_dong
       ${ma_hoc_ky ? 'AND pdk.ma_hoc_ky = $1' : ''}`,
      params
    );

    // Số sinh viên còn nợ
    const owingStudentsResult = await pool.query(
      `SELECT COUNT(DISTINCT pdk.ma_sv) as count
       FROM phieu_dang_ky pdk
       WHERE (pdk.tong_tien_da_dong < pdk.tong_tien_phai_dong OR pdk.tong_tien_da_dong IS NULL)
       AND pdk.tong_tien_phai_dong > 0
       ${ma_hoc_ky ? 'AND pdk.ma_hoc_ky = $1' : ''}`,
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
    const result = await pool.query('SELECT * FROM don_gia_tin_chi ORDER BY loai_mon, loai_hoc');
    
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
