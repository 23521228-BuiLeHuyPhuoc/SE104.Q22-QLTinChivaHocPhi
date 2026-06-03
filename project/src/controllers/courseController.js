const prisma = require('../config/database');
const { formatCourse, formatCourseList } = require('../models/courseModel');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { getThesisEligibility } = require('../services/curriculumService');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';
const VALID_COURSE_TYPES = new Set(['LT', 'TH']);

const normalizeText = (value) => String(value || '').trim();

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

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
    const { search = '', LoaiMon, MaKhoa, TrangThai, sortBy = 'MaMonHoc', sortOrder = 'asc', all } = req.query;
    const returnAll = all === 'true';
    const where = notDeleted();
    if (search) where.OR = [{ MaMonHoc: { contains: search, mode: 'insensitive' } }, { TenMonHoc: { contains: search, mode: 'insensitive' } }];
    if (LoaiMon) where.LoaiMon = LoaiMon;
    if (MaKhoa) where.MaKhoa = MaKhoa;
    if (TrangThai !== undefined) where.TrangThai = TrangThai === 'true';

    const validSort = ['MaMonHoc', 'TenMonHoc', 'SoTinChi', 'NgayTao', 'NgayCapNhat'];
    const orderField = validSort.includes(sortBy) ? sortBy : 'MaMonHoc';
    const isAll = all === 'true';
    const [rows, total] = await Promise.all([
      prisma.MONHOC.findMany({
        where,
        ...(returnAll ? {} : { skip, take: limit }),
        orderBy: { [orderField]: String(sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: { KHOA: true }
      }),
      prisma.MONHOC.count({ where })
    ]);
    res.json({ success: true, data: formatCourseList(rows), pagination: getPaginationMeta(total, returnAll ? 1 : page, returnAll ? Math.max(total, 1) : limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Get all courses error:');
  }
};

const getCourseById = async (req, res) => {
  try {
    const mh = await prisma.MONHOC.findFirst({
      where: { MaMonHoc: req.params.id, DaXoa: false },
      include: {
        KHOA: true,
        DIEUKIENMONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC: {
          where: { DaXoa: false, TrangThai: true },
          include: { MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC: true }
        },
        LOP: {
          where: { DaXoa: false },
          include: { LOPMO: { include: { HOCKY: { include: { NAMHOC: true } } } } },
          orderBy: { MaLop: 'asc' }
        },
        CHUONGTRINHHOC: {
          include: { NGANHHOC: true },
          orderBy: [{ MaNganh: 'asc' }, { HocKyDuKien: 'asc' }]
        }
      }
    });
    if (!mh) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    const prerequisites = mh.DIEUKIENMONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC.map((dk) => ({
      MaMonDieuKien: dk.MaMonDieuKien,
      TenMonDieuKien: dk.MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC.TenMonHoc,
      LoaiDieuKien: dk.LoaiDieuKien
    }));
    const openedClasses = (mh.LOP || []).flatMap((lop) => (lop.LOPMO || []).map((opened) => ({
      MaLop: lop.MaLop,
      TenLop: lop.TenLop,
      GiangVien: lop.GiangVien,
      MaHocKy: opened.MaHocKy,
      TenHocKy: opened.HOCKY?.TenHocKy,
      TenNamHoc: opened.HOCKY?.NAMHOC?.TenNamHoc,
      TrangThai: opened.TrangThai
    })));
    const curricula = (mh.CHUONGTRINHHOC || []).map((row) => ({
      MaNganh: row.MaNganh,
      TenNganh: row.NGANHHOC?.TenNganh,
      HocKyDuKien: row.HocKyDuKien,
      BatBuoc: row.BatBuoc !== false,
      TrangThai: row.TrangThai !== false
    }));
    res.json({ success: true, data: { ...formatCourse(mh), prerequisites, openedClasses, curricula } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Get course by ID error:');
  }
};

const createCourse = async (req, res) => {
  try {
    const { MaMonHoc, TenMonHoc, SoTiet, LoaiMon, MaKhoa, MoTa } = req.body;
    const courseId = normalizeText(MaMonHoc);
    const courseName = normalizeText(TenMonHoc);
    const facultyId = normalizeText(MaKhoa);
    const courseType = normalizeText(LoaiMon).toUpperCase();
    const lessonCount = parsePositiveInteger(SoTiet);

    if (!courseId || !courseName || !lessonCount || !courseType || !facultyId) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin hợp lệ' });
    }
    if (!VALID_COURSE_TYPES.has(courseType)) {
      return res.status(400).json({ success: false, message: 'Loại môn học không hợp lệ' });
    }

    const existing = await prisma.MONHOC.findUnique({ where: { MaMonHoc: courseId } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã môn học đã tồn tại' });
    const course = await prisma.MONHOC.create({
      data: {
        MaMonHoc: courseId,
        TenMonHoc: courseName,
        SoTiet: lessonCount,
        LoaiMon: courseType,
        MaKhoa: facultyId,
        MoTa: MoTa !== undefined ? normalizeText(MoTa) || null : null,
        ...updateAudit(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tạo môn học thành công', data: course });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Create course error:');
  }
};

const updateCourse = async (req, res) => {
  try {
    const existing = await prisma.MONHOC.findFirst({ where: { MaMonHoc: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    const { TenMonHoc, SoTiet, LoaiMon, MaKhoa, MoTa, TrangThai } = req.body;
    const data = {};

    if (TenMonHoc !== undefined) {
      const courseName = normalizeText(TenMonHoc);
      if (!courseName) return res.status(400).json({ success: false, message: 'Tên môn học không được để trống' });
      data.TenMonHoc = courseName;
    }
    if (SoTiet !== undefined) {
      const lessonCount = parsePositiveInteger(SoTiet);
      if (!lessonCount) return res.status(400).json({ success: false, message: 'Số tiết phải là số nguyên dương' });
      data.SoTiet = lessonCount;
    }
    if (LoaiMon !== undefined) {
      const courseType = normalizeText(LoaiMon).toUpperCase();
      if (!VALID_COURSE_TYPES.has(courseType)) return res.status(400).json({ success: false, message: 'Loại môn học không hợp lệ' });
      data.LoaiMon = courseType;
    }
    if (MaKhoa !== undefined) {
      const facultyId = normalizeText(MaKhoa);
      if (!facultyId) return res.status(400).json({ success: false, message: 'Khoa không được để trống' });
      data.MaKhoa = facultyId;
    }
    if (MoTa !== undefined) data.MoTa = normalizeText(MoTa) || null;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    Object.assign(data, updateAudit(req));
    const updated = await prisma.MONHOC.update({ where: { MaMonHoc: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật môn học thành công', data: updated });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Update course error:');
  }
};

const deleteCourse = async (req, res) => {
  try {
    const existing = await prisma.MONHOC.findFirst({ where: { MaMonHoc: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    await prisma.MONHOC.update({ where: { MaMonHoc: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển môn học vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Delete course error:');
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
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Get course stats error:');
  }
};

const escapeCell = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const exportCourses = async (req, res) => {
  try {
    const { search = '', LoaiMon, MaKhoa } = req.query;
    const where = notDeleted();
    if (search) where.OR = [{ MaMonHoc: { contains: search, mode: 'insensitive' } }, { TenMonHoc: { contains: search, mode: 'insensitive' } }];
    if (LoaiMon) where.LoaiMon = LoaiMon;
    if (MaKhoa) where.MaKhoa = MaKhoa;
    const rows = await prisma.MONHOC.findMany({
      where,
      orderBy: { MaMonHoc: 'asc' },
      include: { KHOA: true }
    });
    const htmlRows = rows.map((row) => (
      '<tr>' +
      `<td>${escapeCell(row.MaMonHoc)}</td>` +
      `<td>${escapeCell(row.TenMonHoc)}</td>` +
      `<td>${escapeCell(row.LoaiMon)}</td>` +
      `<td>${escapeCell(row.SoTinChi)}</td>` +
      `<td>${escapeCell(row.SoTiet)}</td>` +
      `<td>${escapeCell(row.KHOA?.TenKhoa || row.MaKhoa)}</td>` +
      `<td>${escapeCell(row.TrangThai === false ? 'Tạm khóa' : 'Đang dùng')}</td>` +
      '</tr>'
    )).join('');
    const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr><th>MaMonHoc</th><th>TenMonHoc</th><th>LoaiMon</th><th>SoTinChi</th><th>SoTiet</th><th>Khoa</th><th>TrangThai</th></tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="courses.xls"');
    return res.send(workbook);
  } catch (error) {
    return sendErrorResponse(res, error, 'KhA´ng tha»ƒ xuaº¥t danh sA¡ch mA´n ha»c', 'exportCourses error:');
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
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Get opened classes error:');
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

    const [completedHistory, activeRegs, allConditions, eligibility] = await Promise.all([
      prisma.MONDAHOC.findMany({
        where: { MaSv: studentId, DaXoa: false },
        orderBy: [{ LanHoc: 'desc' }, { NgayTao: 'desc' }],
        select: { MaMonHoc: true, KetQua: true, LanHoc: true }
      }),
      prisma.CHITIETDANGKY.findMany({
        where: { TrangThai: ACTIVE_REGISTRATION_STATUS, PHIEUDANGKY: { MaSv: studentId } },
        select: { MaMonHoc: true }
      }),
      prisma.DIEUKIENMONHOC.findMany({
        where: { DaXoa: false, TrangThai: true },
        include: { MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC: { select: { MaMonHoc: true, TenMonHoc: true } } }
      }),
      getThesisEligibility(studentId, req.query.MaHocKy)
    ]);

    const historyMap = new Map();
    completedHistory.forEach((history) => {
      if (!historyMap.has(history.MaMonHoc)) historyMap.set(history.MaMonHoc, []);
      historyMap.get(history.MaMonHoc).push(history);
    });
    const activeSet = new Set(activeRegs.map((row) => row.MaMonHoc));
    const conditionsByCourse = new Map();
    allConditions.forEach((condition) => {
      if (!conditionsByCourse.has(condition.MaMonHoc)) conditionsByCourse.set(condition.MaMonHoc, []);
      conditionsByCourse.get(condition.MaMonHoc).push({
        MaMonDieuKien: condition.MaMonDieuKien,
        TenMonDieuKien: condition.MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC?.TenMonHoc,
        LoaiDieuKien: condition.LoaiDieuKien
      });
    });

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
        prerequisites: conditionsByCourse.get(row.MaMonHoc) || [],
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
        summary: {
          totalCourses: courses.length,
          totalCredits,
          completedCredits,
          remainingCredits: Math.max(totalCredits - completedCredits, 0),
          debtCredits: eligibility?.debtCredits ?? Math.max(totalCredits - completedCredits, 0),
          thesisEligible: eligibility?.eligible ?? false,
          thesisDebtLimit: eligibility?.debtLimit ?? 8,
          missingCourses: eligibility?.missingCourses || []
        },
        semesters,
        courses
      }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Get curriculum error:');
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
  getOpenedClasses,
  exportCourses
};
