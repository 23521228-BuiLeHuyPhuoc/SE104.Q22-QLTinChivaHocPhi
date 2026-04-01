const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Lấy danh sách sinh viên với phân trang và filter
const getAllStudents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      MaNganh,
      TrangThai,
      sortBy = 'MaSv', 
      sortOrder = 'ASC' 
    } = req.query;
    const offset = (page - 1) * limit;

    const validSortFields = ['MaSv', 'HoTen', 'Email', 'nam_nhap_hoc', 'NgayTao'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'MaSv';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let whereClause = `WHERE (sv."MaSv" ILIKE $1 OR sv."HoTen" ILIKE $1 OR sv."Email" ILIKE $1)`;
    let params = [`%${search}%`];
    let paramIndex = 2;

    if (MaNganh) {
      whereClause += ` AND sv."MaNganh" = ${paramIndex}`;
      params.push(MaNganh);
      paramIndex++;
    }

    if (TrangThai) {
      whereClause += ` AND sv."TrangThai" = ${paramIndex}`;
      params.push(TrangThai);
      paramIndex++;
    }

    // Đếm tổng
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM "SINHVIEN" sv ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Lấy danh sách sinh viên
    const result = await pool.query(
      `SELECT sv.*, nh."TenNganh", kh."TenKhoa",
       h.ten_huyen, t."TenTinh"
       FROM "SINHVIEN" sv
       LEFT JOIN "NGANHHOC" nh ON sv."MaNganh" = nh."MaNganh"
       LEFT JOIN "KHOA" kh ON nh."MaKhoa" = kh."MaKhoa"
       LEFT JOIN "HUYEN" h ON sv.ma_huyen = h.ma_huyen
       LEFT JOIN "TINH" t ON h."MaTinh" = t."MaTinh"
       ${whereClause}
       ORDER BY sv.${sortField} ${order}
       LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Map dữ liệu để tương thích với frontend
    const students = result.rows.map(sv => ({
      id: sv.MaSv,
      MaSv: sv.MaSv,
      student_code: sv.MaSv,
      HoTen: sv.HoTen,
      full_name: sv.HoTen,
      NgaySinh: sv.NgaySinh,
      GioiTinh: sv.GioiTinh,
      Email: sv.Email,
      so_dien_thoai: sv.so_dien_thoai,
      DiaChi: sv.DiaChi,
      MaNganh: sv.MaNganh,
      TenNganh: sv.TenNganh,
      TenKhoa: sv.TenKhoa,
      ten_huyen: sv.ten_huyen,
      TenTinh: sv.TenTinh,
      nam_nhap_hoc: sv.nam_nhap_hoc,
      TrangThai: sv.TrangThai,
      avatar: sv.avatar,
      created_at: sv.NgayTao
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
      `SELECT sv.*, nh."TenNganh", kh."TenKhoa",
       h.ten_huyen, t."TenTinh"
       FROM "SINHVIEN" sv
       LEFT JOIN "NGANHHOC" nh ON sv."MaNganh" = nh."MaNganh"
       LEFT JOIN "KHOA" kh ON nh."MaKhoa" = kh."MaKhoa"
       LEFT JOIN "HUYEN" h ON sv.ma_huyen = h.ma_huyen
       LEFT JOIN "TINH" t ON h."MaTinh" = t."MaTinh"
       WHERE sv."MaSv" = $1`,
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
        id: sv.MaSv,
        MaSv: sv.MaSv,
        student_code: sv.MaSv,
        HoTen: sv.HoTen,
        full_name: sv.HoTen,
        NgaySinh: sv.NgaySinh,
        GioiTinh: sv.GioiTinh,
        Email: sv.Email,
        so_dien_thoai: sv.so_dien_thoai,
        DiaChi: sv.DiaChi,
        MaNganh: sv.MaNganh,
        TenNganh: sv.TenNganh,
        TenKhoa: sv.TenKhoa,
        ten_huyen: sv.ten_huyen,
        TenTinh: sv.TenTinh,
        nam_nhap_hoc: sv.nam_nhap_hoc,
        TrangThai: sv.TrangThai,
        avatar: sv.avatar,
        created_at: sv.NgayTao
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
      MaSv, 
      HoTen, 
      NgaySinh, 
      GioiTinh, 
      Email, 
      so_dien_thoai, 
      DiaChi, 
      ma_huyen, 
      MaNganh, 
      nam_nhap_hoc,
      password = '123456' // Mật khẩu mặc định
    } = req.body;

    if (!MaSv || !HoTen || !MaNganh) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc (Mã SV, Họ tên, Ngành)'
      });
    }

    // Kiểm tra mã sinh viên đã tồn tại
    const existingStudent = await client.query(
      'SELECT "MaSv" FROM "SINHVIEN" WHERE "MaSv" = $1',
      [MaSv]
    );

    if (existingStudent.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã sinh viên đã tồn tại'
      });
    }

    // Kiểm tra Email đã tồn tại
    if (Email) {
      const existingEmail = await client.query(
        'SELECT "MaSv" FROM "SINHVIEN" WHERE "Email" = $1',
        [Email]
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
      'INSERT INTO "TAIKHOAN" ("TenDangNhap", "MatKhau", "Role") VALUES ($1, $2, $3) RETURNING "MaTaiKhoan"',
      [MaSv, hashedPassword, 'student']
    );
    const MaTaiKhoan = accountResult.rows[0].MaTaiKhoan;

    // Tạo sinh viên
    const studentResult = await client.query(
      `INSERT INTO "SINHVIEN" ("MaSv", "HoTen", "NgaySinh", "GioiTinh", "Email", so_dien_thoai, "DiaChi", ma_huyen, "MaNganh", nam_nhap_hoc, "MaTaiKhoan")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [MaSv, HoTen, NgaySinh, GioiTinh, Email, so_dien_thoai, DiaChi, ma_huyen, MaNganh, nam_nhap_hoc, MaTaiKhoan]
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
      HoTen, 
      NgaySinh, 
      GioiTinh, 
      Email, 
      so_dien_thoai, 
      DiaChi, 
      ma_huyen, 
      MaNganh, 
      nam_nhap_hoc,
      TrangThai,
      avatar
    } = req.body;

    // Kiểm tra sinh viên tồn tại
    const existingStudent = await pool.query(
      'SELECT "MaSv" FROM "SINHVIEN" WHERE "MaSv" = $1',
      [id]
    );

    if (existingStudent.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    // Kiểm tra Email trùng (nếu có thay đổi)
    if (Email) {
      const existingEmail = await pool.query(
        'SELECT "MaSv" FROM "SINHVIEN" WHERE "Email" = $1 AND "MaSv" != $2',
        [Email, id]
      );
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }
    }

    const result = await pool.query(
      `UPDATE "SINHVIEN" SET 
        "HoTen" = COALESCE($1, "HoTen"),
        "NgaySinh" = COALESCE($2, "NgaySinh"),
        "GioiTinh" = COALESCE($3, "GioiTinh"),
        "Email" = COALESCE($4, "Email"),
        so_dien_thoai = COALESCE($5, so_dien_thoai),
        "DiaChi" = COALESCE($6, "DiaChi"),
        ma_huyen = COALESCE($7, ma_huyen),
        "MaNganh" = COALESCE($8, "MaNganh"),
        nam_nhap_hoc = COALESCE($9, nam_nhap_hoc),
        "TrangThai" = COALESCE($10, "TrangThai"),
        avatar = COALESCE($11, avatar)
       WHERE "MaSv" = $12
       RETURNING *`,
      [HoTen, NgaySinh, GioiTinh, Email, so_dien_thoai, DiaChi, ma_huyen, MaNganh, nam_nhap_hoc, TrangThai, avatar, id]
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

    // Kiểm tra sinh viên tồn tại và lấy MaTaiKhoan
    const existingStudent = await client.query(
      'SELECT "MaSv", "MaTaiKhoan" FROM "SINHVIEN" WHERE "MaSv" = $1',
      [id]
    );

    if (existingStudent.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    const MaTaiKhoan = existingStudent.rows[0].MaTaiKhoan;

    await client.query('BEGIN');

    // Xóa sinh viên (sẽ cascade xóa các bản ghi liên quan)
    await client.query('DELETE FROM "SINHVIEN" WHERE "MaSv" = $1', [id]);

    // Xóa tài khoản
    if (MaTaiKhoan) {
      await client.query('DELETE FROM "TAIKHOAN" WHERE "MaTaiKhoan" = $1', [MaTaiKhoan]);
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
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM "SINHVIEN"');
    
    // Số sinh viên theo trạng thái
    const statusResult = await pool.query(`
      SELECT "TrangThai", COUNT(*) as count 
      FROM "SINHVIEN" 
      GROUP BY "TrangThai"
    `);

    // Số sinh viên theo ngành
    const majorResult = await pool.query(`
      SELECT nh."TenNganh", COUNT(sv."MaSv") as count 
      FROM "SINHVIEN" sv
      JOIN "NGANHHOC" nh ON sv."MaNganh" = nh."MaNganh"
      GROUP BY nh."TenNganh"
      ORDER BY count DESC
      LIMIT 5
    `);

    // Số sinh viên theo khoa
    const facultyResult = await pool.query(`
      SELECT kh."TenKhoa", COUNT(sv."MaSv") as count 
      FROM "SINHVIEN" sv
      JOIN "NGANHHOC" nh ON sv."MaNganh" = nh."MaNganh"
      JOIN "KHOA" kh ON nh."MaKhoa" = kh."MaKhoa"
      GROUP BY kh."TenKhoa"
      ORDER BY count DESC
    `);

    // Số sinh viên theo năm nhập học
    const yearResult = await pool.query(`
      SELECT EXTRACT(YEAR FROM "NgayNhapHoc")::integer as nam_nhap_hoc, COUNT(*) as count 
      FROM "SINHVIEN" 
      WHERE "NgayNhapHoc" IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM "NgayNhapHoc")
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
      SELECT nh.*, kh."TenKhoa"
      FROM "NGANHHOC" nh
      LEFT JOIN "KHOA" kh ON nh."MaKhoa" = kh."MaKhoa"
      ORDER BY kh."TenKhoa", nh."TenNganh"
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
    const result = await pool.query('SELECT * FROM "TINH" ORDER BY "TenTinh"');
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
      'SELECT * FROM "HUYEN" WHERE "MaTinh" = $1 ORDER BY ten_huyen',
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
