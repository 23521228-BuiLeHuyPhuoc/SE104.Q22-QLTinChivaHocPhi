const prisma = require('../config/database');

const getAllTuition = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', MaHocKy } = req.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (search) { where.SINHVIEN = { OR: [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }] }; }

    const [rows, total] = await Promise.all([
      prisma.PHIEUDANGKY.findMany({ where, skip, take: parseInt(limit), orderBy: { NgayLap: 'desc' }, include: { SINHVIEN: true, HOCKY: { include: { NAMHOC: true } }, PHIEUTHUHOCPHI: { where: { TrangThai: 'Thành công' } }, CHITIETDANGKY: { where: { TrangThai: 'Đã đăng ký' } } } }),
      prisma.PHIEUDANGKY.count({ where })
    ]);
    const data = rows.map(t => { const daDong = t.PHIEUTHUHOCPHI.reduce((s, p) => s + Number(p.SoTienThu), 0); const phaiDong = Number(t.TongTienPhaiDong) || 0; return { SoPhieu: t.SoPhieu, MaSv: t.MaSv, HoTen: t.SINHVIEN.HoTen, Email: t.SINHVIEN.Email, MaHocKy: t.MaHocKy, TenHocKy: t.HOCKY.TenHocKy, TenNamHoc: t.HOCKY.NAMHOC.TenNamHoc, soMon: t.CHITIETDANGKY.length, TongTienPhaiDong: phaiDong, TongTienDaDong: daDong, conNo: phaiDong - daDong, TrangThai: daDong >= phaiDong ? 'Đã đóng đủ' : 'Còn nợ' }; });
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { console.error('Get all tuition error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getTuitionById = async (req, res) => {
  try {
    const t = await prisma.PHIEUDANGKY.findUnique({ where: { SoPhieu: parseInt(req.params.id) }, include: { SINHVIEN: true, HOCKY: { include: { NAMHOC: true } }, CHITIETDANGKY: { where: { TrangThai: 'Đã đăng ký' }, include: { LOP: { include: { MONHOC: true } } } }, PHIEUTHUHOCPHI: true } });
    if (!t) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin học phí' });
    const daDong = t.PHIEUTHUHOCPHI.filter(p => p.TrangThai === 'Thành công').reduce((s, p) => s + Number(p.SoTienThu), 0);
    res.json({ success: true, data: { SoPhieu: t.SoPhieu, MaSv: t.MaSv, HoTen: t.SINHVIEN.HoTen, TenHocKy: t.HOCKY.TenHocKy, TongTienPhaiDong: Number(t.TongTienPhaiDong), TongTienDaDong: daDong, courses: t.CHITIETDANGKY.map(c => ({ MaMonHoc: c.LOP.MaMonHoc, TenMonHoc: c.LOP.MONHOC.TenMonHoc, SoTinChi: c.SoTinChi, DonGia: Number(c.DonGia), ThanhTien: Number(c.ThanhTien) })), payments: t.PHIEUTHUHOCPHI } });
  } catch (error) { console.error('Get tuition by ID error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getStudentTuition = async (req, res) => {
  try {
    const where = { MaSv: req.params.studentId };
    if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const rows = await prisma.PHIEUDANGKY.findMany({ where, include: { HOCKY: { include: { NAMHOC: true } }, PHIEUTHUHOCPHI: { where: { TrangThai: 'Thành công' } } }, orderBy: { NgayLap: 'desc' } });
    const data = rows.map(t => { const daDong = t.PHIEUTHUHOCPHI.reduce((s, p) => s + Number(p.SoTienThu), 0); const phaiDong = Number(t.TongTienPhaiDong) || 0; return { SoPhieu: t.SoPhieu, MaHocKy: t.MaHocKy, TenHocKy: t.HOCKY.TenHocKy, TenNamHoc: t.HOCKY.NAMHOC.TenNamHoc, TongTienPhaiDong: phaiDong, TongTienDaDong: daDong, conNo: phaiDong - daDong }; });
    res.json({ success: true, data });
  } catch (error) { console.error('Get student tuition error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const calculateTuition = async (req, res) => {
  try {
    const { MaSv, MaHocKy } = req.body;
    if (!MaSv || !MaHocKy) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã sinh viên và học kỳ' });
    const phieu = await prisma.PHIEUDANGKY.findFirst({ where: { MaSv, MaHocKy }, include: { CHITIETDANGKY: { where: { TrangThai: 'Đã đăng ký' } } } });
    if (!phieu) return res.status(404).json({ success: false, message: 'Chưa đăng ký môn học trong học kỳ này' });
    const total = phieu.CHITIETDANGKY.reduce((s, c) => s + Number(c.ThanhTien), 0);
    await prisma.PHIEUDANGKY.update({ where: { SoPhieu: phieu.SoPhieu }, data: { TongTienPhaiDong: total } });
    res.json({ success: true, data: { SoPhieu: phieu.SoPhieu, TongTienPhaiDong: total } });
  } catch (error) { console.error('Calculate tuition error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getTuitionStats = async (req, res) => {
  try {
    const where = {}; if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const rows = await prisma.PHIEUDANGKY.findMany({ where, include: { PHIEUTHUHOCPHI: { where: { TrangThai: 'Thành công' } } } });
    const totalAmount = rows.reduce((s, r) => s + Number(r.TongTienPhaiDong || 0), 0);
    const paidAmount = rows.reduce((s, r) => s + r.PHIEUTHUHOCPHI.reduce((ss, p) => ss + Number(p.SoTienThu), 0), 0);
    res.json({ success: true, data: { totalAmount, paidAmount, remainingAmount: totalAmount - paidAmount } });
  } catch (error) { console.error('Get tuition stats error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getCreditPrices = async (req, res) => {
  try {
    const prices = await prisma.DONGIATINCHI.findMany({ orderBy: [{ LoaiMon: 'asc' }, { LoaiHoc: 'asc' }] });
    res.json({ success: true, data: prices });
  } catch (error) { console.error('Get credit prices error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { getAllTuition, getTuitionById, getStudentTuition, calculateTuition, getTuitionStats, getCreditPrices };
