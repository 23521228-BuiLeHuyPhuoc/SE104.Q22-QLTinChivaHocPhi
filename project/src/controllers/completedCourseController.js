const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { ACTIVE_REGISTRATION_STATUS } = require('../services/curriculumService');
const XLSX = require('xlsx');

const VALID_RESULTS = ['qua_mon', 'rot'];

const parsePositiveInteger = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseAttemptNumber = (item) => {
  const value = item.LanHoc ?? item.lanhoc;
  return value === undefined || value === null || value === '' ? 1 : parsePositiveInteger(value);
};

const getStudentIdFromRequest = async (req) => {
  if (req.user?.MaSv) return req.user.MaSv;
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaTaiKhoan: Number(req.user?.MaTaiKhoan || req.user?.id || 0), DaXoa: false },
    select: { MaSv: true }
  });
  return student?.MaSv || null;
};

const normalizeResult = (value) => {
  if (!value) return '';
  const val = String(value).toLowerCase().trim();
  if (val === 'qua_mon' || val === 'rot') return val;
  if (['đậu', 'đạt', 'dat', 'dau', 'passed', 'qua môn', 'qua mon', 'qua', 'Qua môn', 'Qua môn'].includes(val)) return 'qua_mon';
  if (['rớt', 'không đạt', 'rot', 'failed', 'trượt', 'truot', 'Rớt', 'Không đạt', 'Failed', 'Trượt', 'Rot', 'khong dat', 'Khong dat'].includes(val)) return 'rot';
  return value;
};

const splitDelimitedLine = (line) => {
  const delimiter = line.includes('\t') ? '\t' : ',';
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim().replace(/^"|"$/g, ''));
  return cells;
};

const parseImportBuffer = (buffer) => {
  // Thử đọc file Excel (.xls/.xlsx) trước
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (sheetName) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      if (rows.length) {
        return rows.map((row) => {
          const cleaned = {};
          Object.keys(row).forEach((key) => {
            cleaned[key.trim()] = String(row[key] ?? '').trim();
          });
          return cleaned;
        });
      }
    }
  } catch (_xlsxError) {
    // Không phải file Excel, chuyển sang đọc CSV/TSV
  }

  // Fallback: đọc file CSV/TSV/TXT dạng text
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = splitDelimitedLine(lines[0]).map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });
};

const normalizeCompletedPayload = (item) => ({
  MaSv: String(item.MaSv || item.MSSV || item.masv || '').trim(),
  MaMonHoc: String(item.MaMonHoc || item.Mamonhoc || item.MaMon || item.mamonhoc || '').trim().toUpperCase(),
  MaHocKy: String(item.MaHocKy || item.Hocky || item.HocKy || item.hocky || '').trim(),
  MaLop: String(item.MaLop || item.Lop || item.lop || '').trim() || null,
  LanHoc: parseAttemptNumber(item),
  KetQua: normalizeResult(item.KetQua || item.ketqua || item.Result || ''),
  GhiChu: item.GhiChu || item.ghichu || null
});

const validateCompletedRows = async (items) => {
  const rows = items.map(normalizeCompletedPayload);
  const errors = [];
  rows.forEach((row, index) => {
    if (!row.LanHoc) errors.push({ index, message: 'LanHoc phai la so nguyen duong', row });
    if (!row.MaSv || !row.MaMonHoc || !row.MaHocKy || !row.KetQua) errors.push({ index, message: 'Thiếu MSSV, MaMonHoc, HocKy hoặc KetQua', row });
    if (row.KetQua && !VALID_RESULTS.includes(row.KetQua)) errors.push({ index, message: 'Kết quả không hợp lệ', row });
  });
  if (errors.length) return { rows, errors };

  const [students, courses, semesters] = await Promise.all([
    prisma.SINHVIEN.findMany({ where: { MaSv: { in: [...new Set(rows.map((row) => row.MaSv))] }, DaXoa: false }, select: { MaSv: true } }),
    prisma.MONHOC.findMany({ where: { MaMonHoc: { in: [...new Set(rows.map((row) => row.MaMonHoc))] }, DaXoa: false }, select: { MaMonHoc: true } }),
    prisma.HOCKY.findMany({ where: { MaHocKy: { in: [...new Set(rows.map((row) => row.MaHocKy))] }, DaXoa: false }, select: { MaHocKy: true } })
  ]);
  const studentSet = new Set(students.map((row) => row.MaSv));
  const courseSet = new Set(courses.map((row) => row.MaMonHoc));
  const semesterSet = new Set(semesters.map((row) => row.MaHocKy));
  rows.forEach((row, index) => {
    if (!studentSet.has(row.MaSv)) errors.push({ index, message: 'MSSV không tồn tại', row });
  if (!courseSet.has(row.MaMonHoc)) errors.push({ index, message: 'Mã môn không tồn tại', row });
    if (!semesterSet.has(row.MaHocKy)) errors.push({ index, message: 'Học kỳ không tồn tại', row });
  });
  return { rows, errors };
};

