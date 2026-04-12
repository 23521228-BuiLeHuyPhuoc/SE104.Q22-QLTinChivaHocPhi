const prisma = require('../config/database');
const { formatCourse, formatCourseList } = require('../models/courseModel');

const getAllCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', LoaiMon, MaKhoa, sortBy = 'MaMonHoc', sortOrder = 'asc' } = req.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (search) { where.OR = [{ MaMonHoc: { contains: search, mode: 'insensitive' } }, { TenMonHoc: { contains: search, mode: 'insensitive' } }]; }
    if (LoaiMon) where.LoaiMon = LoaiMon;
    if (MaKhoa) where.MaKhoa = MaKhoa;

    const [rows, total] = await Promise.all([
      prisma.MONHOC.findMany({ where, skip, take: parseInt(limit), orderBy: { [sortBy]: sortOrder }, include: { KHOA: true } }),
      prisma.MONHOC.count({ where })
    ]);
    res.json({ success: true, data: formatCourseList(rows), pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { console.error('Get all courses error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getCourseById = async (req, res) => {
  try {
    const mh = await prisma.MONHOC.findUnique({ where: { MaMonHoc: req.params.id }, include: { KHOA: true, DIEUKIENMONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC: { include: { MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC: true } } } });
    if (!mh) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    const prerequisites = mh.DIEUKIENMONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC.map(dk => ({ MaMonDieuKien: dk.MaMonDieuKien, TenMonDieuKien: dk.MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC.TenMonHoc, LoaiDieuKien: dk.LoaiDieuKien }));
    res.json({ success: true, data: { ...formatCourse(mh), prerequisites } });
  } catch (error) { console.error('Get course by ID error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const createCourse = async (req, res) => {
  try {
    const { MaMonHoc, TenMonHoc, SoTiet, LoaiMon, MaKhoa, MoTa } = req.body;
    if (!MaMonHoc || !TenMonHoc || !SoTiet || !LoaiMon || !MaKhoa) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    const existing = await prisma.MONHOC.findUnique({ where: { MaMonHoc } });
    if (existing) return res.status(400).json({ success: false, message: 'Mã môn học đã tồn tại' });
    const course = await prisma.MONHOC.create({ data: { MaMonHoc, TenMonHoc, SoTiet: parseInt(SoTiet), LoaiMon, MaKhoa, MoTa } });
    res.status(201).json({ success: true, message: 'Tạo môn học thành công', data: course });
  } catch (error) { console.error('Create course error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const updateCourse = async (req, res) => {
  try {
    const existing = await prisma.MONHOC.findUnique({ where: { MaMonHoc: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    const { TenMonHoc, SoTiet, LoaiMon, MaKhoa, MoTa } = req.body;
    const data = {};
    if (TenMonHoc) data.TenMonHoc = TenMonHoc;
    if (SoTiet) data.SoTiet = parseInt(SoTiet);
    if (LoaiMon) data.LoaiMon = LoaiMon;
    if (MaKhoa) data.MaKhoa = MaKhoa;
    if (MoTa !== undefined) data.MoTa = MoTa;
    const updated = await prisma.MONHOC.update({ where: { MaMonHoc: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật môn học thành công', data: updated });
  } catch (error) { console.error('Update course error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const deleteCourse = async (req, res) => {
  try {
    const existing = await prisma.MONHOC.findUnique({ where: { MaMonHoc: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    await prisma.MONHOC.delete({ where: { MaMonHoc: req.params.id } });
    res.json({ success: true, message: 'Xóa môn học thành công' });
  } catch (error) { console.error('Delete course error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getCourseStats = async (req, res) => {
  try {
    const [total, byType] = await Promise.all([
      prisma.MONHOC.count(),
      prisma.MONHOC.groupBy({ by: ['LoaiMon'], _count: true })
    ]);
    res.json({ success: true, data: { total, byType: byType.map(t => ({ LoaiMon: t.LoaiMon, count: t._count })) } });
  } catch (error) { console.error('Get course stats error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getOpenedClasses = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', MaHocKy, MaKhoa } = req.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (search || MaKhoa) { where.LOP = { MONHOC: {} }; if (search) { where.LOP.MONHOC.OR = [{ MaMonHoc: { contains: search, mode: 'insensitive' } }, { TenMonHoc: { contains: search, mode: 'insensitive' } }]; } if (MaKhoa) { where.LOP.MONHOC.MaKhoa = MaKhoa; } }

    const [rows, total] = await Promise.all([
      prisma.LOPMO.findMany({ where, skip, take: parseInt(limit), include: { LOP: { include: { MONHOC: { include: { KHOA: true } } } }, HOCKY: { include: { NAMHOC: true } } } }),
      prisma.LOPMO.count({ where })
    ]);
    res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { console.error('Get opened classes error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse, getCourseStats, getOpenedClasses };
