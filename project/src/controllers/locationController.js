const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { filterRowsByRegex, paginateRows } = require('../utils/searchRegex');

const PROVINCE_TYPES = ['Tỉnh', 'Thành phố'];
const WARD_TYPES = ['Phường', 'Xã'];
const AREA_CODES = ['KV1', 'KV2', 'KV2-NT', 'KV3'];

const cleanText = (value) => String(value || '').trim();

const parseBoolean = (value) => {
  if (value === undefined || value === '') return undefined;
  return value === true || value === 'true';
};

const buildProvinceWhere = (query) => {
  const { LoaiTinh, TrangThai } = query;
  const where = notDeleted();

  if (LoaiTinh) where.LoaiTinh = LoaiTinh;

  const status = parseBoolean(TrangThai);
  if (status !== undefined) where.TrangThai = status;

  return where;
};

const buildWardWhere = (query) => {
  const { MaTinh, Loai, KhuVuc, TrangThai } = query;
  const where = notDeleted();

  if (MaTinh) where.MaTinh = MaTinh;
  if (KhuVuc) where.KhuVuc = KhuVuc;
  if (Loai) where.Loai = Loai;

  const status = parseBoolean(TrangThai);
  if (status !== undefined) where.TrangThai = status;

  return where;
};

const attachUpdaterNames = async (rows = []) => {
  const ids = Array.from(new Set(rows.map((row) => row.NguoiCapNhat).filter(Boolean)));
  if (!ids.length) return rows;

  const users = await prisma.TAIKHOAN.findMany({
    where: { MaTaiKhoan: { in: ids } },
    select: { MaTaiKhoan: true, HoTen: true, TenDangNhap: true }
  });
  const userMap = new Map(users.map((user) => [user.MaTaiKhoan, user.HoTen || user.TenDangNhap]));
  return rows.map((row) => ({
    ...row,
    NguoiCapNhatTen: userMap.get(row.NguoiCapNhat) || row.NguoiCapNhat
  }));
};

const getNextNumericCode = async (modelName, idField) => {
  const model = prisma[modelName];
  const rows = await model.findMany({ select: { [idField]: true } });
  let max = 0;
  rows.forEach((row) => {
    const id = cleanText(row[idField]);
    if (!/^\d+$/.test(id)) return;
    const numericId = Number(id);
    if (Number.isFinite(numericId) && numericId > max) max = numericId;
  });

  let candidate = String(max + 1);
  while (await model.findUnique({ where: { [idField]: candidate } })) {
    max += 1;
    candidate = String(max + 1);
  }
  return candidate;
};

const rejectCodeChange = (body, field, currentValue, label, res) => {
  if (body[field] === undefined) return false;
  const incoming = cleanText(body[field]);
  if (!incoming || incoming === currentValue) return false;
  res.status(400).json({ success: false, message: `${label} không được sửa` });
  return true;
};

const getAllProvinces = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where = buildProvinceWhere({ ...req.query, search: '' });

    const rows = await prisma.TINH.findMany({
      where,
      orderBy: { MaTinh: 'asc' },
      include: { _count: { select: { PHUONGXA: { where: notDeleted() } } } }
    });
    const searchField = cleanText(req.query.searchField);
    const filtered = filterRowsByRegex(rows, req.query.search, (row) => {
      const values = { MaTinh: [row.MaTinh], TenTinh: [row.TenTinh], LoaiTinh: [row.LoaiTinh] };
      return values[searchField] || Object.values(values).flat();
    });

    res.json({
      success: true,
      data: await attachUpdaterNames(paginateRows(filtered, page, limit)),
      pagination: getPaginationMeta(filtered.length, page, limit)
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'L\u1ed7i server', 'getAllProvinces error:');
  }
};

