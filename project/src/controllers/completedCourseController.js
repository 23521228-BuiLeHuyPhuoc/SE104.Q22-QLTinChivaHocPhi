const prisma = require('../config/database');

const VALID_RESULTS = ['qua_mon', 'rot'];

const normalizeResult = (value) => {
  if (value === 'qua_mon' || value === 'rot') return value;
  if (['Đậu', 'Đạt', 'dat', 'dau', 'passed'].includes(value)) return 'qua_mon';
  if (['Rớt', 'Không đạt', 'rot', 'failed'].includes(value)) return 'rot';
  return value;
};

const getAllCompletedCourses = async (req, res) => {
  try {
    const { search, MaHocKy, MaMonHoc, KetQua, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = {};

    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (MaMonHoc) where.MaMonHoc = MaMonHoc;
    if (KetQua) where.KetQua = KetQua;
    if (search) {
      where.SINHVIEN = {
        OR: [
          { MaSv: { contains: search, mode: 'insensitive' } },
          { HoTen: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [completedCourses, total] = await Promise.all([
      prisma.MONDAHOC.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        orderBy: [{ NgayTao: 'desc' }, { id: 'desc' }],
        include: {
          SINHVIEN: { select: { MaSv: true, HoTen: true } },
          MONHOC: { select: { MaMonHoc: true, TenMonHoc: true } },
          HOCKY: { select: { MaHocKy: true, TenHocKy: true } },
          LOP: { select: { MaLop: true, TenLop: true } }
        }
      }),
      prisma.MONDAHOC.count({ where })
    ]);

    res.json({
      success: true,
      data: completedCourses,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('getAllCompletedCourses error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createCompletedCourse = async (req, res) => {
  try {
    const { MaSv, MaMonHoc, MaHocKy, MaLop, LanHoc, KetQua, GhiChu } = req.body;
    const result = normalizeResult(KetQua);

    if (!MaSv || !MaMonHoc || !MaHocKy || !result) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập MSSV, mã môn học, học kỳ và kết quả' });
    }
    if (!VALID_RESULTS.includes(result)) {
      return res.status(400).json({ success: false, message: 'Kết quả môn đã học không hợp lệ' });
    }

    const completedCourse = await prisma.MONDAHOC.create({
      data: {
        MaSv,
        MaMonHoc,
        MaHocKy,
        MaLop: MaLop || null,
        LanHoc: parseInt(LanHoc, 10) || 1,
        KetQua: result,
        GhiChu,
        NguoiCapNhat: req.user.id || req.user.MaTaiKhoan || null
      }
    });

    res.status(201).json({ success: true, message: 'Thêm môn đã học thành công', data: completedCourse });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Môn đã học cho sinh viên, học kỳ và lần học này đã tồn tại' });
    }
    console.error('createCompletedCourse error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateCompletedCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { MaSv, MaMonHoc, MaHocKy, MaLop, LanHoc, KetQua, GhiChu } = req.body;
    const data = { NgayCapNhat: new Date(), NguoiCapNhat: req.user.id || req.user.MaTaiKhoan || null };

    if (MaSv !== undefined) data.MaSv = MaSv;
    if (MaMonHoc !== undefined) data.MaMonHoc = MaMonHoc;
    if (MaHocKy !== undefined) data.MaHocKy = MaHocKy;
    if (MaLop !== undefined) data.MaLop = MaLop || null;
    if (LanHoc !== undefined) data.LanHoc = parseInt(LanHoc, 10) || 1;
    if (KetQua !== undefined) {
      const result = normalizeResult(KetQua);
      if (!VALID_RESULTS.includes(result)) {
        return res.status(400).json({ success: false, message: 'Kết quả môn đã học không hợp lệ' });
      }
      data.KetQua = result;
    }
    if (GhiChu !== undefined) data.GhiChu = GhiChu;

    const completedCourse = await prisma.MONDAHOC.update({ where: { id: parseInt(id, 10) }, data });
    res.json({ success: true, message: 'Cập nhật môn đã học thành công', data: completedCourse });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Môn đã học cho sinh viên, học kỳ và lần học này đã tồn tại' });
    }
    console.error('updateCompletedCourse error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteCompletedCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.MONDAHOC.delete({ where: { id: parseInt(id, 10) } });
    res.json({ success: true, message: 'Xóa môn đã học thành công' });
  } catch (error) {
    console.error('deleteCompletedCourse error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  getAllCompletedCourses,
  createCompletedCourse,
  updateCompletedCourse,
  deleteCompletedCourse
};
