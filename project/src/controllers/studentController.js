const ExcelJS = require('exceljs');
const prisma = require('../config/database');
const { uploadAvatarBuffer } = require('../utils/cloudinary');
const { formatStudent, formatStudentList } = require('../models/studentModel');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const studentInclude = {
  NGANHHOC: { include: { KHOA: true } },
  PHUONGXA: { include: { TINH: true } },
  DANTOC: true,
  DOITUONGSINHVIEN: { include: { DOITUONG: true } },
  TAIKHOAN_SINHVIEN_MaTaiKhoanToTAIKHOAN: {
    select: { MaTaiKhoan: true }
  }
};

const buildStudentWhere = (query) => {
  const { search = '', MaKhoa, MaNganh, TrangThai } = query;
  const where = notDeleted();

  if (search) {
    where.OR = [
      { MaSv: { contains: search, mode: 'insensitive' } },
      { HoTen: { contains: search, mode: 'insensitive' } },
      { Email: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (MaKhoa) where.NGANHHOC = { MaKhoa };
  if (MaNganh) where.MaNganh = MaNganh;
  if (TrangThai) where.TrangThai = TrangThai;

  return where;
};

const normalizeImportValue = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object' && value.text) return String(value.text).trim();
  if (typeof value === 'object' && value.result) return String(value.result).trim();
  return String(value).trim();
};

const parseImportDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const raw = normalizeImportValue(value);
  const parts = raw.split(/[/-]/).map((item) => item.trim());

  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (raw.indexOf('/') !== -1) return new Date(c, b - 1, a);
    if (String(parts[0]).length === 4) return new Date(a, b - 1, c);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getImportCell = (row, index) => normalizeImportValue(row.getCell(index).value);

const getAllStudents = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { sortBy = 'MaSv', sortOrder = 'asc' } = req.query;
    const where = buildStudentWhere(req.query);

    const validSort = ['MaSv', 'HoTen', 'NgayTao', 'NgayCapNhat'];
    const orderField = validSort.includes(sortBy) ? sortBy : 'MaSv';

    const [rows, total] = await Promise.all([
      prisma.SINHVIEN.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: String(sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: studentInclude
      }),
      prisma.SINHVIEN.count({ where })
    ]);

    res.json({ success: true, data: formatStudentList(rows), pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get all students error:');
  }
};

const getStudentById = async (req, res) => {
  try {
    const sv = await prisma.SINHVIEN.findFirst({
      where: { MaSv: req.params.id, DaXoa: false },
      include: studentInclude
    });
    if (!sv) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    res.json({ success: true, data: formatStudent(sv) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get student by ID error:');
  }
};

const createStudent = async (req, res) => {
  try {
    const {
      MaSv, HoTen, NgaySinh, GioiTinh, MaPhuongXa, MaNganh,
      Email, Sdt, DiaChiLienHe, MaDanToc, Cccd
    } = req.body;

    if (!MaSv || !HoTen || !NgaySinh || !GioiTinh || !MaPhuongXa || !MaNganh || !Cccd || !MaDanToc || !DiaChiLienHe) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin bắt buộc, gồm CCCD, dân tộc và địa chỉ' });
    }

    const existing = await prisma.SINHVIEN.findUnique({ where: { MaSv } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã sinh viên đã tồn tại' });

    const result = await prisma.SINHVIEN.create({
      data: {
        MaSv,
        HoTen,
        NgaySinh: new Date(NgaySinh),
        GioiTinh,
        Cccd,
        MaPhuongXa,
        MaNganh,
        Email,
        Sdt,
        DiaChiLienHe,
        MaDanToc,
        ...updateAudit(req)
      }
    });

    res.status(201).json({ success: true, message: 'Tạo sinh viên thành công', data: result });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Create student error:');
  }
};

const updateStudent = async (req, res) => {
  try {
    const existing = await prisma.SINHVIEN.findFirst({ where: { MaSv: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });

    const {
      HoTen, NgaySinh, GioiTinh, Email, Sdt, DiaChiLienHe,
      MaPhuongXa, MaDanToc, MaNganh, TrangThai, AnhDaiDien, Cccd
    } = req.body;
    const data = {};
    if (HoTen) data.HoTen = HoTen;
    if (NgaySinh) data.NgaySinh = new Date(NgaySinh);
    if (GioiTinh) data.GioiTinh = GioiTinh;
    if (Cccd !== undefined) data.Cccd = Cccd;
    if (Email !== undefined) data.Email = Email;
    if (Sdt !== undefined) data.Sdt = Sdt;
    if (DiaChiLienHe !== undefined) data.DiaChiLienHe = DiaChiLienHe;
    if (MaPhuongXa) data.MaPhuongXa = MaPhuongXa;
    if (MaDanToc) data.MaDanToc = MaDanToc;
    if (MaNganh) data.MaNganh = MaNganh;
    if (TrangThai) data.TrangThai = TrangThai;
    if (AnhDaiDien !== undefined) data.AnhDaiDien = AnhDaiDien;
    const nextCccd = Cccd !== undefined ? Cccd : existing.Cccd;
    const nextMaDanToc = MaDanToc !== undefined ? MaDanToc : existing.MaDanToc;
    const nextDiaChi = DiaChiLienHe !== undefined ? DiaChiLienHe : existing.DiaChiLienHe;
    if (!nextCccd || !nextMaDanToc || !nextDiaChi) {
      return res.status(400).json({ success: false, message: 'CCCD, dân tộc và địa chỉ liên hệ là bắt buộc' });
    }
    Object.assign(data, updateAudit(req));

    const updated = await prisma.SINHVIEN.update({ where: { MaSv: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật sinh viên thành công', data: updated });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Update student error:');
  }
};

const deleteStudent = async (req, res) => {
  try {
    const existing = await prisma.SINHVIEN.findFirst({ where: { MaSv: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });

    await prisma.$transaction(async (tx) => {
      await tx.SINHVIEN.update({ where: { MaSv: req.params.id }, data: softDeleteAudit(req) });
      if (existing.MaTaiKhoan) {
        await tx.TAIKHOAN.update({
          where: { MaTaiKhoan: existing.MaTaiKhoan },
          data: { TrangThai: false, NgayCapNhat: new Date() }
        });
      }
    });

    res.json({ success: true, message: 'Đã chuyển sinh viên vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Delete student error:');
  }
};

const getStudentStats = async (req, res) => {
  try {
    const [total, byStatus] = await Promise.all([
      prisma.SINHVIEN.count({ where: notDeleted() }),
      prisma.SINHVIEN.groupBy({ by: ['TrangThai'], where: notDeleted(), _count: true })
    ]);
    res.json({
      success: true,
      data: { total, byStatus: byStatus.map((s) => ({ TrangThai: s.TrangThai, count: s._count })) }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get student stats error:');
  }
};

const getMajors = async (req, res) => {
  try {
    const majors = await prisma.NGANHHOC.findMany({ where: notDeleted(), include: { KHOA: true }, orderBy: { TenNganh: 'asc' } });
    res.json({ success: true, data: majors.map((m) => ({ MaNganh: m.MaNganh, TenNganh: m.TenNganh, MaKhoa: m.MaKhoa, TenKhoa: m.KHOA.TenKhoa })) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get majors error:');
  }
};

const getProvinces = async (req, res) => {
  try {
    const provinces = await prisma.TINH.findMany({ where: { TrangThai: true, DaXoa: false }, orderBy: { TenTinh: 'asc' } });
    res.json({ success: true, data: provinces });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get provinces error:');
  }
};

const getDistrictsByProvince = async (req, res) => {
  try {
    const wards = await prisma.PHUONGXA.findMany({ where: { MaTinh: req.params.provinceId, TrangThai: true, DaXoa: false }, orderBy: { TenPhuongXa: 'asc' } });
    res.json({ success: true, data: wards });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get districts error:');
  }
};

const getEthnicities = async (req, res) => {
  try {
    const ethnicities = await prisma.DANTOC.findMany({ where: { TrangThai: true }, orderBy: { TenDanToc: 'asc' } });
    res.json({ success: true, data: ethnicities });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get ethnicities error:');
  }
};

const uploadStudentAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh đại diện' });
    }

    const student = await prisma.SINHVIEN.findFirst({
      where: { MaSv: id, DaXoa: false },
      select: { MaSv: true, HoTen: true, MaTaiKhoan: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    }

    const uploadResult = await uploadAvatarBuffer(req.file.buffer, {
      publicId: 'student-' + student.MaSv
    });
    const avatarUrl = uploadResult.secure_url || uploadResult.url;

    await prisma.$transaction(async (tx) => {
      await tx.SINHVIEN.update({
        where: { MaSv: student.MaSv },
        data: {
          AnhDaiDien: avatarUrl,
          ...updateAudit(req)
        }
      });

      await tx.TAIKHOAN.updateMany({
        where: {
          OR: [
            { MaSv: student.MaSv },
            ...(student.MaTaiKhoan ? [{ MaTaiKhoan: student.MaTaiKhoan }] : [])
          ]
        },
        data: {
          AnhDaiDien: avatarUrl,
          NgayCapNhat: new Date()
        }
      });
    });

    res.json({
      success: true,
      message: 'Cập nhật ảnh đại diện sinh viên thành công',
      data: { avatarUrl }
    });
  } catch (error) {
    if (error.code === 'CLOUDINARY_NOT_CONFIGURED') {
      return res.status(500).json({ success: false, message: 'Chưa cấu hình Cloudinary để upload ảnh đại diện' });
    }

    return sendErrorResponse(res, error, 'Lỗi server', 'Upload student avatar error:');
  }
};

const exportStudents = async (req, res) => {
  try {
    const students = await prisma.SINHVIEN.findMany({
      where: buildStudentWhere(req.query),
      orderBy: { MaSv: 'asc' },
      include: {
        NGANHHOC: { include: { KHOA: true } },
        PHUONGXA: { include: { TINH: true } },
        DANTOC: true,
        DOITUONGSINHVIEN: { include: { DOITUONG: true } }
      }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EduPay';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Sinh viên');
    worksheet.columns = [
      { header: 'MSSV', key: 'MaSv', width: 15 },
      { header: 'Họ tên', key: 'HoTen', width: 28 },
      { header: 'Ngày sinh', key: 'NgaySinh', width: 15 },
      { header: 'Giới tính', key: 'GioiTinh', width: 12 },
      { header: 'CCCD', key: 'Cccd', width: 18 },
      { header: 'Email', key: 'Email', width: 28 },
      { header: 'SDT', key: 'Sdt', width: 16 },
      { header: 'Ngành', key: 'TenNganh', width: 28 },
      { header: 'Khoa', key: 'TenKhoa', width: 28 },
      { header: 'Dân tộc', key: 'TenDanToc', width: 18 },
      { header: 'Phường/Xã', key: 'TenPhuongXa', width: 24 },
      { header: 'Tỉnh/Thành phố', key: 'TenTinh', width: 24 },
      { header: 'Đối tượng ưu tiên', key: 'DoiTuong', width: 36 },
      { header: 'Trạng thái', key: 'TrangThai', width: 18 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    students.forEach((sv) => {
      worksheet.addRow({
        MaSv: sv.MaSv,
        HoTen: sv.HoTen,
        NgaySinh: sv.NgaySinh ? new Date(sv.NgaySinh).toLocaleDateString('vi-VN') : '',
        GioiTinh: sv.GioiTinh || '',
        Cccd: sv.Cccd || '',
        Email: sv.Email || '',
        Sdt: sv.Sdt || '',
        TenNganh: sv.NGANHHOC?.TenNganh || sv.MaNganh || '',
        TenKhoa: sv.NGANHHOC?.KHOA?.TenKhoa || '',
        TenDanToc: sv.DANTOC?.TenDanToc || '',
        TenPhuongXa: sv.PHUONGXA?.TenPhuongXa || '',
        TenTinh: sv.PHUONGXA?.TINH?.TenTinh || '',
        DoiTuong: (sv.DOITUONGSINHVIEN || []).map((item) => {
          const dt = item.DOITUONG;
          if (!dt) return item.MaDoiTuong;
          return dt.MaDoiTuong + ' - ' + dt.TenDoiTuong + ' (' + Number(dt.TiLeGiamHocPhi || 0) + '%)';
        }).filter(Boolean).join(', '),
        TrangThai: sv.TrangThai || ''
      });
    });

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    const fileName = 'danh-sach-sinh-vien-' + Date.now() + '.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return sendErrorResponse(res, error, 'Không thể xuất danh sách sinh viên', 'Export students error:');
  }
};

const importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel' });
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

    const rowsToCreate = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const data = {
        MaSv: getImportCell(row, 1),
        HoTen: getImportCell(row, 2),
        NgaySinh: parseImportDate(row.getCell(3).value),
        GioiTinh: getImportCell(row, 4),
        Cccd: getImportCell(row, 5),
        Email: getImportCell(row, 6) || null,
        Sdt: getImportCell(row, 7) || null,
        MaNganh: getImportCell(row, 8),
        MaDanToc: getImportCell(row, 9),
        MaPhuongXa: getImportCell(row, 10),
        DiaChiLienHe: getImportCell(row, 11),
        TrangThai: getImportCell(row, 12) || 'Đang học'
      };

      const missing = [];
      if (!data.MaSv) missing.push('MSSV');
      if (!data.HoTen) missing.push('Họ tên');
      if (!data.NgaySinh) missing.push('Ngày sinh');
      if (!data.GioiTinh) missing.push('Giới tính');
      if (!data.Cccd) missing.push('CCCD');
      if (!data.MaNganh) missing.push('Mã ngành');
      if (!data.MaDanToc) missing.push('Mã dân tộc');
      if (!data.MaPhuongXa) missing.push('Mã phường xã');
      if (!data.DiaChiLienHe) missing.push('Địa chỉ liên hệ');

      if (missing.length) {
        results.errors.push({
          row: rowNumber,
          MaSv: data.MaSv,
          reason: 'Thiếu thông tin bắt buộc: ' + missing.join(', ')
        });
        return;
      }

      rowsToCreate.push({ rowNumber, data });
    });

    const seen = new Set();
    rowsToCreate.forEach((item) => {
      if (seen.has(item.data.MaSv)) {
        results.errors.push({
          row: item.rowNumber,
          MaSv: item.data.MaSv,
          reason: 'Trùng MSSV trong file import'
        });
        return;
      }

      seen.add(item.data.MaSv);
    });

    const validRows = rowsToCreate.filter((item) => !results.errors.some((error) => error.row === item.rowNumber));

    const [existingStudents, majors, ethnicities, wards] = await Promise.all([
      prisma.SINHVIEN.findMany({
        where: { MaSv: { in: validRows.map((item) => item.data.MaSv) } },
        select: { MaSv: true, DaXoa: true }
      }),
      prisma.NGANHHOC.findMany({
        where: { MaNganh: { in: validRows.map((item) => item.data.MaNganh) }, DaXoa: false },
        select: { MaNganh: true }
      }),
      prisma.DANTOC.findMany({
        where: { MaDanToc: { in: validRows.map((item) => item.data.MaDanToc) }, TrangThai: true },
        select: { MaDanToc: true }
      }),
      prisma.PHUONGXA.findMany({
        where: { MaPhuongXa: { in: validRows.map((item) => item.data.MaPhuongXa) }, TrangThai: true, DaXoa: false },
        select: { MaPhuongXa: true }
      })
    ]);

    const existingSet = new Set(existingStudents.filter((sv) => sv.DaXoa === false).map((sv) => sv.MaSv));
    const majorSet = new Set(majors.map((item) => item.MaNganh));
    const ethnicitySet = new Set(ethnicities.map((item) => item.MaDanToc));
    const wardSet = new Set(wards.map((item) => item.MaPhuongXa));

    for (const item of validRows) {
      const { data, rowNumber } = item;
      const rowErrors = [];

      if (existingSet.has(data.MaSv)) rowErrors.push('MSSV đã tồn tại');
      if (!majorSet.has(data.MaNganh)) rowErrors.push('Mã ngành không tồn tại hoặc đã khóa');
      if (!ethnicitySet.has(data.MaDanToc)) rowErrors.push('Mã dân tộc không tồn tại hoặc đã khóa');
      if (!wardSet.has(data.MaPhuongXa)) rowErrors.push('Mã phường xã không tồn tại hoặc đã khóa');

      if (rowErrors.length) {
        results.errors.push({ row: rowNumber, MaSv: data.MaSv, reason: rowErrors.join('; ') });
        continue;
      }

      try {
        await prisma.SINHVIEN.create({
          data: {
            ...data,
            ...updateAudit(req)
          }
        });
        results.successCount += 1;
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          MaSv: data.MaSv,
          reason: error.code === 'P2002' ? 'Dữ liệu bị trùng unique' : 'Không thể tạo sinh viên'
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
    return sendErrorResponse(res, error, 'Không thể nhập danh sách sinh viên', 'Import students error:');
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats,
  getMajors,
  getProvinces,
  getDistrictsByProvince,
  getEthnicities,
  uploadStudentAvatar,
  exportStudents,
  importStudents
};

