const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const CONDITION_TYPES = new Set(['tien_quyet', 'hoc_truoc']);

const normalizeCode = (value) => String(value || '').trim().toUpperCase();
const normalizeType = (value) => String(value || 'hoc_truoc').trim();

const includeCourses = {
  MONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC: {
    select: { MaMonHoc: true, TenMonHoc: true, SoTinChi: true, LoaiMon: true }
  },
  MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC: {
    select: { MaMonHoc: true, TenMonHoc: true, SoTinChi: true, LoaiMon: true }
  }
};

const getPrerequisites = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search = '', LoaiDieuKien = '', TrangThai = '' } = req.query;
    const where = notDeleted();
    if (CONDITION_TYPES.has(LoaiDieuKien)) where.LoaiDieuKien = LoaiDieuKien;
    if (TrangThai !== '') where.TrangThai = TrangThai === 'true';
    if (search) {
      where.OR = [
        { MaMonHoc: { contains: search, mode: 'insensitive' } },
        { MaMonDieuKien: { contains: search, mode: 'insensitive' } },
        { MoTa: { contains: search, mode: 'insensitive' } },
        {
          MONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC: {
            TenMonHoc: { contains: search, mode: 'insensitive' }
          }
        },
        {
          MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC: {
            TenMonHoc: { contains: search, mode: 'insensitive' }
          }
        }
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.DIEUKIENMONHOC.findMany({
        where,
        skip,
        take: limit,
        include: includeCourses,
        orderBy: [{ MaMonHoc: 'asc' }, { LoaiDieuKien: 'asc' }, { MaMonDieuKien: 'asc' }]
      }),
      prisma.DIEUKIENMONHOC.count({ where })
    ]);

    res.json({ success: true, data: rows, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get prerequisites error:');
  }
};

const getPrerequisiteById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'ID khong hop le' });
    const row = await prisma.DIEUKIENMONHOC.findFirst({ where: { id, DaXoa: false }, include: includeCourses });
    if (!row) return res.status(404).json({ success: false, message: 'Khong tim thay rang buoc mon hoc' });
    res.json({ success: true, data: row });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get prerequisite error:');
  }
};

const validatePayload = async (body, currentId = null) => {
  const MaMonHoc = normalizeCode(body.MaMonHoc);
  const MaMonDieuKien = normalizeCode(body.MaMonDieuKien);
  const LoaiDieuKien = normalizeType(body.LoaiDieuKien);
  const MoTa = String(body.MoTa || '').trim() || null;
  const TrangThai = body.TrangThai === undefined ? true : body.TrangThai === true || body.TrangThai === 'true';

  if (!MaMonHoc || !MaMonDieuKien) {
    return { error: 'Vui lòng chọn môn học và môn điều kiện' };
  }
  if (MaMonHoc === MaMonDieuKien) {
    return { error: 'Môn học không thể ràng buộc chính nó' };
  }
  if (!CONDITION_TYPES.has(LoaiDieuKien)) {
    return { error: 'Loại điều kiện không hợp lệ' };
  }

  const [course, requiredCourse, duplicate] = await Promise.all([
    prisma.MONHOC.findFirst({ where: { MaMonHoc, DaXoa: false }, select: { MaMonHoc: true } }),
    prisma.MONHOC.findFirst({ where: { MaMonHoc: MaMonDieuKien, DaXoa: false }, select: { MaMonHoc: true } }),
    prisma.DIEUKIENMONHOC.findFirst({
      where: {
        MaMonHoc,
        MaMonDieuKien,
        LoaiDieuKien,
        ...(currentId ? { NOT: { id: currentId } } : {})
      }
    })
  ]);

  if (!course) return { error: 'Môn học chính không tồn tại' };
  if (!requiredCourse) return { error: 'Môn điều kiện không tồn tại' };
  if (duplicate && duplicate.DaXoa === false) return { error: 'Ràng buộc môn học này đã tồn tại' };

  return {
    data: {
      MaMonHoc,
      MaMonDieuKien,
      LoaiDieuKien,
      MoTa,
      TrangThai
    },
    duplicate
  };
};

