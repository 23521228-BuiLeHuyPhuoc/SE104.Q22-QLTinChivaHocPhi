const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { applyPricingSearch, normalizePricingSearchScope } = require('../utils/pricingSearch');
const { recalculateRegistrationPricingForScope } = require('./registrationController');

const REQUIRED_PRICE_TYPES = ['hoc_moi', 'hoc_lai', 'hoc_cai_thien', 'hoc_he'];
const VALID_PRICING_COURSE_TYPES = new Set(['LT', 'TH']);

const normalizeText = (value) => String(value || '').trim();

const parsePositiveMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};
const bypassPricingGuard = (tx) => tx.$executeRawUnsafe('SELECT set_config($$app.bypass_pricing_guard$$, $$1$$, true)');

const normalizeSemester = (value) => value || null;

const buildPricingScope = (pricing) => ({
  LoaiMon: pricing?.LoaiMon,
  LoaiHoc: pricing?.LoaiHoc,
  MaHocKy: normalizeSemester(pricing?.MaHocKy)
});

const pricingScopeKey = (scope) => [scope.LoaiMon || '', scope.LoaiHoc || '', scope.MaHocKy || '*'].join('|');

const recalculatePricingScopes = async (tx, scopes) => {
  const seen = new Set();
  for (const scope of scopes.map(buildPricingScope)) {
    if (!scope.LoaiMon || !scope.LoaiHoc) continue;
    const key = pricingScopeKey(scope);
    if (seen.has(key)) continue;
    seen.add(key);
    await recalculateRegistrationPricingForScope(tx, scope);
  }
};

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
    const { LoaiMon, LoaiHoc, MaHocKy, TrangThai, search } = req.query;
    const searchScope = normalizePricingSearchScope(req.query.searchScope);
    const where = notDeleted();
    if (LoaiMon) where.LoaiMon = LoaiMon;
    if (LoaiHoc) where.LoaiHoc = LoaiHoc;
    if (MaHocKy === '__all__') where.MaHocKy = null;
    else if (MaHocKy) where.MaHocKy = MaHocKy;
    if (TrangThai === 'active') where.TrangThai = true;
    if (TrangThai === 'inactive') where.TrangThai = false;
    applyPricingSearch(where, searchScope, search);
    const [pricing, total] = await Promise.all([
      prisma.DONGIATINCHI.findMany({ where, skip, take: limit, orderBy: { id: 'desc' }, include: { HOCKY: { include: { NAMHOC: true } } } }),
      prisma.DONGIATINCHI.count({ where })
    ]);
    res.json({ success: true, data: pricing, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getAllPricing error:');
  }
};

const createPricing = async (req, res) => {
  try {
    const { LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu } = req.body;
    const normalizedMaHocKy = normalizeSemester(MaHocKy);
    const normalizedLoaiMon = normalizeText(LoaiMon).toUpperCase();
    const normalizedLoaiHoc = normalizeText(LoaiHoc);
    const unitPrice = parsePositiveMoney(DonGia);

    if (!normalizedLoaiMon || !normalizedLoaiHoc || !unitPrice) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin hợp lệ' });
    }
    if (!VALID_PRICING_COURSE_TYPES.has(normalizedLoaiMon)) {
      return res.status(400).json({ success: false, message: 'Loại môn không hợp lệ' });
    }
    if (!REQUIRED_PRICE_TYPES.includes(normalizedLoaiHoc)) {
      return res.status(400).json({ success: false, message: 'Loại học không hợp lệ' });
    }
    if (await isPricingScopeComplete(normalizedLoaiMon, normalizedMaHocKy)) {
      return res.status(400).json({ success: false, message: 'Phạm vi này đã đủ học mới, học lại, cải thiện và học hè' });
    }
    if (await findActivePricing(normalizedLoaiMon, normalizedLoaiHoc, normalizedMaHocKy)) {
      return res.status(400).json({ success: false, message: 'Đơn giá cho loại môn, loại học và học kỳ này đã tồn tại' });
    }
    const reusablePricing = await prisma.DONGIATINCHI.findFirst({
      where: {
        LoaiMon: normalizedLoaiMon,
        LoaiHoc: normalizedLoaiHoc,
        MaHocKy: normalizedMaHocKy,
        OR: [{ DaXoa: true }, { TrangThai: false }]
      },
      orderBy: { id: 'desc' }
    });

    const pricing = await prisma.$transaction(async (tx) => {
      const data = {
        LoaiMon: normalizedLoaiMon,
        LoaiHoc: normalizedLoaiHoc,
        DonGia: unitPrice,
        MaHocKy: normalizedMaHocKy,
        GhiChu: GhiChu !== undefined ? normalizeText(GhiChu) || null : null,
        TrangThai: true,
        DaXoa: false,
        NguoiXoa: null,
        NgayXoa: null,
        ...updateAudit(req)
      };
      if (reusablePricing) await bypassPricingGuard(tx);
      const row = reusablePricing
        ? await tx.DONGIATINCHI.update({ where: { id: reusablePricing.id }, data })
        : await tx.DONGIATINCHI.create({ data });
      await recalculatePricingScopes(tx, [row]);
      return row;
    });
    res.status(reusablePricing ? 200 : 201).json({ success: true, message: 'Tạo đơn giá thành công', data: pricing });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Đơn giá cho loại môn, loại học và học kỳ này đã tồn tại' });
        return sendErrorResponse(res, error, 'Lỗi server', 'createPricing error:');
  }
};

