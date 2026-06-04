const prisma = require('../config/database');
const XLSX = require('xlsx');
const { formatCourse, formatCourseList } = require('../models/courseModel');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { filterRowsByRegex, paginateRows } = require('../utils/searchRegex');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { getThesisEligibility } = require('../services/curriculumService');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';
const VALID_COURSE_TYPES = new Set(['LT', 'TH']);
const VALID_COURSE_SEARCH_FIELDS = new Set(['all', 'MaMonHoc', 'TenMonHoc', 'LoaiMon', 'MaKhoa']);

const normalizeText = (value) => String(value || '').trim();

const normalizeLookupText = (value) => normalizeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const calculateCourseCredits = (lessonCount, courseType) => {
  const divisor = courseType === 'TH' ? 30 : 15;
  return Math.floor(Number(lessonCount || 0) / divisor);
};

const normalizeCourseType = (value) => {
  const raw = normalizeText(value).toUpperCase();
  if (VALID_COURSE_TYPES.has(raw)) return raw;
  const keyword = normalizeLookupText(value);
  if (keyword === 'ly thuyet' || keyword === 'ly thuyet ' || keyword.includes('ly thuyet')) return 'LT';
  if (keyword === 'thuc hanh' || keyword.includes('thuc hanh')) return 'TH';
  return raw;
};

const normalizeExcelValue = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object' && value.text) return normalizeText(value.text);
  if (typeof value === 'object' && value.result) return normalizeText(value.result);
  return normalizeText(value);
};

