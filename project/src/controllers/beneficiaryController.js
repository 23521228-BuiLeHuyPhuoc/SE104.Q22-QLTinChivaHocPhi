const ExcelJS = require('exceljs');
const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { filterRowsByRegex, paginateRows } = require('../utils/searchRegex');

const normalizeText = (value) => String(value || '').trim();

const normalizeExcelValue = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object' && value.text) return String(value.text).trim();
  if (typeof value === 'object' && value.result) return String(value.result).trim();
  return String(value).trim();
};

const parseDiscountPercent = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
};

const normalizeSearchField = (value) => {
  const allowed = ['MaDoiTuong', 'TenDoiTuong'];
  return allowed.includes(value) ? value : 'all';
};

const recomputeBeneficiaryPriorities = async (tx) => {
  const rows = await tx.DOITUONG.findMany({
    where: { DaXoa: false },
    select: { MaDoiTuong: true, TiLeGiamHocPhi: true },
    orderBy: [{ TiLeGiamHocPhi: 'desc' }, { MaDoiTuong: 'asc' }]
  });

  let currentPriority = 0;
  let lastDiscount = null;

  for (const row of rows) {
    const discount = Number(row.TiLeGiamHocPhi || 0);
    if (lastDiscount === null || discount !== lastDiscount) {
      currentPriority += 1;
      lastDiscount = discount;
    }

    await tx.DOITUONG.update({
      where: { MaDoiTuong: row.MaDoiTuong },
      data: { DoUuTien: currentPriority }
    });
  }
};

const getAllBeneficiaries = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query);
    const { search = '' } = req.query;
    const searchField = normalizeSearchField(req.query.searchField);
    const where = notDeleted();

    const rows = await prisma.DOITUONG.findMany({
      where,
      orderBy: [{ DoUuTien: 'asc' }, { TiLeGiamHocPhi: 'desc' }, { MaDoiTuong: 'asc' }],
      include: { _count: { select: { DOITUONGSINHVIEN: true } } }
    });
    const filtered = filterRowsByRegex(rows, search, (row) => {
      const values = {
        MaDoiTuong: [row.MaDoiTuong],
        TenDoiTuong: [row.TenDoiTuong]
      };
      return searchField === 'all' ? Object.values(values).flat() : (values[searchField] || []);
    });
    const beneficiaries = paginateRows(filtered, page, limit);
    const total = filtered.length;
    res.json({ success: true, data: beneficiaries, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi máy chủ', 'getAllBeneficiaries error:');
  }
};

const createBeneficiary = async (req, res) => {
  try {
    const { MaDoiTuong, TenDoiTuong, TiLeGiamHocPhi, MoTa } = req.body;
    const beneficiaryId = normalizeText(MaDoiTuong);
    const beneficiaryName = normalizeText(TenDoiTuong);
    const discountPercent = parseDiscountPercent(TiLeGiamHocPhi);

    if (!beneficiaryId || !beneficiaryName || discountPercent === null) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin hợp lệ' });
    }

    const existing = await prisma.DOITUONG.findUnique({ where: { MaDoiTuong: beneficiaryId } });
    if (existing && existing.DaXoa === false) {
      return res.status(400).json({ success: false, message: 'Mã đối tượng đã tồn tại' });
    }

    const obj = await prisma.$transaction(async (tx) => {
      await tx.DOITUONG.create({
        data: {
          MaDoiTuong: beneficiaryId,
          TenDoiTuong: beneficiaryName,
          TiLeGiamHocPhi: discountPercent,
          DoUuTien: 1,
          MoTa: MoTa !== undefined ? normalizeText(MoTa) || null : null,
          ...updateAudit(req)
        }
      });

      await recomputeBeneficiaryPriorities(tx);

      return tx.DOITUONG.findUnique({ where: { MaDoiTuong: beneficiaryId } });
    });
    res.status(201).json({ success: true, message: 'Tạo đối tượng thành công', data: obj });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Mã đối tượng đã tồn tại' });
    return sendErrorResponse(res, error, 'Lỗi máy chủ', 'createBeneficiary error:');
  }
};

const updateBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const { MaDoiTuong, TenDoiTuong, TiLeGiamHocPhi, MoTa, TrangThai } = req.body;
    const beneficiaryId = normalizeText(id);
    if (MaDoiTuong !== undefined && normalizeText(MaDoiTuong) !== beneficiaryId) {
      return res.status(400).json({ success: false, message: 'Mã đối tượng không được sửa' });
    }

    const existing = await prisma.DOITUONG.findFirst({ where: { MaDoiTuong: beneficiaryId, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy đối tượng' });

    const data = updateAudit(req);

    if (TenDoiTuong !== undefined) {
      const beneficiaryName = normalizeText(TenDoiTuong);
      if (!beneficiaryName) return res.status(400).json({ success: false, message: 'Tên đối tượng không được để trống' });
      data.TenDoiTuong = beneficiaryName;
    }
    if (TiLeGiamHocPhi !== undefined) {
      const discountPercent = parseDiscountPercent(TiLeGiamHocPhi);
      if (discountPercent === null) return res.status(400).json({ success: false, message: 'Tỉ lệ giảm học phí phải từ 0 đến 100' });
      data.TiLeGiamHocPhi = discountPercent;
    }
    if (MoTa !== undefined) data.MoTa = normalizeText(MoTa) || null;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;

    const obj = await prisma.$transaction(async (tx) => {
      await tx.DOITUONG.update({ where: { MaDoiTuong: beneficiaryId }, data });
      await recomputeBeneficiaryPriorities(tx);
      return tx.DOITUONG.findUnique({ where: { MaDoiTuong: beneficiaryId } });
    });
    res.json({ success: true, message: 'Cập nhật đối tượng thành công', data: obj });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi máy chủ', 'updateBeneficiary error:');
  }
};

const deleteBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.DOITUONG.findFirst({ where: { MaDoiTuong: id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy đối tượng' });
    await prisma.$transaction(async (tx) => {
      await tx.DOITUONG.update({ where: { MaDoiTuong: id }, data: softDeleteAudit(req) });
      await recomputeBeneficiaryPriorities(tx);
    });
    res.json({ success: true, message: 'Đã chuyển đối tượng vào thùng rác' });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi máy chủ', 'deleteBeneficiary error:');
  }
};

const getBeneficiaryStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const students = await prisma.DOITUONGSINHVIEN.findMany({
      where: { MaDoiTuong: id, SINHVIEN: { DaXoa: false } },
      include: { SINHVIEN: { select: { MaSv: true, HoTen: true, Email: true, MaNganh: true, TrangThai: true } } },
      orderBy: { NgayTao: 'desc' }
    });
    res.json({ success: true, data: students });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi máy chủ', 'getBeneficiaryStudents error:');
  }
};

const addStudentToBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const { MaSv, GhiChu } = req.body;
    const studentId = normalizeText(MaSv);
    if (!studentId) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã sinh viên' });
    const sv = await prisma.SINHVIEN.findFirst({ where: { MaSv: studentId, DaXoa: false } });
    if (!sv) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    const record = await prisma.DOITUONGSINHVIEN.create({
      data: { MaSv: studentId, MaDoiTuong: id, GhiChu: GhiChu !== undefined ? normalizeText(GhiChu) || null : null }
    });
    res.status(201).json({ success: true, message: 'Thêm sinh viên vào đối tượng thành công', data: record });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Sinh viên đã thuộc đối tượng này' });
    return sendErrorResponse(res, error, 'Lỗi máy chủ', 'addStudentToBeneficiary error:');
  }
};

const removeStudentFromBeneficiary = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    await prisma.DOITUONGSINHVIEN.deleteMany({ where: { MaDoiTuong: id, MaSv: studentId } });
    res.json({ success: true, message: 'Xóa sinh viên khỏi đối tượng thành công' });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi máy chủ', 'removeStudentFromBeneficiary error:');
  }
};

const importStudentsToBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel' });
    }

    const beneficiary = await prisma.DOITUONG.findFirst({
      where: { MaDoiTuong: id, DaXoa: false }
    });

    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đối tượng ưu tiên' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ success: false, message: 'File Excel không có sheet dữ liệu' });
    }

    const results = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const MaSv = normalizeExcelValue(row.getCell(1).value);
      if (!MaSv) {
        results.errors.push({ row: rowNumber, MaSv: '', reason: 'Thiếu MSSV' });
        return;
      }

      rows.push({ rowNumber, MaSv });
    });

    const seen = new Set();
    rows.forEach((item) => {
      if (seen.has(item.MaSv)) {
        results.errors.push({
          row: item.rowNumber,
          MaSv: item.MaSv,
          reason: 'Trùng MSSV trong file import'
        });
        return;
      }

      seen.add(item.MaSv);
    });

    const validRows = rows.filter((item) => !results.errors.some((error) => error.row === item.rowNumber));
    const validStudentIds = validRows.map((item) => item.MaSv);

    const [students, existingAssignments] = await Promise.all([
      prisma.SINHVIEN.findMany({
        where: { MaSv: { in: validStudentIds }, DaXoa: false },
        select: { MaSv: true }
      }),
      prisma.DOITUONGSINHVIEN.findMany({
        where: { MaDoiTuong: id, MaSv: { in: validStudentIds } },
        select: { MaSv: true }
      })
    ]);

    const studentSet = new Set(students.map((sv) => sv.MaSv));
    const existingSet = new Set(existingAssignments.map((row) => row.MaSv));

    for (const item of validRows) {
      const rowErrors = [];
      if (!studentSet.has(item.MaSv)) rowErrors.push('MSSV không tồn tại');
      if (existingSet.has(item.MaSv)) rowErrors.push('Sinh viên đã thuộc đối tượng này');

      if (rowErrors.length) {
        results.errors.push({ row: item.rowNumber, MaSv: item.MaSv, reason: rowErrors.join('; ') });
        continue;
      }

      try {
        await prisma.DOITUONGSINHVIEN.create({
          data: {
            MaSv: item.MaSv,
            MaDoiTuong: id,
            GhiChu: 'Import Excel'
          }
        });

        results.successCount += 1;
        existingSet.add(item.MaSv);
      } catch (error) {
        results.errors.push({
          row: item.rowNumber,
          MaSv: item.MaSv,
          reason: error.code === 'P2002' ? 'Sinh viên đã thuộc đối tượng này' : 'Không thể gán sinh viên'
        });
      }
    }

    results.errorCount = results.errors.length;

    res.json({
      success: true,
      message: 'Thành công ' + results.successCount + ', lỗi ' + results.errorCount,
      data: results
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Không thể nhập danh sách sinh viên vào đối tượng', 'importStudentsToBeneficiary error:');
  }
};

module.exports = {
  getAllBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  getBeneficiaryStudents,
  addStudentToBeneficiary,
  removeStudentFromBeneficiary,
  importStudentsToBeneficiary
};