const updatePricing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    const { LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu, TrangThai } = req.body;
    const current = await prisma.DONGIATINCHI.findUnique({ where: { id } });
    if (!current || current.DaXoa) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn giá' });

    const nextLoaiMon = LoaiMon !== undefined ? normalizeText(LoaiMon).toUpperCase() : current.LoaiMon;
    const nextLoaiHoc = LoaiHoc !== undefined ? normalizeText(LoaiHoc) : current.LoaiHoc;
    const nextMaHocKy = MaHocKy !== undefined ? normalizeSemester(MaHocKy) : current.MaHocKy;
    const data = updateAudit(req);

    if (!VALID_PRICING_COURSE_TYPES.has(nextLoaiMon)) {
      return res.status(400).json({ success: false, message: 'Loại môn không hợp lệ' });
    }
    if (!REQUIRED_PRICE_TYPES.includes(nextLoaiHoc)) {
      return res.status(400).json({ success: false, message: 'Loại học không hợp lệ' });
    }
    if (DonGia !== undefined) {
      const unitPrice = parsePositiveMoney(DonGia);
      if (!unitPrice) return res.status(400).json({ success: false, message: 'Đơn giá phải lớn hơn 0' });
      data.DonGia = unitPrice;
    }

    if (LoaiMon !== undefined) data.LoaiMon = nextLoaiMon;
    if (LoaiHoc !== undefined) data.LoaiHoc = nextLoaiHoc;
    if (MaHocKy !== undefined) data.MaHocKy = nextMaHocKy;
    if (GhiChu !== undefined) data.GhiChu = normalizeText(GhiChu) || null;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;

    if (await findActivePricing(nextLoaiMon, nextLoaiHoc, nextMaHocKy, id)) {
      return res.status(400).json({ success: false, message: 'Đơn giá cho loại môn, loại học và học kỳ này đã tồn tại' });
    }
    if (!current.TrangThai && data.TrangThai === true && await isPricingScopeComplete(nextLoaiMon, nextMaHocKy, id)) {
      return res.status(400).json({ success: false, message: 'Phạm vi này đã đủ bốn loại đơn giá' });
    }

    const pricing = await prisma.$transaction(async (tx) => {
      await bypassPricingGuard(tx);
      const row = await tx.DONGIATINCHI.update({ where: { id }, data });
      await recalculatePricingScopes(tx, [current, row]);
      return row;
    });
    res.json({ success: true, message: 'Cập nhật đơn giá thành công', data: pricing });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Đơn giá cho loại môn, loại học và học kỳ này đã tồn tại' });
        return sendErrorResponse(res, error, 'Lỗi server', 'updatePricing error:');
  }
};

const deletePricing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const current = await prisma.DONGIATINCHI.findUnique({ where: { id } });
    if (!current || current.DaXoa) return res.status(404).json({ success: false, message: 'Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01a1n gi\u00e1' });
    await prisma.$transaction(async (tx) => {
      await tx.DONGIATINCHI.update({ where: { id }, data: softDeleteAudit(req) });
      await recalculatePricingScopes(tx, [current]);
    });
    res.json({ success: true, message: 'Đã chuyển đơn giá vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'deletePricing error:');
  }
};

module.exports = { getAllPricing, createPricing, updatePricing, deletePricing, REQUIRED_PRICE_TYPES };