const getMyCompletedCourses = async (req, res) => {
  try {
    const maSv = await getStudentIdFromRequest(req);
    if (!maSv) {
      return res.status(403).json({ success: false, message: 'Không xác định được sinh viên hiện tại' });
    }

    const { page, limit, skip } = getPagination(req.query);
    const { MaHocKy, KetQua, search, LoaiMon, MaKhoa } = req.query;
    const where = { MaSv: maSv, DaXoa: false };
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (KetQua) where.KetQua = KetQua;
    if (LoaiMon || MaKhoa) {
      where.MONHOC = {
        ...(LoaiMon ? { LoaiMon } : {}),
        ...(MaKhoa ? { MaKhoa } : {})
      };
    }
    if (search) {
      where.OR = [
        { MaMonHoc: { contains: search, mode: 'insensitive' } },
        { MONHOC: { TenMonHoc: { contains: search, mode: 'insensitive' } } },
        { MONHOC: { LoaiMon: { contains: search, mode: 'insensitive' } } },
        { MONHOC: { KHOA: { TenKhoa: { contains: search, mode: 'insensitive' } } } },
        { MaLop: { contains: search, mode: 'insensitive' } },
        { LOP: { TenLop: { contains: search, mode: 'insensitive' } } },
        { LOP: { GiangVien: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [completedCourses, allRows, total] = await Promise.all([
      prisma.MONDAHOC.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ MaHocKy: 'desc' }, { LanHoc: 'desc' }, { NgayTao: 'desc' }, { id: 'desc' }],
        include: {
          MONHOC: { select: { MaMonHoc: true, TenMonHoc: true, SoTinChi: true, LoaiMon: true, KHOA: { select: { MaKhoa: true, TenKhoa: true } } } },
          HOCKY: { select: { MaHocKy: true, TenHocKy: true, NAMHOC: { select: { TenNamHoc: true } } } },
          LOP: { select: { MaLop: true, TenLop: true, GiangVien: true } }
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
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'getMyCompletedCourses error:');
  }
};

const getAllCompletedCourses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, searchField = 'all', MaSv, MaHocKy, MaMonHoc, KetQua, MaKhoa, LoaiMon, SoTinChi, all } = req.query;
    const where = notDeleted();

    if (MaSv) where.MaSv = MaSv;
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (MaMonHoc) where.MaMonHoc = MaMonHoc;
    if (KetQua) where.KetQua = KetQua;
    if (MaKhoa || LoaiMon || SoTinChi) {
      where.MONHOC = {
        ...(MaKhoa ? { MaKhoa } : {}),
        ...(LoaiMon ? { LoaiMon } : {}),
        ...(SoTinChi ? { SoTinChi: parseInt(SoTinChi, 10) } : {})
      };
    }
    if (search) {
      if (searchField === 'MaSv') where.MaSv = { contains: search, mode: 'insensitive' };
      else if (searchField === 'HoTen') where.SINHVIEN = { HoTen: { contains: search, mode: 'insensitive' } };
      else if (searchField === 'MaHocKy') where.OR = [
        { MaHocKy: { contains: search, mode: 'insensitive' } },
        { HOCKY: { TenHocKy: { contains: search, mode: 'insensitive' } } },
        { HOCKY: { NAMHOC: { TenNamHoc: { contains: search, mode: 'insensitive' } } } },
        { HOCKY: { MaNamHoc: { contains: search, mode: 'insensitive' } } }
      ];
      else where.OR = [
        { MaSv: { contains: search, mode: 'insensitive' } },
        { SINHVIEN: { HoTen: { contains: search, mode: 'insensitive' } } },
        { MaHocKy: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [completedCourses, total] = await Promise.all([
      prisma.MONDAHOC.findMany({
        where,
        skip: all === 'true' ? undefined : skip,
        take: all === 'true' ? undefined : limit,
        orderBy: [{ NgayTao: 'desc' }, { id: 'desc' }],
        include: {
          SINHVIEN: { select: { MaSv: true, HoTen: true } },
          MONHOC: { select: { MaMonHoc: true, TenMonHoc: true, SoTinChi: true, LoaiMon: true, KHOA: { select: { MaKhoa: true, TenKhoa: true } } } },
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
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'getAllCompletedCourses error:');
  }
};

const createCompletedCourse = async (req, res) => {
  try {
    const { MaSv, MaMonHoc, MaHocKy, MaLop, LanHoc, KetQua, GhiChu } = req.body;
    const result = normalizeResult(KetQua);
    const attemptNumber = LanHoc === undefined || LanHoc === null || LanHoc === '' ? 1 : parsePositiveInteger(LanHoc);

    if (!attemptNumber) {
      return res.status(400).json({ success: false, message: 'LanHoc phai la so nguyen duong' });
    }

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
        LanHoc: attemptNumber,
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
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'createCompletedCourse error:');
  }
};

const updateCompletedCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const recordId = parsePositiveInteger(id);
  if (!recordId) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    const { MaSv, MaMonHoc, MaHocKy, MaLop, LanHoc, KetQua, GhiChu } = req.body;
    const data = updateAudit(req);
    const existing = await prisma.MONDAHOC.findFirst({ where: { id: recordId, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay mon da hoc' });

    if (MaSv !== undefined && MaSv !== existing.MaSv) return res.status(400).json({ success: false, message: 'Khong duoc phep sua MSSV cua mon da hoc' });
    if (MaMonHoc !== undefined && MaMonHoc !== existing.MaMonHoc) return res.status(400).json({ success: false, message: 'Khong duoc phep sua ma mon hoc cua mon da hoc' });
    if (MaHocKy !== undefined && MaHocKy !== existing.MaHocKy) return res.status(400).json({ success: false, message: 'Khong duoc phep sua hoc ky cua mon da hoc' });
    if (LanHoc !== undefined && Number(LanHoc) !== Number(existing.LanHoc)) return res.status(400).json({ success: false, message: 'Khong duoc phep sua lan hoc cua mon da hoc' });

    if (MaSv !== undefined) data.MaSv = MaSv;
    if (MaMonHoc !== undefined) data.MaMonHoc = MaMonHoc;
    if (MaHocKy !== undefined) data.MaHocKy = MaHocKy;
    if (MaLop !== undefined) data.MaLop = MaLop || null;
    if (LanHoc !== undefined) {
      const attemptNumber = parsePositiveInteger(LanHoc);
      if (!attemptNumber) return res.status(400).json({ success: false, message: 'LanHoc phai la so nguyen duong' });
      data.LanHoc = attemptNumber;
    }
    if (KetQua !== undefined) {
      const result = normalizeResult(KetQua);
      if (!VALID_RESULTS.includes(result)) {
    return res.status(400).json({ success: false, message: 'Kết quả môn đã học không hợp lệ' });
      }
      data.KetQua = result;
    }
    if (GhiChu !== undefined) data.GhiChu = GhiChu;

    const completedCourse = await prisma.MONDAHOC.update({ where: { id: recordId }, data });
    res.json({ success: true, message: 'Cập nhật môn đã học thành công', data: completedCourse });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Môn đã học cho sinh viên, học kỳ và lần học này đã tồn tại' });
    }
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'updateCompletedCourse error:');
  }
};

const deleteCompletedCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const recordId = parsePositiveInteger(id);
  if (!recordId) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    await prisma.MONDAHOC.update({ where: { id: recordId }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển môn đã học vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'deleteCompletedCourse error:');
  }
};

const batchCreateCompletedCourses = async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items || [];
    const previewOnly = req.body.preview === true || req.body.preview === 'true';
    if (!items.length) return res.status(400).json({ success: false, message: 'Không có dữ liệu để xử lý' });
    const validated = await validateCompletedRows(items);
    if (validated.errors.length || previewOnly) {
      return res.json({ success: validated.errors.length === 0, preview: true, data: validated.rows, errors: validated.errors });
    }
    const created = await prisma.$transaction(validated.rows.map((row) => prisma.MONDAHOC.create({
      data: { ...row, ...updateAudit(req) }
    })));
    res.status(201).json({ success: true, message: `Đã tạo ${created.length} dòng môn đã học`, data: created });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Có dòng bị trùng dữ liệu môn đã học' });
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'batchCreateCompletedCourses error:');
  }
};

const importCompletedCourses = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ success: false, message: 'Vui lòng chọn file CSV/TSV/XLS xuất từ Excel' });
    const rows = parseImportBuffer(req.file.buffer);
    req.body.items = rows;
    req.body.preview = req.body.preview !== 'false';
    return batchCreateCompletedCourses(req, res);
  } catch (error) {
        return sendErrorResponse(res, error, 'Không thể import file', 'importCompletedCourses error:');
  }
};

