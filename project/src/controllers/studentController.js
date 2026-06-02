const prisma = require('../config/database');
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

const getAllStudents = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search = '', MaNganh, TrangThai, sortBy = 'MaSv', sortOrder = 'asc' } = req.query;
    const where = notDeleted();
    if (search) {
      where.OR = [
        { MaSv: { contains: search, mode: 'insensitive' } },
        { HoTen: { contains: search, mode: 'insensitive' } },
        { Email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (MaNganh) where.MaNganh = MaNganh;
    if (TrangThai) where.TrangThai = TrangThai;

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
    const provinces = await prisma.TINH.findMany({ where: { TrangThai: true }, orderBy: { TenTinh: 'asc' } });
    res.json({ success: true, data: provinces });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get provinces error:');
  }
};

const getDistrictsByProvince = async (req, res) => {
  try {
    const wards = await prisma.PHUONGXA.findMany({ where: { MaTinh: req.params.provinceId, TrangThai: true }, orderBy: { TenPhuongXa: 'asc' } });
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
  getEthnicities
};

