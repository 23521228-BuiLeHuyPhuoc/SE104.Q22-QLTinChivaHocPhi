const prisma = require('../config/database');

const getAllFaculties = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (search) {
      where.OR = [
        { MaKhoa: { contains: search, mode: 'insensitive' } },
        { TenKhoa: { contains: search, mode: 'insensitive' } },
        { TenVietTat: { contains: search, mode: 'insensitive' } }
      ];
    }
    const [faculties, total] = await Promise.all([
      prisma.KHOA.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { MaKhoa: 'asc' },
        include: { _count: { select: { MONHOC: true, NGANHHOC: true } } }
      }),
      prisma.KHOA.count({ where })
    ]);
    res.json({ success: true, data: faculties, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('getAllFaculties error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createFaculty = async (req, res) => {
  try {
    const { MaKhoa, TenKhoa, TenVietTat, Sdt, Email, DiaChi, TruongKhoa } = req.body;
    if (!MaKhoa || !TenKhoa) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã khoa và tên khoa' });
    }
    const existing = await prisma.KHOA.findUnique({ where: { MaKhoa } });
    if (existing) return res.status(400).json({ success: false, message: 'Mã khoa đã tồn tại' });
    const faculty = await prisma.KHOA.create({
      data: { MaKhoa, TenKhoa, TenVietTat, Sdt, Email, DiaChi, TruongKhoa }
    });
    res.status(201).json({ success: true, message: 'Tạo khoa thành công', data: faculty });
  } catch (error) {
    console.error('createFaculty error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenKhoa, TenVietTat, Sdt, Email, DiaChi, TruongKhoa } = req.body;
    const faculty = await prisma.KHOA.update({
      where: { MaKhoa: id },
      data: { TenKhoa, TenVietTat, Sdt, Email, DiaChi, TruongKhoa }
    });
    res.json({ success: true, message: 'Cập nhật khoa thành công', data: faculty });
  } catch (error) {
    console.error('updateFaculty error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const [monhocCount, nganhCount] = await Promise.all([
      prisma.MONHOC.count({ where: { MaKhoa: id } }),
      prisma.NGANHHOC.count({ where: { MaKhoa: id } })
    ]);
    if (monhocCount > 0 || nganhCount > 0) {
      return res.status(400).json({ success: false, message: `Khoa đang có ${monhocCount} môn học và ${nganhCount} ngành, không thể xóa` });
    }
    await prisma.KHOA.delete({ where: { MaKhoa: id } });
    res.json({ success: true, message: 'Xóa khoa thành công' });
  } catch (error) {
    console.error('deleteFaculty error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getAllFaculties, createFaculty, updateFaculty, deleteFaculty };