const createPrerequisite = async (req, res) => {
  try {
    const validated = await validatePayload(req.body);
    if (validated.error) return res.status(400).json({ success: false, message: validated.error });

    const data = { ...validated.data, ...updateAudit(req) };
    const row = validated.duplicate
      ? await prisma.DIEUKIENMONHOC.update({
        where: { id: validated.duplicate.id },
        data: { ...data, DaXoa: false, NguoiXoa: null, NgayXoa: null },
        include: includeCourses
      })
      : await prisma.DIEUKIENMONHOC.create({ data, include: includeCourses });

    res.status(201).json({ success: true, message: 'Luu rang buoc mon hoc thanh cong', data: row });
  } catch (error) {
    console.error('Create prerequisite error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Rang buoc mon hoc nay da ton tai' });
    }
    return sendErrorResponse(res, error, 'Khong the tao rang buoc mon hoc');
  }
};

const updatePrerequisite = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'ID khong hop le' });
    const existing = await prisma.DIEUKIENMONHOC.findFirst({ where: { id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay rang buoc mon hoc' });

    const validated = await validatePayload({
      MaMonHoc: req.body.MaMonHoc ?? existing.MaMonHoc,
      MaMonDieuKien: req.body.MaMonDieuKien ?? existing.MaMonDieuKien,
      LoaiDieuKien: req.body.LoaiDieuKien ?? existing.LoaiDieuKien,
      MoTa: req.body.MoTa ?? existing.MoTa,
      TrangThai: req.body.TrangThai ?? existing.TrangThai
    }, id);
    if (validated.error) return res.status(400).json({ success: false, message: validated.error });
    if (validated.duplicate && validated.duplicate.id !== id) {
      return res.status(400).json({ success: false, message: 'Rang buoc mon hoc nay da ton tai' });
    }

    const updated = await prisma.DIEUKIENMONHOC.update({
      where: { id },
      data: { ...validated.data, ...updateAudit(req) },
      include: includeCourses
    });
    res.json({ success: true, message: 'Cap nhat rang buoc mon hoc thanh cong', data: updated });
  } catch (error) {
    console.error('Update prerequisite error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Rang buoc mon hoc nay da ton tai' });
    }
    return sendErrorResponse(res, error, 'Khong the cap nhat rang buoc mon hoc');
  }
};

const deletePrerequisite = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'ID khong hop le' });
    const existing = await prisma.DIEUKIENMONHOC.findFirst({ where: { id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay rang buoc mon hoc' });
    await prisma.DIEUKIENMONHOC.update({ where: { id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Da chuyen rang buoc mon hoc vao thung rac' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Khong the xoa rang buoc mon hoc', 'Delete prerequisite error:');
  }
};

const getPrerequisiteGraph = async (req, res) => {
  try {
    const rows = await prisma.DIEUKIENMONHOC.findMany({
      where: { DaXoa: false, TrangThai: true },
      include: includeCourses,
      orderBy: [{ MaMonHoc: 'asc' }, { MaMonDieuKien: 'asc' }]
    });
    const nodes = new Map();
    const edges = rows.map((row) => {
      const course = row.MONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC;
      const required = row.MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC;
      nodes.set(row.MaMonHoc, { id: row.MaMonHoc, label: course?.TenMonHoc || row.MaMonHoc });
      nodes.set(row.MaMonDieuKien, { id: row.MaMonDieuKien, label: required?.TenMonHoc || row.MaMonDieuKien });
      return { from: row.MaMonDieuKien, to: row.MaMonHoc, type: row.LoaiDieuKien };
    });
    res.json({ success: true, data: { nodes: Array.from(nodes.values()), edges } });
  } catch (error) {
        return sendErrorResponse(res, error, 'La»—i server', 'getPrerequisiteGraph error:');
  }
};

module.exports = {
  getPrerequisites,
  getPrerequisiteById,
  createPrerequisite,
  updatePrerequisite,
  deletePrerequisite,
  getPrerequisiteGraph
};
