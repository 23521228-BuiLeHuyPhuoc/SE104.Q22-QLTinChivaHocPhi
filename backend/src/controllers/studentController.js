const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Lấy danh sách sinh viên với phân trang và filter
const getAllStudents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      ma_nganh,
      trang_thai,
      sortBy = 'ma_sv', 
      sortOrder = 'ASC' 
    } = req.query;
    const offset = (page - 1) * limit;

    const validSortFields = ['ma_sv', 'ho_ten', 'email', 'nam_nhap_hoc', 'ngay_tao'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'ma_sv';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let whereClause = `WHERE (sv.ma_sv ILIKE $1 OR sv.ho_ten ILIKE $1 OR sv.email ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (ma_nganh) {
      whereClause += ` AND sv.ma_nganh = $${paramIndex}`;
      params.push(ma_nganh);
      paramIndex++;
    }

    if (trang_thai) {
      whereClause += ` AND sv.trang_thai = $${paramIndex}`;
      params.push(trang_thai);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sinh_vien sv ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách sinh viên
    const result = await pool.query(
      `SELECT sv.*, nh.ten_nganh, kh.ten_khoa,
       h.ten_huyen, t.ten_tinh
       FROM sinh_vien sv
       LEFT JOIN nganh_hoc nh ON sv.ma_nganh = nh.ma_nganh
       LEFT JOIN khoa kh ON nh.ma_khoa = kh.ma_khoa
       LEFT JOIN huyen h ON sv.ma_huyen = h.ma_huyen
       LEFT JOIN tinh t ON h.ma_tinh = t.ma_tinh
       ${whereClause}
       ORDER BY sv.${sortField} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Map dữ liệu để tương thích với frontend
    const students = result.rows.map(sv => ({
      id: sv.ma_sv,
      ma_sv: sv.ma_sv,
      student_code: sv.ma_sv,
      ho_ten: sv.ho_ten,
      full_name: sv.ho_ten,
      ngay_sinh: sv.ngay_sinh,
      gioi_tinh: sv.gioi_tinh,
      email: sv.email,
      so_dien_thoai: sv.so_dien_thoai,
      dia_chi: sv.dia_chi,
      ma_nganh: sv.ma_nganh,
      ten_nganh: sv.ten_nganh,
      ten_khoa: sv.ten_khoa,
      ten_huyen: sv.ten_huyen,
      ten_tinh: sv.ten_tinh,
      nam_nhap_hoc: sv.nam_nhap_hoc,
      trang_thai: sv.trang_thai,
      avatar: sv.avatar,
      created_at: sv.ngay_tao
    }));

    res.json({
      success: true,
      data: students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy thông tin sinh viên theo ID
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT sv.*, nh.ten_nganh, kh.ten_khoa,
       h.ten_huyen, t.ten_tinh
       FROM sinh_vien sv
       LEFT JOIN nganh_hoc nh ON sv.ma_nganh = nh.ma_nganh
       LEFT JOIN khoa kh ON nh.ma_khoa = kh.ma_khoa
       LEFT JOIN huyen h ON sv.ma_huyen = h.ma_huyen
       LEFT JOIN tinh t ON h.ma_tinh = t.ma_tinh
       WHERE sv.ma_sv = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    const sv = result.rows[0];
    res.json({
      success: true,
      data: {
        id: sv.ma_sv,
        ma_sv: sv.ma_sv,
        student_code: sv.ma_sv,
        ho_ten: sv.ho_ten,
        full_name: sv.ho_ten,
        ngay_sinh: sv.ngay_sinh,
        gioi_tinh: sv.gioi_tinh,
        email: sv.email,
        so_dien_thoai: sv.so_dien_thoai,
        dia_chi: sv.dia_chi,
        ma_nganh: sv.ma_nganh,
        ten_nganh: sv.ten_nganh,
        ten_khoa: sv.ten_khoa,
        ten_huyen: sv.ten_huyen,
        ten_tinh: sv.ten_tinh,
        nam_nhap_hoc: sv.nam_nhap_hoc,
        trang_thai: sv.trang_thai,
        avatar: sv.avatar,
        created_at: sv.ngay_tao
      }
    });
  } catch (error) {
    console.error('Get student by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Tạo sinh viên mới
const createStudent = async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      ma_sv, 
      ho_ten, 
      ngay_sinh, 
      gioi_tinh, 
      email, 
      so_dien_thoai, 
      dia_chi, 
      ma_huyen, 
      ma_nganh, 
      nam_nhap_hoc,
      password = '123456' // Mật khẩu mặc định
    } = req.body;

    if (!ma_sv || !ho_ten || !ma_nganh) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc (Mã SV, Họ tên, Ngành)'
      });
    }

    // Kiểm tra mã sinh viên đã tồn tại
    const existingStudent = await client.query(
      'SELECT ma_sv FROM sinh_vien WHERE ma_sv = $1',
      [ma_sv]
    );

    if (existingStudent.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã sinh viên đã tồn tại'
      });
    }

    // Kiểm tra email đã tồn tại
    if (email) {
      const existingEmail = await client.query(
        'SELECT ma_sv FROM sinh_vien WHERE email = $1',
        [email]
      );
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }
    }

    await client.query('BEGIN');

    // Tạo tài khoản
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const accountResult = await client.query(
      'INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, role) VALUES ($1, $2, $3) RETURNING ma_tai_khoan',
      [ma_sv, hashedPassword, 'student']
    );
    const ma_tai_khoan = accountResult.rows[0].ma_tai_khoan;

    // Tạo sinh viên
    const studentResult = await client.query(
      `INSERT INTO sinh_vien (ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, so_dien_thoai, dia_chi, ma_huyen, ma_nganh, nam_nhap_hoc, ma_tai_khoan)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, so_dien_thoai, dia_chi, ma_huyen, ma_nganh, nam_nhap_hoc, ma_tai_khoan]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Tạo sinh viên thành công',
      data: studentResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  } finally {
    client.release();
  }
};

// Cập nhật sinh viên
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      ho_ten, 
      ngay_sinh, 
      gioi_tinh, 
      email, 
      so_dien_thoai, 
      dia_chi, 
      ma_huyen, 
      ma_nganh, 
      nam_nhap_hoc,
      trang_thai,
      avatar
    } = req.body;

    // Kiểm tra sinh viên tồn tại
    const existingStudent = await pool.query(
      'SELECT ma_sv FROM sinh_vien WHERE ma_sv = $1',
      [id]
    );

    if (existingStudent.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    // Kiểm tra email trùng (nếu có thay đổi)
    if (email) {
      const existingEmail = await pool.query(
        'SELECT ma_sv FROM sinh_vien WHERE email = $1 AND ma_sv != $2',
        [email, id]
      );
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }
    }

    const result = await pool.query(
      `UPDATE sinh_vien SET 
        ho_ten = COALESCE($1, ho_ten),
        ngay_sinh = COALESCE($2, ngay_sinh),
        gioi_tinh = COALESCE($3, gioi_tinh),
        email = COALESCE($4, email),
        so_dien_thoai = COALESCE($5, so_dien_thoai),
        dia_chi = COALESCE($6, dia_chi),
        ma_huyen = COALESCE($7, ma_huyen),
        ma_nganh = COALESCE($8, ma_nganh),
        nam_nhap_hoc = COALESCE($9, nam_nhap_hoc),
        trang_thai = COALESCE($10, trang_thai),
        avatar = COALESCE($11, avatar)
       WHERE ma_sv = $12
       RETURNING *`,
      [ho_ten, ngay_sinh, gioi_tinh, email, so_dien_thoai, dia_chi, ma_huyen, ma_nganh, nam_nhap_hoc, trang_thai, avatar, id]
    );

    res.json({
      success: true,
      message: 'Cập nhật sinh viên thành công',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Xóa sinh viên
const deleteStudent = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Kiểm tra sinh viên tồn tại và lấy ma_tai_khoan
    const existingStudent = await client.query(
      'SELECT ma_sv, ma_tai_khoan FROM sinh_vien WHERE ma_sv = $1',
      [id]
    );

    if (existingStudent.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    const ma_tai_khoan = existingStudent.rows[0].ma_tai_khoan;

    await client.query('BEGIN');

    // Xóa sinh viên (sẽ cascade xóa các bản ghi liên quan)
    await client.query('DELETE FROM sinh_vien WHERE ma_sv = $1', [id]);

    // Xóa tài khoản
    if (ma_tai_khoan) {
      await client.query('DELETE FROM tai_khoan WHERE ma_tai_khoan = $1', [ma_tai_khoan]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Xóa sinh viên thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  } finally {
    client.release();
  }
};

// Thống kê sinh viên
const getStudentStats = async (req, res) => {
  try {
    // Tổng số sinh viên
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM sinh_vien');
    
    // Số sinh viên theo trạng thái
    const statusResult = await pool.query(`
      SELECT trang_thai, COUNT(*) as count 
      FROM sinh_vien 
      GROUP BY trang_thai
    `);

    // Số sinh viên theo ngành
    const majorResult = await pool.query(`
      SELECT nh.ten_nganh, COUNT(sv.ma_sv) as count 
      FROM sinh_vien sv
      JOIN nganh_hoc nh ON sv.ma_nganh = nh.ma_nganh
      GROUP BY nh.ten_nganh
      ORDER BY count DESC
      LIMIT 5
    `);

    // Số sinh viên theo khoa
    const facultyResult = await pool.query(`
      SELECT kh.ten_khoa, COUNT(sv.ma_sv) as count 
      FROM sinh_vien sv
      JOIN nganh_hoc nh ON sv.ma_nganh = nh.ma_nganh
      JOIN khoa kh ON nh.ma_khoa = kh.ma_khoa
      GROUP BY kh.ten_khoa
      ORDER BY count DESC
    `);

    // Số sinh viên theo năm nhập học
    const yearResult = await pool.query(`
      SELECT EXTRACT(YEAR FROM ngay_nhap_hoc)::integer as nam_nhap_hoc, COUNT(*) as count 
      FROM sinh_vien 
      WHERE ngay_nhap_hoc IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM ngay_nhap_hoc)
      ORDER BY nam_nhap_hoc DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        byStatus: statusResult.rows,
        byMajor: majorResult.rows,
        byFaculty: facultyResult.rows,
        byYear: yearResult.rows
      }
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy danh sách ngành học
const getMajors = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT nh.*, kh.ten_khoa
      FROM nganh_hoc nh
      LEFT JOIN khoa kh ON nh.ma_khoa = kh.ma_khoa
      ORDER BY kh.ten_khoa, nh.ten_nganh
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get majors error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy danh sách tỉnh/thành phố
const getProvinces = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tinh ORDER BY ten_tinh');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get provinces error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

// Lấy danh sách quận/huyện theo tỉnh
const getDistrictsByProvince = async (req, res) => {
  try {
    const { provinceId } = req.params;
    const result = await pool.query(
      'SELECT * FROM huyen WHERE ma_tinh = $1 ORDER BY ten_huyen',
      [provinceId]
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get districts error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats,
  getMajors,
  getProvinces,
  getDistrictsByProvince
};
