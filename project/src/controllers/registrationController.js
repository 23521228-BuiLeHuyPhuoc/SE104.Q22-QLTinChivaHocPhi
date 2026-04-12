const prisma = require('../config/database');

const getAllRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', MaHocKy, TrangThai } = req.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (TrangThai) where.TrangThai = TrangThai;
    if (search) { where.SINHVIEN = { OR: [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }] }; }

    const [rows, total] = await Promise.all([
      prisma.PHIEUDANGKY.findMany({ where, skip, take: parseInt(limit), orderBy: { NgayLap: 'desc' }, include: { SINHVIEN: true, HOCKY: { include: { NAMHOC: true } }, CHITIETDANGKY: true } }),
      prisma.PHIEUDANGKY.count({ where })
    ]);
    const data = rows.map(r => ({ SoPhieu: r.SoPhieu, MaSv: r.MaSv, HoTen: r.SINHVIEN.HoTen, MaHocKy: r.MaHocKy, TenHocKy: r.HOCKY.TenHocKy, TenNamHoc: r.HOCKY.NAMHOC.TenNamHoc, soMon: r.CHITIETDANGKY.filter(c => c.TrangThai === 'Đã đăng ký').length, TongTinChi: r.TongTinChi, TongTienPhaiDong: r.TongTienPhaiDong, NgayLap: r.NgayLap, TrangThai: r.TrangThai }));
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { console.error('Get all registrations error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getStudentCourses = async (req, res) => {
  try {
    const where = { PHIEUDANGKY: { MaSv: req.params.studentId } };
    if (req.query.MaHocKy) where.PHIEUDANGKY.MaHocKy = req.query.MaHocKy;
    const rows = await prisma.CHITIETDANGKY.findMany({ where, include: { LOP: { include: { MONHOC: true } }, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } } });
    res.json({ success: true, data: { courses: rows, summary: { totalCourses: rows.length, totalCredits: rows.reduce((s, c) => s + (c.SoTinChi || 0), 0) } } });
  } catch (error) { console.error('Get student courses error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getAvailableCourses = async (req, res) => {
  try {
    const { MaHocKy, search = '', MaKhoa } = req.query;
    if (!MaHocKy) return res.status(400).json({ success: false, message: 'Vui lòng chọn học kỳ' });
    const where = { MaHocKy };
    if (search || MaKhoa) { where.LOP = { MONHOC: {} }; if (search) { where.LOP.MONHOC.OR = [{ MaMonHoc: { contains: search, mode: 'insensitive' } }, { TenMonHoc: { contains: search, mode: 'insensitive' } }]; } if (MaKhoa) { where.LOP.MONHOC.MaKhoa = MaKhoa; } }
    const rows = await prisma.LOPMO.findMany({ where, include: { LOP: { include: { MONHOC: { include: { KHOA: true } }, CHITIETDANGKY: { where: { TrangThai: 'Đã đăng ký' } } } }, HOCKY: true } });
    const data = rows.map(r => ({ id: r.id, MaLop: r.MaLop, MaHocKy: r.MaHocKy, TenMonHoc: r.LOP.MONHOC.TenMonHoc, SoTinChi: r.LOP.MONHOC.SoTinChi, LoaiMon: r.LOP.MONHOC.LoaiMon, TenKhoa: r.LOP.MONHOC.KHOA?.TenKhoa, SoLuongToiDa: r.LOP.SoLuongToiDa, SoLuongDaDangKy: r.LOP.CHITIETDANGKY.length, GiangVien: r.LOP.GiangVien, PhongHoc: r.LOP.PhongHoc, LichHoc: r.LOP.LichHoc }));
    res.json({ success: true, data });
  } catch (error) { console.error('Get available courses error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const registerCourse = async (req, res) => {
  try {
    const { MaSv, MaHocKy, MaLop, LoaiDangKy = 'hoc_moi' } = req.body;
    if (!MaSv || !MaHocKy || !MaLop) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });

    const result = await prisma.$transaction(async (tx) => {
      const lop = await tx.LOP.findUnique({ where: { MaLop }, include: { MONHOC: true } });
      if (!lop) throw { status: 404, message: 'Lớp học không tồn tại' };

      let phieu = await tx.PHIEUDANGKY.findFirst({ where: { MaSv, MaHocKy } });
      if (!phieu) { phieu = await tx.PHIEUDANGKY.create({ data: { MaSv, MaHocKy, TrangThai: 'Đã đăng ký' } }); }

      const existingReg = await tx.CHITIETDANGKY.findFirst({ where: { SoPhieu: phieu.SoPhieu, MaLop, TrangThai: 'Đã đăng ký' } });
      if (existingReg) throw { status: 400, message: 'Đã đăng ký lớp này rồi' };

      const donGiaResult = await tx.DONGIATINCHI.findFirst({ where: { LoaiMon: lop.MONHOC.LoaiMon, LoaiHoc: LoaiDangKy } });
      const donGia = donGiaResult ? Number(donGiaResult.DonGia) : 27000;
      const thanhTien = donGia * (lop.MONHOC.SoTinChi || 0);

      const reg = await tx.CHITIETDANGKY.create({ data: { SoPhieu: phieu.SoPhieu, MaLop, LoaiDangKy, SoTinChi: lop.MONHOC.SoTinChi || 0, LoaiMon: lop.MONHOC.LoaiMon, DonGia: donGia, ThanhTien: thanhTien, TrangThai: 'Đã đăng ký' } });
      return reg;
    });
    res.status(201).json({ success: true, message: 'Đăng ký thành công', data: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Register course error:', error); res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const cancelRegistration = async (req, res) => {
  try {
    const reg = await prisma.CHITIETDANGKY.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!reg) return res.status(404).json({ success: false, message: 'Không tìm thấy đăng ký' });
    await prisma.CHITIETDANGKY.update({ where: { id: parseInt(req.params.id) }, data: { TrangThai: 'Đã hủy', NgayHuy: new Date() } });
    res.json({ success: true, message: 'Hủy đăng ký thành công' });
  } catch (error) { console.error('Cancel registration error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getRegistrationStats = async (req, res) => {
  try {
    const where = {};
    if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const [totalReg, totalDetails] = await Promise.all([
      prisma.PHIEUDANGKY.count({ where }),
      prisma.CHITIETDANGKY.count({ where: { TrangThai: 'Đã đăng ký', PHIEUDANGKY: where } })
    ]);
    res.json({ success: true, data: { totalRegistrations: totalReg, totalCourses: totalDetails } });
  } catch (error) { console.error('Get registration stats error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { getAllRegistrations, getStudentCourses, getAvailableCourses, registerCourse, cancelRegistration, getRegistrationStats };
