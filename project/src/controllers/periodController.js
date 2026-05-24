const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

const timeToMinutes = (value) => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const timeToDate = (value) => {
  const minutes = timeToMinutes(value);
  if (minutes === null) return null;
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return new Date(`1970-01-01T${hours}:${mins}:00.000Z`);
};

const normalizePeriodPayload = (body, partial = false) => {
  const data = {};
  const errors = [];

  if (!partial || body.MaTiet !== undefined) {
    data.MaTiet = String(body.MaTiet || '').trim().toUpperCase();
    if (!data.MaTiet) errors.push('Mã tiết học không được để trống');
  }
  if (!partial || body.TenTiet !== undefined) {
    data.TenTiet = String(body.TenTiet || '').trim();
    if (!data.TenTiet) errors.push('Tên tiết học không được để trống');
  }
  if (!partial || body.GioBatDau !== undefined) {
    data.GioBatDau = timeToDate(body.GioBatDau);
    if (!data.GioBatDau) errors.push('Giờ bắt đầu không hợp lệ');
  }
  if (!partial || body.GioKetThuc !== undefined) {
    data.GioKetThuc = timeToDate(body.GioKetThuc);
    if (!data.GioKetThuc) errors.push('Giờ kết thúc không hợp lệ');
  }
  if (!partial || body.ThuTu !== undefined) {
    data.ThuTu = parseInt(body.ThuTu, 10);
    if (!Number.isFinite(data.ThuTu) || data.ThuTu < 1 || data.ThuTu > 11) {
      errors.push('Thứ tự tiết học phải từ 1 đến 11');
    }
  }
  if (body.MoTa !== undefined) data.MoTa = String(body.MoTa || '').trim() || null;
  if (body.TrangThai !== undefined) data.TrangThai = body.TrangThai === true || body.TrangThai === 'true';

  const start = body.GioBatDau !== undefined ? timeToMinutes(body.GioBatDau) : null;
  const end = body.GioKetThuc !== undefined ? timeToMinutes(body.GioKetThuc) : null;
  if (start !== null && end !== null && end <= start) {
    errors.push('Giờ kết thúc phải sau giờ bắt đầu');
  }

  return { data, errors };
};

const getPeriods = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search = '' } = req.query;
    const where = notDeleted();
    const status = parseBoolean(req.query.TrangThai);
    if (status !== undefined) where.TrangThai = status;
    if (search) {
      where.OR = [
        { MaTiet: { contains: search, mode: 'insensitive' } },
        { TenTiet: { contains: search, mode: 'insensitive' } },
        { MoTa: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.TIETHOC.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ ThuTu: 'asc' }, { MaTiet: 'asc' }]
      }),
      prisma.TIETHOC.count({ where })
    ]);

    res.json({ success: true, data: rows, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('Get periods error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getPeriodById = async (req, res) => {
  try {
    const period = await prisma.TIETHOC.findFirst({ where: { MaTiet: req.params.id, DaXoa: false } });
    if (!period) return res.status(404).json({ success: false, message: 'Không tìm thấy tiết học' });
    res.json({ success: true, data: period });
  } catch (error) {
    console.error('Get period error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createPeriod = async (req, res) => {
  try {
    const { data, errors } = normalizePeriodPayload(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors[0] });

    const existing = await prisma.TIETHOC.findUnique({ where: { MaTiet: data.MaTiet } });
    if (existing && existing.DaXoa === false) {
      return res.status(400).json({ success: false, message: 'Mã tiết học đã tồn tại' });
    }

    const payload = { ...data, ...updateAudit(req) };
    const period = existing
      ? await prisma.TIETHOC.update({
        where: { MaTiet: data.MaTiet },
        data: { ...payload, DaXoa: false, NguoiXoa: null, NgayXoa: null }
      })
      : await prisma.TIETHOC.create({ data: payload });

    res.status(201).json({ success: true, message: 'Lưu tiết học thành công', data: period });
  } catch (error) {
    console.error('Create period error:', error);
    res.status(500).json({ success: false, message: 'Không thể tạo tiết học' });
  }
};

const updatePeriod = async (req, res) => {
  try {
    const existing = await prisma.TIETHOC.findFirst({ where: { MaTiet: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy tiết học' });

    const { data, errors } = normalizePeriodPayload(req.body, true);
    delete data.MaTiet;
    if (errors.length) return res.status(400).json({ success: false, message: errors[0] });

    const startRaw = req.body.GioBatDau !== undefined ? req.body.GioBatDau : existing.GioBatDau.toISOString().slice(11, 16);
    const endRaw = req.body.GioKetThuc !== undefined ? req.body.GioKetThuc : existing.GioKetThuc.toISOString().slice(11, 16);
    if (timeToMinutes(endRaw) <= timeToMinutes(startRaw)) {
      return res.status(400).json({ success: false, message: 'Giờ kết thúc phải sau giờ bắt đầu' });
    }

    const updated = await prisma.TIETHOC.update({
      where: { MaTiet: req.params.id },
      data: { ...data, ...updateAudit(req) }
    });
    res.json({ success: true, message: 'Cập nhật tiết học thành công', data: updated });
  } catch (error) {
    console.error('Update period error:', error);
    res.status(500).json({ success: false, message: 'Không thể cập nhật tiết học' });
  }
};

const deletePeriod = async (req, res) => {
  try {
    const existing = await prisma.TIETHOC.findFirst({ where: { MaTiet: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy tiết học' });
    await prisma.TIETHOC.update({ where: { MaTiet: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển tiết học vào thùng rác' });
  } catch (error) {
    console.error('Delete period error:', error);
    res.status(500).json({ success: false, message: 'Không thể xóa tiết học' });
  }
};

module.exports = {
  getPeriods,
  getPeriodById,
  createPeriod,
  updatePeriod,
  deletePeriod
};
