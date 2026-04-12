const prisma = require('../config/database');

const getClasses = async (req, res) => {
  try {
    const { MaMonHoc, TrangThai, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (MaMonHoc) where.MaMonHoc = MaMonHoc;
    if (TrangThai !== undefined) where.TrangThai = TrangThai === 'true';
    if (search) { where.OR = [{ MaLop: { contains: search, mode: 'insensitive' } }, { TenLop: { contains: search, mode: 'insensitive' } }, { GiangVien: { contains: search, mode: 'insensitive' } }]; }

    const [rows, total] = await Promise.all([
      prisma.LOP.findMany({ where, skip, take: parseInt(limit), orderBy: { NgayTao: 'desc' }, include: { MONHOC: { include: { KHOA: true } } } }),
      prisma.LOP.count({ where })
    ]);
    res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { console.error('Error getting classes:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getClassById = async (req, res) => {
  try {
    const cls = await prisma.LOP.findUnique({ where: { MaLop: req.params.id }, include: { MONHOC: { include: { KHOA: true } } } });
    if (!cls) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    res.json({ success: true, data: cls });
  } catch (error) { console.error('Error getting class:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const createClass = async (req, res) => {
  try {
    const { MaLop, TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa, MoTa } = req.body;
    const existingClass = await prisma.LOP.findUnique({ where: { MaLop } });
    if (existingClass) return res.status(400).json({ success: false, message: 'Mã lớp đã tồn tại' });
    const course = await prisma.MONHOC.findUnique({ where: { MaMonHoc } });
    if (!course) return res.status(400).json({ success: false, message: 'Môn học không tồn tại' });
    const cls = await prisma.LOP.create({ data: { MaLop, TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa: SoLuongToiDa ? parseInt(SoLuongToiDa) : 50, MoTa } });
    res.status(201).json({ success: true, message: 'Tạo lớp học thành công', data: cls });
  } catch (error) { console.error('Error creating class:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const updateClass = async (req, res) => {
  try {
    const existing = await prisma.LOP.findUnique({ where: { MaLop: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    const { TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa, MoTa, TrangThai } = req.body;
    const data = {};
    if (TenLop) data.TenLop = TenLop; if (MaMonHoc) data.MaMonHoc = MaMonHoc; if (GiangVien) data.GiangVien = GiangVien;
    if (LichHoc) data.LichHoc = LichHoc; if (PhongHoc) data.PhongHoc = PhongHoc;
    if (SoLuongToiDa) data.SoLuongToiDa = parseInt(SoLuongToiDa); if (MoTa !== undefined) data.MoTa = MoTa;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    const updated = await prisma.LOP.update({ where: { MaLop: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật lớp học thành công', data: updated });
  } catch (error) { console.error('Error updating class:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const deleteClass = async (req, res) => {
  try {
    const regCount = await prisma.CHITIETDANGKY.count({ where: { MaLop: req.params.id } });
    if (regCount > 0) return res.status(400).json({ success: false, message: 'Không thể xóa lớp học đã có sinh viên đăng ký' });
    await prisma.LOP.delete({ where: { MaLop: req.params.id } });
    res.json({ success: true, message: 'Xóa lớp học thành công' });
  } catch (error) { console.error('Error deleting class:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getOpenedClasses = async (req, res) => {
  try {
    const where = {};
    if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const rows = await prisma.LOPMO.findMany({ where, include: { LOP: { include: { MONHOC: true } }, HOCKY: true }, orderBy: { NgayTao: 'desc' } });
    res.json({ success: true, data: rows });
  } catch (error) { console.error('Error getting opened classes:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const openClass = async (req, res) => {
  try {
    const { MaHocKy, MaLop, GhiChu } = req.body;
    const existing = await prisma.LOPMO.findFirst({ where: { MaHocKy, MaLop } });
    if (existing) return res.status(400).json({ success: false, message: 'Lớp đã được mở trong học kỳ này' });
    const result = await prisma.LOPMO.create({ data: { MaHocKy, MaLop, GhiChu } });
    res.status(201).json({ success: true, message: 'Mở lớp thành công', data: result });
  } catch (error) { console.error('Error opening class:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const closeClass = async (req, res) => {
  try { await prisma.LOPMO.delete({ where: { id: parseInt(req.params.id) } }); res.json({ success: true, message: 'Đóng lớp thành công' }); }
  catch (error) { console.error('Error closing class:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getClassStats = async (req, res) => {
  try {
    const [totalClasses, activeClasses, totalOpened] = await Promise.all([
      prisma.LOP.count(),
      prisma.LOP.count({ where: { TrangThai: true } }),
      prisma.LOPMO.count()
    ]);
    res.json({ success: true, data: { total_classes: totalClasses, active_classes: activeClasses, total_opened_classes: totalOpened } });
  } catch (error) { console.error('Error getting class stats:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { getClasses, getClassById, createClass, updateClass, deleteClass, getOpenedClasses, openClass, closeClass, getClassStats };