const parseCourseStatus = (value) => {
  const text = normalizeLookupText(value);
  if (!text) return true;
  if (['true', '1', 'dang dung', 'dang hoat dong', 'active'].includes(text)) return true;
  if (['false', '0', 'tam khoa', 'tam dung', 'inactive'].includes(text)) return false;
  return null;
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
    const { page, limit } = getPagination(req.query);
    const { search = '', searchField = 'all', LoaiMon, MaKhoa, TrangThai, sortBy = 'MaMonHoc', sortOrder = 'asc', all } = req.query;
    const returnAll = all === 'true';
    const where = notDeleted();
    if (LoaiMon) where.LoaiMon = LoaiMon;
    if (MaKhoa) where.MaKhoa = MaKhoa;
    if (TrangThai !== undefined) where.TrangThai = TrangThai === 'true';

    const validSort = ['MaMonHoc', 'TenMonHoc', 'SoTinChi', 'NgayTao', 'NgayCapNhat'];
    const orderField = validSort.includes(sortBy) ? sortBy : 'MaMonHoc';
    const allRows = await prisma.MONHOC.findMany({
      where,
      orderBy: { [orderField]: String(sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc' },
      include: { KHOA: true }
    });
    const filtered = filterRowsByRegex(allRows, search, (row) => getCourseRegexValues(row, searchField));
    const rows = returnAll ? filtered : paginateRows(filtered, page, limit);
    const total = filtered.length;
    res.json({ success: true, data: formatCourseList(rows), pagination: getPaginationMeta(total, returnAll ? 1 : page, returnAll ? Math.max(total, 1) : limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'Get all courses error:');
  }
};

const getCourseById = async (req, res) => {
  try {
    const mh = await prisma.MONHOC.findFirst({
      where: { MaMonHoc: req.params.id, DaXoa: false },
      include: { KHOA: true }
    });
    if (!mh) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    res.json({ success: true, data: formatCourse(mh) });
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
    const courseType = normalizeCourseType(LoaiMon);
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
    if (req.body.MaMonHoc !== undefined && normalizeText(req.body.MaMonHoc) !== req.params.id) {
      return res.status(400).json({ success: false, message: 'Mã môn học không được sửa' });
    }
    if (req.body.SoTinChi !== undefined) {
      return res.status(400).json({ success: false, message: 'Số tín chỉ không được sửa trực tiếp; hệ thống tính theo số tiết và loại môn' });
    }
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
      const courseType = normalizeCourseType(LoaiMon);
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
    const { search = '', searchField = 'all', LoaiMon, MaKhoa } = req.query;
    const where = notDeleted();
    if (LoaiMon) where.LoaiMon = LoaiMon;
    if (MaKhoa) where.MaKhoa = MaKhoa;
    const allRows = await prisma.MONHOC.findMany({
      where,
      orderBy: { MaMonHoc: 'asc' },
      include: { KHOA: true }
    });
    const rows = filterRowsByRegex(allRows, search, (row) => getCourseRegexValues(row, searchField));
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

const normalizeImportHeader = (value) => normalizeLookupText(value).replace(/[^a-z0-9]/g, '');

const findImportColumn = (headers, aliases) => {
  const normalizedAliases = aliases.map(normalizeImportHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeImportHeader(header)));
};

const importCourses = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel' });
    }

    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Không thể đọc file Excel. Vui lòng dùng file .xls hoặc .xlsx đúng format' });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : null;
    if (!sheet) return res.status(400).json({ success: false, message: 'File Excel không có sheet dữ liệu' });

    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!matrix.length) return res.status(400).json({ success: false, message: 'File Excel không có dữ liệu' });

    const headers = matrix[0].map(normalizeExcelValue);
    const columns = {
      MaMonHoc: findImportColumn(headers, ['MaMonHoc', 'Mã môn', 'Mã môn học']),
      TenMonHoc: findImportColumn(headers, ['TenMonHoc', 'Tên môn học', 'Tên môn']),
      LoaiMon: findImportColumn(headers, ['LoaiMon', 'Loại môn', 'Loại']),
      SoTinChi: findImportColumn(headers, ['SoTinChi', 'Số tín chỉ', 'Tín chỉ']),
      SoTiet: findImportColumn(headers, ['SoTiet', 'Số tiết']),
      Khoa: findImportColumn(headers, ['Khoa', 'MaKhoa', 'Mã khoa', 'Tên khoa']),
      TrangThai: findImportColumn(headers, ['TrangThai', 'Trạng thái'])
    };
    const missingHeaders = [
      ['MaMonHoc', 'MaMonHoc'],
      ['TenMonHoc', 'TenMonHoc'],
      ['LoaiMon', 'LoaiMon'],
      ['SoTiet', 'SoTiet'],
      ['Khoa', 'Khoa']
    ].filter(([key]) => columns[key] < 0).map(([, label]) => label);

    if (missingHeaders.length) {
      return res.status(400).json({ success: false, message: 'File Excel thiếu cột bắt buộc: ' + missingHeaders.join(', ') });
    }

    const inputRows = matrix.slice(1).map((cells, index) => ({ cells, rowNumber: index + 2 })).filter(({ cells }) => (
      cells.some((cell) => normalizeExcelValue(cell))
    ));
    if (!inputRows.length) return res.status(400).json({ success: false, message: 'File Excel không có dòng dữ liệu' });

    const faculties = await prisma.KHOA.findMany({
      where: { DaXoa: false },
      select: { MaKhoa: true, TenKhoa: true }
    });
    const facultyByCode = new Map(faculties.map((faculty) => [normalizeLookupText(faculty.MaKhoa), faculty.MaKhoa]));
    const facultyByName = new Map(faculties.map((faculty) => [normalizeLookupText(faculty.TenKhoa), faculty.MaKhoa]));
    const seenCourseCodes = new Map();
    const rowResults = [];
    const validRows = [];

    inputRows.forEach(({ cells, rowNumber }) => {
      const getCell = (key) => columns[key] >= 0 ? normalizeExcelValue(cells[columns[key]]) : '';
      const MaMonHoc = getCell('MaMonHoc');
      const TenMonHoc = getCell('TenMonHoc');
      const LoaiMon = normalizeCourseType(getCell('LoaiMon'));
      const SoTiet = parsePositiveInteger(getCell('SoTiet'));
      const SoTinChiRaw = getCell('SoTinChi');
      const KhoaRaw = getCell('Khoa');
      const TrangThaiRaw = getCell('TrangThai');
      const errors = [];

      if (!MaMonHoc) errors.push('Thiếu mã môn học');
      if (!TenMonHoc) errors.push('Thiếu tên môn học');
      if (!VALID_COURSE_TYPES.has(LoaiMon)) errors.push('Loại môn học phải là LT hoặc TH');
      if (!SoTiet) errors.push('Số tiết phải là số nguyên dương');

      const facultyKey = normalizeLookupText(KhoaRaw);
      const MaKhoa = facultyByCode.get(facultyKey) || facultyByName.get(facultyKey) || '';
      if (!MaKhoa) errors.push('Khoa không tồn tại; cột Khoa chấp nhận mã khoa hoặc tên khoa');

      const TrangThai = columns.TrangThai >= 0 ? parseCourseStatus(TrangThaiRaw) : true;
      if (TrangThai === null) errors.push('Trạng thái phải là Đang dùng/Tạm khóa hoặc true/false');

      if (MaMonHoc) {
        const duplicateRow = seenCourseCodes.get(MaMonHoc.toUpperCase());
        if (duplicateRow) errors.push('Trùng mã môn học trong file với dòng ' + duplicateRow);
        else seenCourseCodes.set(MaMonHoc.toUpperCase(), rowNumber);
      }

      if (SoTinChiRaw && SoTiet && VALID_COURSE_TYPES.has(LoaiMon)) {
        const parsedCredit = Number(SoTinChiRaw);
        const expectedCredit = calculateCourseCredits(SoTiet, LoaiMon);
        if (!Number.isInteger(parsedCredit)) {
          errors.push('Số tín chỉ trong file phải là số nguyên nếu có nhập');
        } else if (parsedCredit !== expectedCredit) {
          errors.push('Số tín chỉ phải là ' + expectedCredit + ' theo số tiết và loại môn; không nhập trực tiếp giá trị khác');
        }
      }

      const result = {
        row: rowNumber,
        MaMonHoc,
        TenMonHoc,
        status: errors.length ? 'failed' : 'pending',
        message: errors.join('; ')
      };
      rowResults.push(result);
      if (!errors.length) validRows.push({ rowNumber, MaMonHoc, TenMonHoc, LoaiMon, SoTiet, MaKhoa, TrangThai, result });
    });

    const existingCourses = validRows.length ? await prisma.MONHOC.findMany({
      where: { MaMonHoc: { in: validRows.map((row) => row.MaMonHoc) } },
      select: { MaMonHoc: true, DaXoa: true }
    }) : [];
    const existingByCode = new Map(existingCourses.map((course) => [course.MaMonHoc, course]));

    for (const row of validRows) {
      const existing = existingByCode.get(row.MaMonHoc);
      if (existing) {
        row.result.status = 'failed';
        row.result.message = existing.DaXoa ? 'Mã môn học đang nằm trong thùng rác, cần khôi phục hoặc đổi mã' : 'Mã môn học đã tồn tại';
        continue;
      }

      try {
        await prisma.MONHOC.create({
          data: {
            MaMonHoc: row.MaMonHoc,
            TenMonHoc: row.TenMonHoc,
            SoTiet: row.SoTiet,
            LoaiMon: row.LoaiMon,
            MaKhoa: row.MaKhoa,
            TrangThai: row.TrangThai,
            ...updateAudit(req)
          }
        });
        row.result.status = 'success';
        row.result.message = 'Nhập thành công';
        existingByCode.set(row.MaMonHoc, { MaMonHoc: row.MaMonHoc, DaXoa: false });
      } catch (error) {
        row.result.status = 'failed';
        row.result.message = error.code === 'P2002' ? 'Mã môn học đã tồn tại' : 'Không thể tạo môn học';
      }
    }

    const successCount = rowResults.filter((row) => row.status === 'success').length;
    const errorCount = rowResults.filter((row) => row.status === 'failed').length;
    res.json({
      success: true,
      message: 'Nhập Excel hoàn tất: thành công ' + successCount + ', thất bại ' + errorCount,
      data: { successCount, errorCount, rows: rowResults }
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Không thể nhập Excel môn học', 'importCourses error:');
  }
};

const getOpenedClasses = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query);
    const { search = '', MaHocKy, MaKhoa } = req.query;
    const where = { LOP: { DaXoa: false, MONHOC: { DaXoa: false } }, HOCKY: { DaXoa: false } };
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (MaKhoa) where.LOP.MONHOC.MaKhoa = MaKhoa;

    const allRows = await prisma.LOPMO.findMany({
      where,
      include: { LOP: { include: { MONHOC: { include: { KHOA: true } } } }, HOCKY: { include: { NAMHOC: true } } }
    });
    const filtered = filterRowsByRegex(allRows, search, (row) => [row.LOP?.MONHOC?.MaMonHoc, row.LOP?.MONHOC?.TenMonHoc]);
    const rows = paginateRows(filtered, page, limit);
    res.json({ success: true, data: rows, pagination: getPaginationMeta(filtered.length, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'L\u1ed7i m\u00e1y ch\u1ee7', 'Get opened classes error:');
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
  exportCourses,
  importCourses
};
