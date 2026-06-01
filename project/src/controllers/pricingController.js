const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const REQUIRED_PRICE_TYPES = ['hoc_moi', 'hoc_lai', 'hoc_cai_thien', 'hoc_he'];

const normalizeSemester = (value) => value || null;

const isPricingScopeComplete = async (LoaiMon, MaHocKy, excludeId = null) => {
  const rows = await prisma.DONGIATINCHI.findMany({
    where: {
      LoaiMon,
      MaHocKy: normalizeSemester(MaHocKy),
      DaXoa: false,
      TrangThai: true,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { LoaiHoc: true }
  });
  const found = new Set(rows.map((row) => row.LoaiHoc));
  return REQUIRED_PRICE_TYPES.every((type) => found.has(type));
};

const findActivePricing = (LoaiMon, LoaiHoc, MaHocKy, excludeId = null) => prisma.DONGIATINCHI.findFirst({
  where: {
    LoaiMon,
    LoaiHoc,
    MaHocKy: normalizeSemester(MaHocKy),
    DaXoa: false,
    TrangThai: true,
    ...(excludeId ? { id: { not: excludeId } } : {})
  }
});

const getAllPricing = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { LoaiMon, MaHocKy } = req.query;
    const where = notDeleted();
    if (LoaiMon) where.LoaiMon = LoaiMon;
    if (MaHocKy) where.MaHocKy = MaHocKy;
    const [pricing, total] = await Promise.all([
      prisma.DONGIATINCHI.findMany({ where, skip, take: limit, orderBy: { id: 'desc' }, include: { HOCKY: true } }),
      prisma.DONGIATINCHI.count({ where })
    ]);
    res.json({ success: true, data: pricing, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'getAllPricing error:');
  }
};

const createPricing = async (req, res) => {
  try {
    const { LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu } = req.body;
    if (!LoaiMon || !LoaiHoc || !DonGia) return res.status(400).json({ success: false, message: 'Vui long nhap day du thong tin' });
    if (!REQUIRED_PRICE_TYPES.includes(LoaiHoc)) {
      return res.status(400).json({ success: false, message: 'Loai hoc khong hop le' });
    }
    if (await isPricingScopeComplete(LoaiMon, MaHocKy)) {
      return res.status(400).json({ success: false, message: 'Pham vi nay da du hoc moi, hoc lai, cai thien va hoc he' });
    }
    if (await findActivePricing(LoaiMon, LoaiHoc, MaHocKy)) {
      return res.status(400).json({ success: false, message: 'Don gia cho loai mon, loai hoc va hoc ky nay da ton tai' });
    }
    const pricing = await prisma.DONGIATINCHI.create({
      data: { LoaiMon, LoaiHoc, DonGia: parseInt(DonGia, 10), MaHocKy: normalizeSemester(MaHocKy), GhiChu, ...updateAudit(req) }
    });
    res.status(201).json({ success: true, message: 'Tao don gia thanh cong', data: pricing });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Don gia cho loai mon, loai hoc va hoc ky nay da ton tai' });
        return sendErrorResponse(res, error, 'Loi server', 'createPricing error:');
  }
};

const updatePricing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu, TrangThai } = req.body;
    const current = await prisma.DONGIATINCHI.findUnique({ where: { id } });
    if (!current || current.DaXoa) return res.status(404).json({ success: false, message: 'Khong tim thay don gia' });

    const nextLoaiMon = LoaiMon || current.LoaiMon;
    const nextLoaiHoc = LoaiHoc || current.LoaiHoc;
    const nextMaHocKy = MaHocKy !== undefined ? normalizeSemester(MaHocKy) : current.MaHocKy;
    const data = updateAudit(req);
    if (LoaiMon) data.LoaiMon = LoaiMon;
    if (LoaiHoc) data.LoaiHoc = LoaiHoc;
    if (DonGia !== undefined) data.DonGia = parseInt(DonGia, 10);
    if (MaHocKy !== undefined) data.MaHocKy = normalizeSemester(MaHocKy);
    if (GhiChu !== undefined) data.GhiChu = GhiChu;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;

    if (LoaiHoc && !REQUIRED_PRICE_TYPES.includes(LoaiHoc)) {
      return res.status(400).json({ success: false, message: 'Loai hoc khong hop le' });
    }
    if (await findActivePricing(nextLoaiMon, nextLoaiHoc, nextMaHocKy, id)) {
      return res.status(400).json({ success: false, message: 'Don gia cho loai mon, loai hoc va hoc ky nay da ton tai' });
    }
    if (!current.TrangThai && data.TrangThai === true && await isPricingScopeComplete(nextLoaiMon, nextMaHocKy, id)) {
      return res.status(400).json({ success: false, message: 'Pham vi nay da du bon loai don gia' });
    }

    const pricing = await prisma.DONGIATINCHI.update({ where: { id }, data });
    res.json({ success: true, message: 'Cap nhat don gia thanh cong', data: pricing });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Don gia cho loai mon, loai hoc va hoc ky nay da ton tai' });
        return sendErrorResponse(res, error, 'Loi server', 'updatePricing error:');
  }
};

const deletePricing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.DONGIATINCHI.update({ where: { id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Da chuyen don gia vao thung rac' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'deletePricing error:');
  }
};

module.exports = { getAllPricing, createPricing, updatePricing, deletePricing, REQUIRED_PRICE_TYPES };
