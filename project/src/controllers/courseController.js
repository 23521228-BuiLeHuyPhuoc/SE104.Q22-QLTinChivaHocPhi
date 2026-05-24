const prisma = require('../config/database');
const { formatCourse, formatCourseList } = require('../models/courseModel');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';

const getStudentIdFromRequest = async (req) => {
  if (req.user?.MaSv) return req.user.MaSv;
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaTaiKhoan: Number(req.user?.MaTaiKhoan || req.user?.id || 0), DaXoa: false },
    select: { MaSv: true }
  });
  return student?.MaSv || null;
};

const getAllCourses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search = '', LoaiMon, MaKhoa, sortBy = 'MaMonHoc', sortOrder = 'asc' } = req.query;
    const where = notDeleted();
    if (search) where.OR = [{ MaMonHoc: { contains: search, mode: 'insensitive' } }, { TenMonHoc: { contains: search, mode: 'insensitive' } }];
    if (LoaiMon) where.LoaiMon = LoaiMon;
    if (MaKhoa) where.MaKhoa = MaKhoa;

    const validSort = ['MaMonHoc', 'TenMonHoc', 'NgayTao', 'NgayCapNhat'];
    const orderField = validSort.includes(sortBy) ? sortBy : 'MaMonHoc';
    const [rows, total] = await Promise.all([
      prisma.MONHOC.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: String(sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: { KHOA: true }
      }),
      prisma.MONHOC.count({ where })
    ]);
    res.json({ success: true, data: formatCourseList(rows), pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getCourseById = async (req, res) => {
  try {
    const mh = await prisma.MONHOC.findFirst({
      where: { MaMonHoc: req.params.id, DaXoa: false },
      include: {
        KHOA: true,
        DIEUKIENMONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC: {
          where: { TrangThai: true },
          include: { MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC: true }
        }
      }
    });
    if (!mh) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    const prerequisites = mh.DIEUKIENMONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC.map((dk) => ({
      MaMonDieuKien: dk.MaMonDieuKien,
      TenMonDieuKien: dk.MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC.TenMonHoc,
      LoaiDieuKien: dk.LoaiDieuKien
    }));
    res.json({ success: true, data: { ...formatCourse(mh), prerequisites } });
  } catch (error) {
    console.error('Get course by ID error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createCourse = async (req, res) => {
  try {
    const { MaMonHoc, TenMonHoc, SoTiet, LoaiMon, MaKhoa, MoTa } = req.body;
    if (!MaMonHoc || !TenMonHoc || !SoTiet || !LoaiMon || !MaKhoa) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const existing = await prisma.MONHOC.findUnique({ where: { MaMonHoc } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã môn học đã tồn tại' });
    const course = await prisma.MONHOC.create({ data: { MaMonHoc, TenMonHoc, SoTiet: parseInt(SoTiet, 10), LoaiMon, MaKhoa, MoTa, ...updateAudit(req) } });
    res.status(201).json({ success: true, message: 'Tạo môn học thành công', data: course });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const existing = await prisma.MONHOC.findFirst({ where: { MaMonHoc: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    const { TenMonHoc, SoTiet, LoaiMon, MaKhoa, MoTa, TrangThai } = req.body;
    const data = {};
    if (TenMonHoc) data.TenMonHoc = TenMonHoc;
    if (SoTiet) data.SoTiet = parseInt(SoTiet, 10);
    if (LoaiMon) data.LoaiMon = LoaiMon;
    if (MaKhoa) data.MaKhoa = MaKhoa;
    if (MoTa !== undefined) data.MoTa = MoTa;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    Object.assign(data, updateAudit(req));
    const updated = await prisma.MONHOC.update({ where: { MaMonHoc: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật môn học thành công', data: updated });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const existing = await prisma.MONHOC.findFirst({ where: { MaMonHoc: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    await prisma.MONHOC.update({ where: { MaMonHoc: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển môn học vào thùng rác' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getCourseStats = async (req, res) => {
  try {
    const [total, byType] = await Promise.all([
      prisma.MONHOC.count({ where: notDeleted() }),
      prisma.MONHOC.groupBy({ by: ['LoaiMon'], where: notDeleted(), _count: true })
    ]);
    res.json({ success: true, data: { total, byType: byType.map((t) => ({ LoaiMon: t.LoaiMon, count: t._count })) } });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getOpenedClasses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search = '', MaHocKy, MaKhoa } = req.query;
    const where = { LOP: { DaXoa: false, MONHOC: { DaXoa: false } }, HOCKY: { DaXoa: false } };
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (search) {
      where.LOP.MONHOC.OR = [
        { MaMonHoc: { contains: search, mode: 'insensitive' } },
        { TenMonHoc: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (MaKhoa) where.LOP.MONHOC.MaKhoa = MaKhoa;

    const [rows, total] = await Promise.all([
      prisma.LOPMO.findMany({
        where,
        skip,
        take: limit,
        include: { LOP: { include: { MONHOC: { include: { KHOA: true } } } }, HOCKY: { include: { NAMHOC: true } } }
      }),
      prisma.LOPMO.count({ where })
    ]);
    res.json({ success: true, data: rows, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('Get opened classes error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getMyCurriculum = async (req, res) => {
  try {
    const studentId = await getStudentIdFromRequest(req);
    if (!studentId) return res.status(403).json({ success: false, message: 'Không xác định được sinh viên hiện tại' });

    const student = await prisma.SINHVIEN.findFirst({
      where: { MaSv: studentId, DaXoa: false },
      select: { MaSv: true, HoTen: true, MaNganh: true, NGANHHOC: { select: { MaNganh: true, TenNganh: true, MaKhoa: true, SoTinChiToiThieu: true } } }
    });
    if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });

    let curriculumRows = await prisma.CHUONGTRINHHOC.findMany({
      where: { MaNganh: student.MaNganh, TrangThai: true, MONHOC: { DaXoa: false, TrangThai: true } },
      orderBy: [{ HocKyDuKien: 'asc' }, { MaMonHoc: 'asc' }],
      include: { MONHOC: { include: { KHOA: true } } }
    });

    if (!curriculumRows.length && student.NGANHHOC?.MaKhoa) {
      const fallbackCourses = await prisma.MONHOC.findMany({
        where: { MaKhoa: student.NGANHHOC.MaKhoa, TrangThai: true, DaXoa: false },
        orderBy: { MaMonHoc: 'asc' },
        include: { KHOA: true }
      });
      curriculumRows = fallbackCourses.map((course, index) => ({
        MaNganh: student.MaNganh,
        MaMonHoc: course.MaMonHoc,
        HocKyDuKien: Math.min(Math.floor(index / 6) + 1, 8),
        BatBuoc: true,
        MONHOC: course
      }));
    }

    const [completedHistory, activeRegs] = await Promise.all([
      prisma.MONDAHOC.findMany({
        where: { MaSv: studentId, DaXoa: false },
        orderBy: [{ LanHoc: 'desc' }, { NgayTao: 'desc' }],
        select: { MaMonHoc: true, KetQua: true, LanHoc: true }
      }),
      prisma.CHITIETDANGKY.findMany({
        where: { TrangThai: ACTIVE_REGISTRATION_STATUS, PHIEUDANGKY: { MaSv: studentId } },
        select: { MaMonHoc: true }
      })
    ]);

    const historyMap = new Map();
    completedHistory.forEach((history) => {
      if (!historyMap.has(history.MaMonHoc)) historyMap.set(history.MaMonHoc, []);
      historyMap.get(history.MaMonHoc).push(history);
    });
    const activeSet = new Set(activeRegs.map((row) => row.MaMonHoc));

    const courses = curriculumRows.map((row) => {
      const course = row.MONHOC;
      const histories = historyMap.get(row.MaMonHoc) || [];
      const passed = histories.some((history) => history.KetQua === 'qua_mon');
      const failed = histories.some((history) => history.KetQua === 'rot');
      const registered = activeSet.has(row.MaMonHoc);
      const latestHistory = histories[0] || null;
      const status = passed ? 'passed' : registered ? 'registered' : failed ? 'failed' : 'not_started';
      return {
        MaNganh: row.MaNganh,
        MaMonHoc: row.MaMonHoc,
        TenMonHoc: course.TenMonHoc,
        LoaiMon: course.LoaiMon,
        SoTinChi: Number(course.SoTinChi || 0),
        HocKyDuKien: row.HocKyDuKien || 8,
        BatBuoc: row.BatBuoc !== false,
        MaKhoa: course.MaKhoa,
        TenKhoa: course.KHOA?.TenKhoa,
        status,
        history: latestHistory ? { KetQua: latestHistory.KetQua, LanHoc: latestHistory.LanHoc } : null
      };
    });

    const semesters = Array.from({ length: 8 }, (_, index) => ({
      HocKyDuKien: index + 1,
      courses: courses.filter((course) => Number(course.HocKyDuKien) === index + 1)
    }));
    const totalCredits = courses.reduce((sum, course) => sum + Number(course.SoTinChi || 0), 0);
    const completedCredits = courses.filter((course) => course.status === 'passed').reduce((sum, course) => sum + Number(course.SoTinChi || 0), 0);

    res.json({
      success: true,
      data: {
        student: { MaSv: student.MaSv, HoTen: student.HoTen, MaNganh: student.MaNganh, TenNganh: student.NGANHHOC?.TenNganh },
        summary: { totalCourses: courses.length, totalCredits, completedCredits, remainingCredits: Math.max(totalCredits - completedCredits, 0) },
        semesters,
        courses
      }
    });
  } catch (error) {
    console.error('Get curriculum error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStats,
  getMyCurriculum,
  getOpenedClasses
};
