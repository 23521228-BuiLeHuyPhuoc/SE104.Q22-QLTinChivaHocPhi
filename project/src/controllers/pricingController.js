const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');

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
    console.error('getAllPricing error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createPricing = async (req, res) => {
  try {
    const { LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu } = req.body;
    if (!LoaiMon || !LoaiHoc || !DonGia) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    if (await isPricingScopeComplete(LoaiMon, MaHocKy)) {
      return res.status(400).json({ success: false, message: 'Phạm vi này đã đủ học mới, học lại, cải thiện và học hè' });
    }
    const pricing = await prisma.DONGIATINCHI.create({
      data: { LoaiMon, LoaiHoc, DonGia: parseInt(DonGia, 10), MaHocKy: normalizeSemester(MaHocKy), GhiChu, ...updateAudit(req) }
    });
    res.status(201).json({ success: true, message: 'Tạo đơn giá thành công', data: pricing });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Đơn giá cho loại môn, loại học và học kỳ này đã tồn tại' });
    console.error('createPricing error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updatePricing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu, TrangThai } = req.body;
    const current = await prisma.DONGIATINCHI.findUnique({ where: { id } });
    if (!current || current.DaXoa) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn giá' });

    const nextLoaiMon = LoaiMon || current.LoaiMon;
    const nextMaHocKy = MaHocKy !== undefined ? normalizeSemester(MaHocKy) : current.MaHocKy;
    const data = updateAudit(req);
    if (LoaiMon) data.LoaiMon = LoaiMon;
    if (LoaiHoc) data.LoaiHoc = LoaiHoc;
    if (DonGia !== undefined) data.DonGia = parseInt(DonGia, 10);
    if (MaHocKy !== undefined) data.MaHocKy = normalizeSemester(MaHocKy);
    if (GhiChu !== undefined) data.GhiChu = GhiChu;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;

    if (LoaiHoc && !REQUIRED_PRICE_TYPES.includes(LoaiHoc)) {
      return res.status(400).json({ success: false, message: 'Loại học không hợp lệ' });
    }
    if (!current.TrangThai && data.TrangThai === true && await isPricingScopeComplete(nextLoaiMon, nextMaHocKy, id)) {
      return res.status(400).json({ success: false, message: 'Phạm vi này đã đủ bốn loại đơn giá' });
    }

    const pricing = await prisma.DONGIATINCHI.update({ where: { id }, data });
    res.json({ success: true, message: 'Cập nhật đơn giá thành công', data: pricing });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Đơn giá cho loại môn, loại học và học kỳ này đã tồn tại' });
    console.error('updatePricing error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deletePricing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.DONGIATINCHI.update({ where: { id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển đơn giá vào thùng rác' });
  } catch (error) {
    console.error('deletePricing error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getAllPricing, createPricing, updatePricing, deletePricing, REQUIRED_PRICE_TYPES };