const createProvince = async (req, res) => {
  try {
    const TenTinh = cleanText(req.body.TenTinh);
    const LoaiTinh = cleanText(req.body.LoaiTinh) || 'Tỉnh';

    if (!TenTinh) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên tỉnh/thành phố' });
    }

    if (!PROVINCE_TYPES.includes(LoaiTinh)) {
      return res.status(400).json({ success: false, message: 'Loại tỉnh/thành phố không hợp lệ' });
    }

    const MaTinh = await getNextNumericCode('TINH', 'MaTinh');
    const status = parseBoolean(req.body.TrangThai);
    const province = await prisma.TINH.create({
      data: {
        MaTinh,
        TenTinh,
        LoaiTinh,
        TrangThai: status !== undefined ? status : true,
        ...updateAudit(req)
      }
    });

    res.status(201).json({ success: true, message: 'Tạo tỉnh/thành phố thành công', data: province });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'createProvince error:');
  }
};

const updateProvince = async (req, res) => {
  try {
    const id = cleanText(req.params.id);
    const existing = await prisma.TINH.findFirst({ where: { MaTinh: id, DaXoa: false } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tỉnh/thành phố' });
    }

    if (rejectCodeChange(req.body, 'MaTinh', id, 'Mã tỉnh', res)) return;

    const data = { ...updateAudit(req) };
    if (req.body.TenTinh !== undefined) {
      const TenTinh = cleanText(req.body.TenTinh);
      if (!TenTinh) return res.status(400).json({ success: false, message: 'Tên tỉnh không được để trống' });
      data.TenTinh = TenTinh;
    }

    if (req.body.LoaiTinh !== undefined) {
      const LoaiTinh = cleanText(req.body.LoaiTinh);
      if (!PROVINCE_TYPES.includes(LoaiTinh)) {
        return res.status(400).json({ success: false, message: 'Loại tỉnh/thành phố không hợp lệ' });
      }
      data.LoaiTinh = LoaiTinh;
    }

    if (req.body.TrangThai !== undefined) data.TrangThai = parseBoolean(req.body.TrangThai);

    const province = await prisma.TINH.update({ where: { MaTinh: id }, data });

    res.json({ success: true, message: 'Cập nhật tỉnh/thành phố thành công', data: province });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'updateProvince error:');
  }
};

