const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const VALID_RESULTS = ['qua_mon', 'rot'];

const getStudentIdFromRequest = async (req) => {
  if (req.user?.MaSv) return req.user.MaSv;
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaTaiKhoan: Number(req.user?.MaTaiKhoan || req.user?.id || 0), DaXoa: false },
    select: { MaSv: true }
  });
  return student?.MaSv || null;
};

const normalizeResult = (value) => {
  if (value === 'qua_mon' || value === 'rot') return value;
  if (['Đậu', 'Đạt', 'dat', 'dau', 'passed'].includes(value)) return 'qua_mon';
  if (['Rớt', 'Không đạt', 'rot', 'failed'].includes(value)) return 'rot';
  return value;
};

const getMyCompletedCourses = async (req, res) => {
  try {
    const maSv = await getStudentIdFromRequest(req);
    if (!maSv) {
      return res.status(403).json({ success: false, message: 'Không xác định được sinh viên hiện tại' });
    }

    const { page, limit, skip } = getPagination(req.query);
    const { MaHocKy, KetQua, search } = req.query;
    const where = { MaSv: maSv, DaXoa: false };
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (KetQua) where.KetQua = KetQua;
    if (search) {
      where.MONHOC = {
        OR: [
          { MaMonHoc: { contains: search, mode: 'insensitive' } },
          { TenMonHoc: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [completedCourses, allRows, total] = await Promise.all([
      prisma.MONDAHOC.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ MaHocKy: 'desc' }, { LanHoc: 'desc' }, { NgayTao: 'desc' }, { id: 'desc' }],
        include: {
          MONHOC: { select: { MaMonHoc: true, TenMonHoc: true, SoTinChi: true, LoaiMon: true } },
          HOCKY: { select: { MaHocKy: true, TenHocKy: true, NAMHOC: { select: { TenNamHoc: true } } } },
          LOP: { select: { MaLop: true, TenLop: true } }
        }
      }),
      prisma.MONDAHOC.findMany({
        where,
        select: {
          MaMonHoc: true,
          KetQua: true,
          MONHOC: { select: { SoTinChi: true } }
        }
      }),
      prisma.MONDAHOC.count({ where })
    ]);

    const passedCreditsByCourse = new Map();
    allRows.forEach((item) => {
      if (item.KetQua === 'qua_mon' && item.MONHOC) {
        passedCreditsByCourse.set(item.MaMonHoc, Number(item.MONHOC.SoTinChi || 0));
      }
    });

    res.json({
      success: true,
      data: completedCourses,
      summary: {
        totalAttempts: total,
        passedCount: allRows.filter((item) => item.KetQua === 'qua_mon').length,
        failedCount: allRows.filter((item) => item.KetQua === 'rot').length,
        passedCredits: Array.from(passedCreditsByCourse.values()).reduce((sum, credits) => sum + credits, 0)
      },
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getMyCompletedCourses error:');
  }
};

const getAllCompletedCourses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, MaSv, MaHocKy, MaMonHoc, KetQua, all } = req.query;
    const where = notDeleted();

    if (MaSv) where.MaSv = MaSv;
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
        skip: all === 'true' ? undefined : skip,
        take: all === 'true' ? undefined : limit,
        orderBy: [{ NgayTao: 'desc' }, { id: 'desc' }],
        include: {
          SINHVIEN: { select: { MaSv: true, HoTen: true } },
          MONHOC: { select: { MaMonHoc: true, TenMonHoc: true, SoTinChi: true } },
          HOCKY: { select: { MaHocKy: true, TenHocKy: true, NAMHOC: { select: { TenNamHoc: true } } } },
          LOP: { select: { MaLop: true, TenLop: true } },
          TAIKHOAN: { select: { HoTen: true, TenDangNhap: true } }
        }
      }),
      prisma.MONDAHOC.count({ where })
    ]);

    res.json({
      success: true,
      data: completedCourses,
      pagination: all === 'true' ? getPaginationMeta(total, 1, total || limit) : getPaginationMeta(total, page, limit)
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getAllCompletedCourses error:');
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
        ...updateAudit(req)
      }
    });

    res.status(201).json({ success: true, message: 'Thêm môn đã học thành công', data: completedCourse });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Môn đã học cho sinh viên, học kỳ và lần học này đã tồn tại' });
    }
        return sendErrorResponse(res, error, 'Lỗi server', 'createCompletedCourse error:');
  }
};

const updateCompletedCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { MaSv, MaMonHoc, MaHocKy, MaLop, LanHoc, KetQua, GhiChu } = req.body;
    const data = updateAudit(req);

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
        return sendErrorResponse(res, error, 'Lỗi server', 'updateCompletedCourse error:');
  }
};

const deleteCompletedCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.MONDAHOC.update({ where: { id: parseInt(id, 10) }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển môn đã học vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'deleteCompletedCourse error:');
  }
};

module.exports = {
  getMyCompletedCourses,
  getAllCompletedCourses,
  createCompletedCourse,
  updateCompletedCourse,
  deleteCompletedCourse
};
