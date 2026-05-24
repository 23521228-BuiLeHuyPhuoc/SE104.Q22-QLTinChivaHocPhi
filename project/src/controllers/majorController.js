const prisma = require('../config/database');

const getAllMajors = async (req, res) => {
  try {
    const { search, MaKhoa, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (search) {
      where.OR = [
        { MaNganh: { contains: search, mode: 'insensitive' } },
        { TenNganh: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (MaKhoa) where.MaKhoa = MaKhoa;
    const [majors, total] = await Promise.all([
      prisma.NGANHHOC.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { MaNganh: 'asc' },
        include: { KHOA: true, _count: { select: { SINHVIEN: true } } }
      }),
      prisma.NGANHHOC.count({ where })
    ]);
    res.json({ success: true, data: majors, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('getAllMajors error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createMajor = async (req, res) => {
  try {
    const { MaNganh, TenNganh, MaKhoa, SoTinChiToiThieu, ThoiGianDaoTao, MoTa } = req.body;
    if (!MaNganh || !TenNganh || !MaKhoa) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const existing = await prisma.NGANHHOC.findUnique({ where: { MaNganh } });
    if (existing) return res.status(400).json({ success: false, message: 'Mã ngành đã tồn tại' });
    const major = await prisma.NGANHHOC.create({
      data: { MaNganh, TenNganh, MaKhoa, SoTinChiToiThieu: parseInt(SoTinChiToiThieu) || 120, ThoiGianDaoTao: parseFloat(ThoiGianDaoTao) || 4, MoTa }
    });
    res.status(201).json({ success: true, message: 'Tạo ngành thành công', data: major });
  } catch (error) {
    console.error('createMajor error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenNganh, MaKhoa, SoTinChiToiThieu, ThoiGianDaoTao, MoTa } = req.body;
    const data = {};
    if (TenNganh) data.TenNganh = TenNganh;
    if (MaKhoa) data.MaKhoa = MaKhoa;
    if (SoTinChiToiThieu !== undefined) data.SoTinChiToiThieu = parseInt(SoTinChiToiThieu);
    if (ThoiGianDaoTao !== undefined) data.ThoiGianDaoTao = parseFloat(ThoiGianDaoTao);
    if (MoTa !== undefined) data.MoTa = MoTa;
    const major = await prisma.NGANHHOC.update({ where: { MaNganh: id }, data });
    res.json({ success: true, message: 'Cập nhật ngành thành công', data: major });
  } catch (error) {
    console.error('updateMajor error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const svCount = await prisma.SINHVIEN.count({ where: { MaNganh: id } });
    if (svCount > 0) {
      return res.status(400).json({ success: false, message: `Ngành đang có ${svCount} sinh viên, không thể xóa` });
    }
    await prisma.NGANHHOC.delete({ where: { MaNganh: id } });
    res.json({ success: true, message: 'Xóa ngành thành công' });
  } catch (error) {
    console.error('deleteMajor error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getAllMajors, createMajor, updateMajor, deleteMajor };
