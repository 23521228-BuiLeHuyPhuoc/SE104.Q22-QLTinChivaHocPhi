const prisma = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { sendErrorResponse } = require('../utils/errorHandler');

const cleanText = (value) => String(value || '').trim();

const parseBoolean = (value) => {
  if (value === undefined || value === '') return undefined;
  return value === true || value === 'true';
};

const buildProvinceWhere = (query) => {
  const { search, TrangThai } = query;
  const where = {};

  if (search) {
    where.OR = [
      { MaTinh: { contains: search, mode: 'insensitive' } },
      { TenTinh: { contains: search, mode: 'insensitive' } },
      { LoaiTinh: { contains: search, mode: 'insensitive' } }
    ];
  }

  const status = parseBoolean(TrangThai);
  if (status !== undefined) where.TrangThai = status;

  return where;
};

const buildWardWhere = (query) => {
  const { search, MaTinh, KhuVuc, TrangThai } = query;
  const where = {};

  if (MaTinh) where.MaTinh = MaTinh;
  if (KhuVuc) where.KhuVuc = KhuVuc;

  if (search) {
    where.OR = [
      { MaPhuongXa: { contains: search, mode: 'insensitive' } },
      { TenPhuongXa: { contains: search, mode: 'insensitive' } },
      { Loai: { contains: search, mode: 'insensitive' } },
      { KhuVuc: { contains: search, mode: 'insensitive' } },
      { TINH: { TenTinh: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const status = parseBoolean(TrangThai);
  if (status !== undefined) where.TrangThai = status;

  return where;
};

const getAllProvinces = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = buildProvinceWhere(req.query);

    const [rows, total] = await Promise.all([
      prisma.TINH.findMany({
        where,
        skip,
        take: limit,
        orderBy: { MaTinh: 'asc' },
        include: { _count: { select: { PHUONGXA: true } } }
      }),
      prisma.TINH.count({ where })
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'getAllProvinces error:');
  }
};

const createProvince = async (req, res) => {
  try {
    const MaTinh = cleanText(req.body.MaTinh);
    const TenTinh = cleanText(req.body.TenTinh);
    const LoaiTinh = cleanText(req.body.LoaiTinh) || 'Tỉnh';

    if (!MaTinh || !TenTinh) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã tỉnh và tên tỉnh/thành phố' });
    }

    if (!['Tỉnh', 'Thành phố'].includes(LoaiTinh)) {
      return res.status(400).json({ success: false, message: 'Loại tỉnh không hợp lệ' });
    }

    const existing = await prisma.TINH.findUnique({ where: { MaTinh } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã tỉnh đã tồn tại' });
    }

    const province = await prisma.TINH.create({
      data: {
        MaTinh,
        TenTinh,
        LoaiTinh,
        TrangThai: req.body.TrangThai !== undefined ? req.body.TrangThai : true
      }
    });

    res.status(201).json({ success: true, message: 'Tạo tỉnh/thành phố thành công', data: province });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'createProvince error:');
  }
};

const updateProvince = async (req, res) => {
  try {
    const existing = await prisma.TINH.findUnique({ where: { MaTinh: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tỉnh/thành phố' });
    }

    const data = {};
    if (req.body.TenTinh !== undefined) {
      const TenTinh = cleanText(req.body.TenTinh);
      if (!TenTinh) return res.status(400).json({ success: false, message: 'Tên tỉnh không được để trống' });
      data.TenTinh = TenTinh;
    }

    if (req.body.LoaiTinh !== undefined) {
      const LoaiTinh = cleanText(req.body.LoaiTinh);
      if (!['Tỉnh', 'Thành phố'].includes(LoaiTinh)) {
        return res.status(400).json({ success: false, message: 'Loại tỉnh không hợp lệ' });
      }
      data.LoaiTinh = LoaiTinh;
    }

    if (req.body.TrangThai !== undefined) data.TrangThai = req.body.TrangThai;

    const province = await prisma.TINH.update({
      where: { MaTinh: req.params.id },
      data
    });

    res.json({ success: true, message: 'Cập nhật tỉnh/thành phố thành công', data: province });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'updateProvince error:');
  }
};

const getAllWards = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = buildWardWhere(req.query);

    const [rows, total] = await Promise.all([
      prisma.PHUONGXA.findMany({
        where,
        skip,
        take: limit,
        orderBy: { MaPhuongXa: 'asc' },
        include: { TINH: true }
      }),
      prisma.PHUONGXA.count({ where })
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'getAllWards error:');
  }
};

const createWard = async (req, res) => {
  try {
    const MaPhuongXa = cleanText(req.body.MaPhuongXa);
    const TenPhuongXa = cleanText(req.body.TenPhuongXa);
    const MaTinh = cleanText(req.body.MaTinh);
    const Loai = cleanText(req.body.Loai) || 'Xã';
    const KhuVuc = cleanText(req.body.KhuVuc) || 'KV1';

    if (!MaPhuongXa || !TenPhuongXa || !MaTinh) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã, tên phường/xã và tỉnh' });
    }

    if (!['Phường', 'Xã', 'Thị trấn'].includes(Loai)) {
      return res.status(400).json({ success: false, message: 'Loại phường/xã không hợp lệ' });
    }

    if (!['KV1', 'KV2', 'KV2-NT', 'KV3'].includes(KhuVuc)) {
      return res.status(400).json({ success: false, message: 'Khu vực không hợp lệ' });
    }

    const [existing, province] = await Promise.all([
      prisma.PHUONGXA.findUnique({ where: { MaPhuongXa } }),
      prisma.TINH.findUnique({ where: { MaTinh } })
    ]);

    if (existing) return res.status(400).json({ success: false, message: 'Mã phường/xã đã tồn tại' });
    if (!province || province.TrangThai === false) {
      return res.status(400).json({ success: false, message: 'Tỉnh/thành phố không tồn tại hoặc đã khóa' });
    }

    const ward = await prisma.PHUONGXA.create({
      data: {
        MaPhuongXa,
        TenPhuongXa,
        MaTinh,
        Loai,
        KhuVuc,
        TrangThai: req.body.TrangThai !== undefined ? req.body.TrangThai : true
      }
    });

    res.status(201).json({ success: true, message: 'Tạo phường/xã thành công', data: ward });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'createWard error:');
  }
};

