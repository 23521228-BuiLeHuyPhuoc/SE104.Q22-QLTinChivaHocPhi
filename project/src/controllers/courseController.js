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

const getStudentIdFromRequest = async (req) => {
  if (req.user?.MaSv) return req.user.MaSv;
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaTaiKhoan: Number(req.user?.MaTaiKhoan || req.user?.id || 0) },
    select: { MaSv: true }
  });
  return student?.MaSv || null;
};

const getMyCurriculum = async (req, res) => {
  try {
    const studentId = await getStudentIdFromRequest(req);
    if (!studentId) {
      return res.status(403).json({ success: false, message: 'Không xác định được sinh viên hiện tại' });
    }

            const student = await prisma.SINHVIEN.findUnique({
                where: { MaSv: studentId },
                select: {
                    MaSv: true,
                    HoTen: true,
                    MaNganh: true,
                    NGANHHOC: {
                        select: {
                            MaNganh: true,
                            TenNganh: true,
                            MaKhoa: true
                        }
                    }
                }
            });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    }

    const columns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'CHUONGTRINHHOC'
        AND column_name IN ('HocKyDuKien', 'HocKy', 'BatBuoc', 'TrangThai')
    `;
    const curriculumColumns = columns.map((row) => row.column_name);
    const semesterColumn = curriculumColumns.includes('HocKyDuKien') ? 'HocKyDuKien' : 'HocKy';
    const requiredSelect = curriculumColumns.includes('BatBuoc') ? 'cth."BatBuoc"' : 'TRUE';
    const activeCondition = curriculumColumns.includes('TrangThai') ? 'AND COALESCE(cth."TrangThai", TRUE) = TRUE' : '';

    let rows = await prisma.$queryRawUnsafe(`
      SELECT
        cth."MaNganh",
        cth."MaMonHoc",
        cth."${semesterColumn}" AS "HocKyDuKien",
        ${requiredSelect} AS "BatBuoc",
        mh."TenMonHoc",
        mh."LoaiMon",
        mh."SoTinChi",
        mh."MaKhoa",
        k."TenKhoa"
      FROM "CHUONGTRINHHOC" cth
      JOIN "MONHOC" mh ON mh."MaMonHoc" = cth."MaMonHoc"
      LEFT JOIN "KHOA" k ON k."MaKhoa" = mh."MaKhoa"
      WHERE cth."MaNganh" = $1
        ${activeCondition}
      ORDER BY cth."${semesterColumn}" ASC, mh."MaMonHoc" ASC
    `, student.MaNganh);

    if (!rows.length && student.NGANHHOC?.MaKhoa) {
      rows = await prisma.MONHOC.findMany({
        where: { MaKhoa: student.NGANHHOC.MaKhoa, TrangThai: true },
        orderBy: { MaMonHoc: 'asc' },
        include: { KHOA: true }
      }).then((courses) => courses.map((course) => ({
        MaNganh: student.MaNganh,
        MaMonHoc: course.MaMonHoc,
        HocKyDuKien: null,
        BatBuoc: true,
        TenMonHoc: course.TenMonHoc,
        LoaiMon: course.LoaiMon,
        SoTinChi: course.SoTinChi,
        MaKhoa: course.MaKhoa,
        TenKhoa: course.KHOA?.TenKhoa
      })));
    }

    const completedHistory = await prisma.MONDAHOC.findMany({
      where: { MaSv: studentId },
      orderBy: [{ LanHoc: 'desc' }, { NgayTao: 'desc' }],
      select: {
        MaMonHoc: true,
        KetQua: true,
        LanHoc: true
      }
    });
    const historyMap = new Map();
    completedHistory.forEach((history) => {
      if (!historyMap.has(history.MaMonHoc)) historyMap.set(history.MaMonHoc, []);
      historyMap.get(history.MaMonHoc).push(history);
    });

    const courses = rows.map((course) => {
      const histories = historyMap.get(course.MaMonHoc) || [];
      const passed = histories.some((history) => history.KetQua === 'qua_mon');
      const failed = histories.some((history) => history.KetQua === 'rot');
      const latestHistory = histories[0] || null;
      const status = passed ? 'passed' : failed ? 'failed' : 'not_started';

      return {
        MaNganh: course.MaNganh,
        MaMonHoc: course.MaMonHoc,
        TenMonHoc: course.TenMonHoc,
        LoaiMon: course.LoaiMon,
        SoTinChi: Number(course.SoTinChi || 0),
        HocKyDuKien: course.HocKyDuKien,
        BatBuoc: course.BatBuoc !== false,
        MaKhoa: course.MaKhoa,
        TenKhoa: course.TenKhoa,
        status,
        history: latestHistory ? {
          KetQua: latestHistory.KetQua,
          LanHoc: latestHistory.LanHoc
        } : null
      };
    });

    const totalCredits = courses.reduce((sum, course) => sum + Number(course.SoTinChi || 0), 0);
    const completedCredits = courses
      .filter((course) => course.status === 'passed')
      .reduce((sum, course) => sum + Number(course.SoTinChi || 0), 0);

    res.json({
      success: true,
      data: {
        student: {
          MaSv: student.MaSv,
          HoTen: student.HoTen,
          MaNganh: student.MaNganh,
          TenNganh: student.NGANHHOC?.TenNganh
        },
        summary: {
          totalCourses: courses.length,
          totalCredits,
          completedCredits,
          remainingCredits: Math.max(totalCredits - completedCredits, 0)
        },
        courses
      }
    });
  } catch (error) {
    console.error('Get curriculum error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse, getCourseStats, getMyCurriculum, getOpenedClasses };