const getClassGradeRoster = async (req, res) => {
  try {
    const { MaLop, MaHocKy } = req.query;
    if (!MaLop || !MaHocKy) return res.status(400).json({ success: false, message: 'Vui lòng chọn lớp và học kỳ' });
    const rows = await prisma.CHITIETDANGKY.findMany({
      where: { MaLop, TrangThai: ACTIVE_REGISTRATION_STATUS, PHIEUDANGKY: { MaHocKy } },
      include: { PHIEUDANGKY: { include: { SINHVIEN: true } }, MONHOC: true, LOP: true },
      orderBy: { id: 'asc' }
    });
    res.json({ success: true, data: rows.map((row) => ({
      MaSv: row.PHIEUDANGKY.MaSv,
      HoTen: row.PHIEUDANGKY.SINHVIEN?.HoTen,
      MaMonHoc: row.MaMonHoc,
      TenMonHoc: row.MONHOC?.TenMonHoc,
      MaLop: row.MaLop,
      TenLop: row.LOP?.TenLop,
      MaHocKy
    })) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'getClassGradeRoster error:');
  }
};

module.exports = {
  getMyCompletedCourses,
  getAllCompletedCourses,
  createCompletedCourse,
  updateCompletedCourse,
  deleteCompletedCourse,
  batchCreateCompletedCourses,
  importCompletedCourses,
  getClassGradeRoster
};