const updateWard = async (req, res) => {
  try {
    const existing = await prisma.PHUONGXA.findUnique({ where: { MaPhuongXa: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phường/xã' });
    }

    const data = {};

    if (req.body.TenPhuongXa !== undefined) {
      const TenPhuongXa = cleanText(req.body.TenPhuongXa);
      if (!TenPhuongXa) return res.status(400).json({ success: false, message: 'Tên phường/xã không được để trống' });
      data.TenPhuongXa = TenPhuongXa;
    }

    if (req.body.MaTinh !== undefined) {
      const province = await prisma.TINH.findUnique({ where: { MaTinh: cleanText(req.body.MaTinh) } });
      if (!province || province.TrangThai === false) {
        return res.status(400).json({ success: false, message: 'Tỉnh/thành phố không tồn tại hoặc đã khóa' });
      }
      data.MaTinh = province.MaTinh;
    }

    if (req.body.Loai !== undefined) {
      const Loai = cleanText(req.body.Loai);
      if (!['Phường', 'Xã', 'Thị trấn'].includes(Loai)) {
        return res.status(400).json({ success: false, message: 'Loại phường/xã không hợp lệ' });
      }
      data.Loai = Loai;
    }

    if (req.body.KhuVuc !== undefined) {
      const KhuVuc = cleanText(req.body.KhuVuc);
      if (!['KV1', 'KV2', 'KV2-NT', 'KV3'].includes(KhuVuc)) {
        return res.status(400).json({ success: false, message: 'Khu vực không hợp lệ' });
      }
      data.KhuVuc = KhuVuc;
    }

    if (req.body.TrangThai !== undefined) data.TrangThai = req.body.TrangThai;

    const ward = await prisma.PHUONGXA.update({
      where: { MaPhuongXa: req.params.id },
      data
    });

    res.json({ success: true, message: 'Cập nhật phường/xã thành công', data: ward });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'updateWard error:');
  }
};

module.exports = {
  getAllProvinces,
  createProvince,
  updateProvince,
  getAllWards,
  createWard,
  updateWard
};
