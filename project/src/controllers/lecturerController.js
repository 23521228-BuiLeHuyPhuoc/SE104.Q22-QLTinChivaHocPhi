const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const cleanText = (value) => {
  if (value === undefined) return undefined;
  const text = String(value || '').trim();
  return text || null;
};

const getAllLecturers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, MaKhoa, TrangThai } = req.query;
    const where = notDeleted();

    if (MaKhoa) where.MaKhoa = MaKhoa;
    if (TrangThai !== undefined) where.TrangThai = TrangThai === 'true';
    if (search) {
      where.OR = [
        { MaGiangVien: { contains: search, mode: 'insensitive' } },
        { HoTen: { contains: search, mode: 'insensitive' } },
        { HocHamHocVi: { contains: search, mode: 'insensitive' } },
        { Email: { contains: search, mode: 'insensitive' } },
        { KHOA: { is: { TenKhoa: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    const [lecturers, total] = await Promise.all([
      prisma.GIANGVIEN.findMany({
        where,
        skip,
        take: limit,
        orderBy: { MaGiangVien: 'asc' },
        include: {
          KHOA: true,
          _count: { select: { LOPMO: true } }
        }
      }),
      prisma.GIANGVIEN.count({ where })
    ]);

    res.json({ success: true, data: lecturers, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'getAllLecturers error:');
  }
};

const ensureFacultyExists = async (MaKhoa) => {
  if (!MaKhoa) return true;
  const faculty = await prisma.KHOA.findFirst({ where: { MaKhoa, DaXoa: false } });
  return Boolean(faculty);
};

const createLecturer = async (req, res) => {
  try {
    const MaGiangVien = cleanText(req.body.MaGiangVien);
    const HoTen = cleanText(req.body.HoTen);
    const MaKhoa = cleanText(req.body.MaKhoa);

    if (!MaGiangVien || !HoTen) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảng viên và họ tên' });
    }

    const existing = await prisma.GIANGVIEN.findUnique({ where: { MaGiangVien } });
    if (existing && existing.DaXoa === false) {
      return res.status(400).json({ success: false, message: 'Mã giảng viên đã tồn tại' });
    }
    if (!(await ensureFacultyExists(MaKhoa))) {
      return res.status(400).json({ success: false, message: 'Khoa không tồn tại' });
    }

    const lecturer = await prisma.GIANGVIEN.create({
      data: {
        MaGiangVien,
        HoTen,
        HocHamHocVi: cleanText(req.body.HocHamHocVi),
        MaKhoa,
        Email: cleanText(req.body.Email),
        Sdt: cleanText(req.body.Sdt),
        MoTa: cleanText(req.body.MoTa),
        TrangThai: req.body.TrangThai !== undefined ? req.body.TrangThai : true,
        ...updateAudit(req)
      }
    });

    res.status(201).json({ success: true, message: 'Tạo giảng viên thành công', data: lecturer });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'createLecturer error:');
  }
};

const updateLecturer = async (req, res) => {
  try {
    const existing = await prisma.GIANGVIEN.findFirst({ where: { MaGiangVien: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy giảng viên' });

    const data = { ...updateAudit(req) };
    if (req.body.HoTen !== undefined && !cleanText(req.body.HoTen)) {
      return res.status(400).json({ success: false, message: 'Họ tên giảng viên không được để trống' });
    }
    ['HoTen', 'HocHamHocVi', 'Email', 'Sdt', 'MoTa'].forEach((field) => {
      if (req.body[field] !== undefined) data[field] = cleanText(req.body[field]);
    });
    if (req.body.MaKhoa !== undefined) {
      const MaKhoa = cleanText(req.body.MaKhoa);
      if (!(await ensureFacultyExists(MaKhoa))) {
        return res.status(400).json({ success: false, message: 'Khoa không tồn tại' });
      }
      data.MaKhoa = MaKhoa;
    }
    if (req.body.TrangThai !== undefined) data.TrangThai = req.body.TrangThai;

    const lecturer = await prisma.GIANGVIEN.update({ where: { MaGiangVien: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật giảng viên thành công', data: lecturer });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'updateLecturer error:');
  }
};

const deleteLecturer = async (req, res) => {
  try {
    const existing = await prisma.GIANGVIEN.findFirst({ where: { MaGiangVien: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy giảng viên' });
    await prisma.GIANGVIEN.update({ where: { MaGiangVien: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển giảng viên vào thùng rác' });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'deleteLecturer error:');
  }
};

module.exports = {
  getAllLecturers,
  createLecturer,
  updateLecturer,
  deleteLecturer
};