const deleteProvince = async (req, res) => {
  try {
    const id = cleanText(req.params.id);
    const existing = await prisma.TINH.findFirst({ where: { MaTinh: id, DaXoa: false } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tỉnh/thành phố' });
    }

    const wardCount = await prisma.PHUONGXA.count({ where: { MaTinh: id, DaXoa: false } });
    if (wardCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa tỉnh/thành phố này vì còn ${wardCount} phường/xã liên quan`
      });
    }

    await prisma.TINH.update({ where: { MaTinh: id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã xóa tỉnh/thành phố' });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'deleteProvince error:');
  }
};

const getAllWards = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where = buildWardWhere({ ...req.query, search: '' });

    const rows = await prisma.PHUONGXA.findMany({
      where,
      orderBy: { MaPhuongXa: 'asc' },
      include: { TINH: true }
    });
    const searchField = cleanText(req.query.searchField);
    const filtered = filterRowsByRegex(rows, req.query.search, (row) => {
      const values = { MaPhuongXa: [row.MaPhuongXa], TenPhuongXa: [row.TenPhuongXa], Loai: [row.Loai] };
      return values[searchField] || Object.values(values).flat();
    });

    res.json({
      success: true,
      data: await attachUpdaterNames(paginateRows(filtered, page, limit)),
      pagination: getPaginationMeta(filtered.length, page, limit)
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'L\u1ed7i server', 'getAllWards error:');
  }
};

const createWard = async (req, res) => {
  try {
    const TenPhuongXa = cleanText(req.body.TenPhuongXa);
    const MaTinh = cleanText(req.body.MaTinh);
    const Loai = cleanText(req.body.Loai) || 'Xã';
    const KhuVuc = cleanText(req.body.KhuVuc) || 'KV1';

    if (!TenPhuongXa || !MaTinh) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên phường/xã và tỉnh' });
    }

    if (!WARD_TYPES.includes(Loai)) {
      return res.status(400).json({ success: false, message: 'Loại phường/xã chỉ được là Phường hoặc Xã' });
    }

    if (!AREA_CODES.includes(KhuVuc)) {
      return res.status(400).json({ success: false, message: 'Khu vực không hợp lệ' });
    }

    const province = await prisma.TINH.findFirst({ where: { MaTinh, DaXoa: false } });
    if (!province || province.TrangThai === false) {
      return res.status(400).json({ success: false, message: 'Tỉnh/thành phố không tồn tại hoặc đã khóa' });
    }

    const MaPhuongXa = await getNextNumericCode('PHUONGXA', 'MaPhuongXa');
    const status = parseBoolean(req.body.TrangThai);
    const ward = await prisma.PHUONGXA.create({
      data: {
        MaPhuongXa,
        TenPhuongXa,
        MaTinh,
        Loai,
        KhuVuc,
        TrangThai: status !== undefined ? status : true,
        ...updateAudit(req)
      }
    });

    res.status(201).json({ success: true, message: 'Tạo phường/xã thành công', data: ward });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'createWard error:');
  }
};

const updateWard = async (req, res) => {
  try {
    const id = cleanText(req.params.id);
    const existing = await prisma.PHUONGXA.findFirst({ where: { MaPhuongXa: id, DaXoa: false } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phường/xã' });
    }

    if (rejectCodeChange(req.body, 'MaPhuongXa', id, 'Mã phường/xã', res)) return;

    const data = { ...updateAudit(req) };

    if (req.body.TenPhuongXa !== undefined) {
      const TenPhuongXa = cleanText(req.body.TenPhuongXa);
      if (!TenPhuongXa) return res.status(400).json({ success: false, message: 'Tên phường/xã không được để trống' });
      data.TenPhuongXa = TenPhuongXa;
    }

    if (req.body.MaTinh !== undefined) {
      const province = await prisma.TINH.findFirst({ where: { MaTinh: cleanText(req.body.MaTinh), DaXoa: false } });
      if (!province || province.TrangThai === false) {
        return res.status(400).json({ success: false, message: 'Tỉnh/thành phố không tồn tại hoặc đã khóa' });
      }
      data.MaTinh = province.MaTinh;
    }

    if (req.body.Loai !== undefined) {
      const Loai = cleanText(req.body.Loai);
      if (!WARD_TYPES.includes(Loai)) {
        return res.status(400).json({ success: false, message: 'Loại phường/xã chỉ được là Phường hoặc Xã' });
      }
      data.Loai = Loai;
    }

    if (req.body.KhuVuc !== undefined) {
      const KhuVuc = cleanText(req.body.KhuVuc);
      if (!AREA_CODES.includes(KhuVuc)) {
        return res.status(400).json({ success: false, message: 'Khu vực không hợp lệ' });
      }
      data.KhuVuc = KhuVuc;
    }

    if (req.body.TrangThai !== undefined) data.TrangThai = parseBoolean(req.body.TrangThai);

    const ward = await prisma.PHUONGXA.update({ where: { MaPhuongXa: id }, data });

    res.json({ success: true, message: 'Cập nhật phường/xã thành công', data: ward });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'updateWard error:');
  }
};

const deleteWard = async (req, res) => {
  try {
    const id = cleanText(req.params.id);
    const existing = await prisma.PHUONGXA.findFirst({ where: { MaPhuongXa: id, DaXoa: false } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phường/xã' });
    }

    const studentCount = await prisma.SINHVIEN.count({ where: { MaPhuongXa: id, DaXoa: false } });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa phường/xã này vì còn ${studentCount} sinh viên liên quan`
      });
    }

    await prisma.PHUONGXA.update({ where: { MaPhuongXa: id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã xóa phường/xã' });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'deleteWard error:');
  }
};

module.exports = {
  getAllProvinces,
  createProvince,
  updateProvince,
  deleteProvince,
  getAllWards,
  createWard,
  updateWard,
  deleteWard
};
