const prisma = require('../config/database');
const { formatStudent, formatStudentList } = require('../models/studentModel');

const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', MaNganh, TrangThai, sortBy = 'MaSv', sortOrder = 'asc' } = req.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (search) { where.OR = [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }, { Email: { contains: search, mode: 'insensitive' } }]; }
    if (MaNganh) where.MaNganh = MaNganh;
    if (TrangThai) where.TrangThai = TrangThai;

    const validSort = ['MaSv', 'HoTen', 'NgayTao'];
    const orderField = validSort.includes(sortBy) ? sortBy : 'MaSv';

    const [rows, total] = await Promise.all([
      prisma.SINHVIEN.findMany({ where, skip, take: parseInt(limit), orderBy: { [orderField]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' }, include: { NGANHHOC: { include: { KHOA: true } }, PHUONGXA: { include: { TINH: true } }, DANTOC: true } }),
      prisma.SINHVIEN.count({ where })
    ]);
    res.json({ success: true, data: formatStudentList(rows), pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { console.error('Get all students error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getStudentById = async (req, res) => {
  try {
    const sv = await prisma.SINHVIEN.findUnique({ where: { MaSv: req.params.id }, include: { NGANHHOC: { include: { KHOA: true } }, PHUONGXA: { include: { TINH: true } }, DANTOC: true } });
    if (!sv) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    res.json({ success: true, data: formatStudent(sv) });
  } catch (error) { console.error('Get student by ID error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const createStudent = async (req, res) => {
  try {
    const { MaSv, HoTen, NgaySinh, GioiTinh, MaPhuongXa, MaNganh, Email, Sdt, DiaChiLienHe, MaDanToc, Cccd, password = '123456' } = req.body;
    if (!MaSv || !HoTen || !NgaySinh || !GioiTinh || !MaPhuongXa || !MaNganh) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });

    const existing = await prisma.SINHVIEN.findUnique({ where: { MaSv } });
    if (existing) return res.status(400).json({ success: false, message: 'Mã sinh viên đã tồn tại' });

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.TAIKHOAN.create({ data: { TenDangNhap: MaSv, MatKhau: hashed, Role: 'student', MaNhom: 'SINHVIEN' } });
      const student = await tx.SINHVIEN.create({ data: { MaSv, HoTen, NgaySinh: new Date(NgaySinh), GioiTinh, Cccd, MaPhuongXa, MaNganh, Email, Sdt, DiaChiLienHe, MaDanToc, MaTaiKhoan: account.MaTaiKhoan } });
      return student;
    });
    res.status(201).json({ success: true, message: 'Tạo sinh viên thành công', data: result });
  } catch (error) { console.error('Create student error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const updateStudent = async (req, res) => {
  try {
    const existing = await prisma.SINHVIEN.findUnique({ where: { MaSv: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });

    const { HoTen, NgaySinh, GioiTinh, Email, Sdt, DiaChiLienHe, MaPhuongXa, MaDanToc, MaNganh, TrangThai, AnhDaiDien, Cccd } = req.body;
    const data = {};
    if (HoTen) data.HoTen = HoTen;
    if (NgaySinh) data.NgaySinh = new Date(NgaySinh);
    if (GioiTinh) data.GioiTinh = GioiTinh;
    if (Cccd !== undefined) data.Cccd = Cccd;
    if (Email) data.Email = Email;
    if (Sdt) data.Sdt = Sdt;
    if (DiaChiLienHe) data.DiaChiLienHe = DiaChiLienHe;
    if (MaPhuongXa) data.MaPhuongXa = MaPhuongXa;
    if (MaDanToc) data.MaDanToc = MaDanToc;
    if (MaNganh) data.MaNganh = MaNganh;
    if (TrangThai) data.TrangThai = TrangThai;
    if (AnhDaiDien) data.AnhDaiDien = AnhDaiDien;
    data.NgayCapNhat = new Date();

    const updated = await prisma.SINHVIEN.update({ where: { MaSv: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật sinh viên thành công', data: updated });
  } catch (error) { console.error('Update student error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const deleteStudent = async (req, res) => {
  try {
    const existing = await prisma.SINHVIEN.findUnique({ where: { MaSv: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    await prisma.$transaction(async (tx) => {
      await tx.SINHVIEN.delete({ where: { MaSv: req.params.id } });
      if (existing.MaTaiKhoan) await tx.TAIKHOAN.delete({ where: { MaTaiKhoan: existing.MaTaiKhoan } });
    });
    res.json({ success: true, message: 'Xóa sinh viên thành công' });
  } catch (error) { console.error('Delete student error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getStudentStats = async (req, res) => {
  try {
    const [total, byStatus] = await Promise.all([
      prisma.SINHVIEN.count(),
      prisma.SINHVIEN.groupBy({ by: ['TrangThai'], _count: true })
    ]);
    res.json({ success: true, data: { total, byStatus: byStatus.map(s => ({ TrangThai: s.TrangThai, count: s._count })) } });
  } catch (error) { console.error('Get student stats error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getMajors = async (req, res) => {
  try {
    const majors = await prisma.NGANHHOC.findMany({ include: { KHOA: true }, orderBy: { TenNganh: 'asc' } });
    res.json({ success: true, data: majors.map(m => ({ MaNganh: m.MaNganh, TenNganh: m.TenNganh, MaKhoa: m.MaKhoa, TenKhoa: m.KHOA.TenKhoa })) });
  } catch (error) { console.error('Get majors error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getProvinces = async (req, res) => {
  try {
    const provinces = await prisma.TINH.findMany({ orderBy: { TenTinh: 'asc' } });
    res.json({ success: true, data: provinces });
  } catch (error) { console.error('Get provinces error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getDistrictsByProvince = async (req, res) => {
  try {
    const wards = await prisma.PHUONGXA.findMany({ where: { MaTinh: req.params.provinceId }, orderBy: { TenPhuongXa: 'asc' } });
    res.json({ success: true, data: wards });
  } catch (error) { console.error('Get districts error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent, getStudentStats, getMajors, getProvinces, getDistrictsByProvince };
