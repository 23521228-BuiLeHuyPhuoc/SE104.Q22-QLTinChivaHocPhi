const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const cleanText = (value) => {
  if (value === undefined) return undefined;
  const text = String(value || '').trim();
  return text || null;
};

const parseCapacity = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getAllRooms = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, LoaiPhong, TrangThai } = req.query;
    const where = notDeleted();

    if (LoaiPhong) where.LoaiPhong = LoaiPhong;
    if (TrangThai !== undefined) where.TrangThai = TrangThai === 'true';
    if (search) {
      where.OR = [
        { MaPhong: { contains: search, mode: 'insensitive' } },
        { TenPhong: { contains: search, mode: 'insensitive' } },
        { ToaNha: { contains: search, mode: 'insensitive' } },
        { LoaiPhong: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [rooms, total] = await Promise.all([
      prisma.PHONGHOC.findMany({
        where,
        skip,
        take: limit,
        orderBy: { MaPhong: 'asc' },
        include: { _count: { select: { LOP: true, LICHHOCLOP: true } } }
      }),
      prisma.PHONGHOC.count({ where })
    ]);

    res.json({ success: true, data: rooms, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'getAllRooms error:');
  }
};

const createRoom = async (req, res) => {
  try {
    const MaPhong = cleanText(req.body.MaPhong);
    const TenPhong = cleanText(req.body.TenPhong);
    if (!MaPhong || !TenPhong) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã phòng và tên phòng' });
    }

    const existing = await prisma.PHONGHOC.findUnique({ where: { MaPhong } });
    if (existing && existing.DaXoa === false) {
      return res.status(400).json({ success: false, message: 'Mã phòng đã tồn tại' });
    }

    const SucChua = parseCapacity(req.body.SucChua);
    if (req.body.SucChua !== undefined && req.body.SucChua !== '' && !SucChua) {
      return res.status(400).json({ success: false, message: 'Sức chứa phải là số nguyên dương' });
    }

    const room = await prisma.PHONGHOC.create({
      data: {
        MaPhong,
        TenPhong,
        ToaNha: cleanText(req.body.ToaNha),
        SucChua: SucChua || 60,
        LoaiPhong: cleanText(req.body.LoaiPhong) || 'ly_thuyet',
        MoTa: cleanText(req.body.MoTa),
        TrangThai: req.body.TrangThai !== undefined ? req.body.TrangThai : true,
        ...updateAudit(req)
      }
    });

    res.status(201).json({ success: true, message: 'Tạo phòng học thành công', data: room });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'createRoom error:');
  }
};

const updateRoom = async (req, res) => {
  try {
    const existing = await prisma.PHONGHOC.findFirst({ where: { MaPhong: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học' });

    const data = { ...updateAudit(req) };
    if (req.body.TenPhong !== undefined && !cleanText(req.body.TenPhong)) {
      return res.status(400).json({ success: false, message: 'Tên phòng không được để trống' });
    }
    ['TenPhong', 'ToaNha', 'LoaiPhong', 'MoTa'].forEach((field) => {
      if (req.body[field] !== undefined) data[field] = cleanText(req.body[field]);
    });
    if (req.body.SucChua !== undefined) {
      const SucChua = parseCapacity(req.body.SucChua);
      if (req.body.SucChua !== '' && !SucChua) {
        return res.status(400).json({ success: false, message: 'Sức chứa phải là số nguyên dương' });
      }
      data.SucChua = SucChua;
    }
    if (req.body.TrangThai !== undefined) data.TrangThai = req.body.TrangThai;

    const room = await prisma.PHONGHOC.update({ where: { MaPhong: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật phòng học thành công', data: room });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'updateRoom error:');
  }
};

const deleteRoom = async (req, res) => {
  try {
    const existing = await prisma.PHONGHOC.findFirst({ where: { MaPhong: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng học' });
    await prisma.PHONGHOC.update({ where: { MaPhong: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển phòng học vào thùng rác' });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'deleteRoom error:');
  }
};

module.exports = {
  getAllRooms,
  createRoom,
  updateRoom,
  deleteRoom
};
