const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');

const getAllFaculties = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search } = req.query;
    const where = notDeleted();
    if (search) {
      where.OR = [
        { MaKhoa: { contains: search, mode: 'insensitive' } },
        { TenKhoa: { contains: search, mode: 'insensitive' } },
        { TenVietTat: { contains: search, mode: 'insensitive' } }
      ];
    }
    const [faculties, total] = await Promise.all([
      prisma.KHOA.findMany({
        where,
        skip,
        take: limit,
        orderBy: { MaKhoa: 'asc' },
        include: { _count: { select: { MONHOC: true, NGANHHOC: true } } }
      }),
      prisma.KHOA.count({ where })
    ]);
    res.json({ success: true, data: faculties, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('getAllFaculties error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createFaculty = async (req, res) => {
  try {
    const { MaKhoa, TenKhoa, TenVietTat, Sdt, Email, DiaChi, TruongKhoa } = req.body;
    if (!MaKhoa || !TenKhoa) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã khoa và tên khoa' });
    const existing = await prisma.KHOA.findUnique({ where: { MaKhoa } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã khoa đã tồn tại' });
    const faculty = await prisma.KHOA.create({ data: { MaKhoa, TenKhoa, TenVietTat, Sdt, Email, DiaChi, TruongKhoa, ...updateAudit(req) } });
    res.status(201).json({ success: true, message: 'Tạo khoa thành công', data: faculty });
  } catch (error) {
    console.error('createFaculty error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenKhoa, TenVietTat, Sdt, Email, DiaChi, TruongKhoa, TrangThai } = req.body;
    const data = { TenKhoa, TenVietTat, Sdt, Email, DiaChi, TruongKhoa, ...updateAudit(req) };
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    const faculty = await prisma.KHOA.update({ where: { MaKhoa: id }, data });
    res.json({ success: true, message: 'Cập nhật khoa thành công', data: faculty });
  } catch (error) {
    console.error('updateFaculty error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await prisma.KHOA.findFirst({ where: { MaKhoa: id, DaXoa: false } });
    if (!faculty) return res.status(404).json({ success: false, message: 'Không tìm thấy khoa' });
    await prisma.KHOA.update({ where: { MaKhoa: id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển khoa vào thùng rác' });
  } catch (error) {
    console.error('deleteFaculty error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getAllFaculties, createFaculty, updateFaculty, deleteFaculty };
