const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const getAllMajors = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, MaKhoa } = req.query;
    const where = notDeleted();
    if (search) where.OR = [{ MaNganh: { contains: search, mode: 'insensitive' } }, { TenNganh: { contains: search, mode: 'insensitive' } }];
    if (MaKhoa) where.MaKhoa = MaKhoa;
    const [majors, total] = await Promise.all([
      prisma.NGANHHOC.findMany({ where, skip, take: limit, orderBy: { MaNganh: 'asc' }, include: { KHOA: true, _count: { select: { SINHVIEN: true } } } }),
      prisma.NGANHHOC.count({ where })
    ]);
    res.json({ success: true, data: majors, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getAllMajors error:');
  }
};

const createMajor = async (req, res) => {
  try {
    const { MaNganh, TenNganh, MaKhoa, SoTinChiToiThieu, ThoiGianDaoTao, MoTa } = req.body;
    if (!MaNganh || !TenNganh || !MaKhoa) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    const existing = await prisma.NGANHHOC.findUnique({ where: { MaNganh } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã ngành đã tồn tại' });
    const major = await prisma.NGANHHOC.create({
      data: { MaNganh, TenNganh, MaKhoa, SoTinChiToiThieu: parseInt(SoTinChiToiThieu, 10) || 120, ThoiGianDaoTao: parseFloat(ThoiGianDaoTao) || 4, MoTa, ...updateAudit(req) }
    });
    res.status(201).json({ success: true, message: 'Tạo ngành thành công', data: major });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'createMajor error:');
  }
};

const updateMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenNganh, MaKhoa, SoTinChiToiThieu, ThoiGianDaoTao, MoTa, TrangThai } = req.body;
    const data = updateAudit(req);
    if (TenNganh) data.TenNganh = TenNganh;
    if (MaKhoa) data.MaKhoa = MaKhoa;
    if (SoTinChiToiThieu !== undefined) data.SoTinChiToiThieu = parseInt(SoTinChiToiThieu, 10);
    if (ThoiGianDaoTao !== undefined) data.ThoiGianDaoTao = parseFloat(ThoiGianDaoTao);
    if (MoTa !== undefined) data.MoTa = MoTa;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    const major = await prisma.NGANHHOC.update({ where: { MaNganh: id }, data });
    res.json({ success: true, message: 'Cập nhật ngành thành công', data: major });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'updateMajor error:');
  }
};

const deleteMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const major = await prisma.NGANHHOC.findFirst({ where: { MaNganh: id, DaXoa: false } });
    if (!major) return res.status(404).json({ success: false, message: 'Không tìm thấy ngành' });
    await prisma.NGANHHOC.update({ where: { MaNganh: id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển ngành vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'deleteMajor error:');
  }
};

module.exports = { getAllMajors, createMajor, updateMajor, deleteMajor };
