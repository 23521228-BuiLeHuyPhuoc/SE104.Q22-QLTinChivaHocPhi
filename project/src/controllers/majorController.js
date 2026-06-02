const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const {
  getCurriculumRows,
  validateCurriculumPlacement,
  calculateCurriculumDebt,
  getThesisEligibility
} = require('../services/curriculumService');

const getAllMajors = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, MaKhoa, all } = req.query;
    const where = notDeleted();
    if (search) where.OR = [{ MaNganh: { contains: search, mode: 'insensitive' } }, { TenNganh: { contains: search, mode: 'insensitive' } }];
    if (MaKhoa) where.MaKhoa = MaKhoa;
    const [majors, total] = await Promise.all([
      prisma.NGANHHOC.findMany({ where, skip: all === 'true' ? undefined : skip, take: all === 'true' ? undefined : limit, orderBy: { MaNganh: 'asc' }, include: { KHOA: true, _count: { select: { SINHVIEN: true } } } }),
      prisma.NGANHHOC.count({ where })
    ]);
    res.json({ success: true, data: majors, pagination: getPaginationMeta(total, page, all === 'true' ? (total || limit) : limit) });
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

const getCurriculum = async (req, res) => {
  try {
    const data = await getCurriculumRows({ ...req.query, MaNganh: req.query.MaNganh || req.params.id });
    res.json({ success: true, data });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getCurriculum error:');
  }
};

const createCurriculumItem = async (req, res) => {
  try {
    const validated = await validateCurriculumPlacement(req.body);
    if (validated.error) return res.status(400).json({ success: false, message: validated.error, violations: validated.violations || [] });
    const d = validated.data;
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "CHUONGTRINHHOC" ("MaNganh", "MaMonHoc", "HocKy", "HocKyDuKien", "BatBuoc", "TrangThai", "GhiChu")
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      d.MaNganh, d.MaMonHoc, d.HocKyDuKien, d.HocKyDuKien,
      d.BatBuoc ?? true, d.TrangThai ?? true, d.GhiChu || null
    );
    res.status(201).json({ success: true, message: 'Thêm môn vào chương trình thành công', data: rows[0] });
  } catch (error) {
    if (error.code === 'P2010' || (error.message && error.message.includes('uq_cth'))) return res.status(400).json({ success: false, message: 'Môn học đã có trong chương trình' });
    if (error.message && error.message.includes('RBTV')) {
        const msg = error.message.match(/Vi phạm RBTV[^\n\"]+/)?.[0] || 'Lỗi ràng buộc database (RBTV)';
        return res.status(400).json({ success: false, message: msg });
    }
    return sendErrorResponse(res, error, 'Lỗi server', 'createCurriculumItem error:');
  }
};

const updateCurriculumItem = async (req, res) => {
  try {
    const id = parseInt(req.params.itemId || req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    const existing = await prisma.CHUONGTRINHHOC.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy môn trong chương trình' });
    const validated = await validateCurriculumPlacement({
      MaNganh: req.body.MaNganh ?? existing.MaNganh,
      MaMonHoc: req.body.MaMonHoc ?? existing.MaMonHoc,
      HocKyDuKien: req.body.HocKyDuKien ?? existing.HocKyDuKien,
      BatBuoc: req.body.BatBuoc ?? existing.BatBuoc,
      TrangThai: req.body.TrangThai ?? existing.TrangThai,
      GhiChu: req.body.GhiChu ?? existing.GhiChu
    }, id);
    if (validated.error) return res.status(400).json({ success: false, message: validated.error, violations: validated.violations || [] });
    const d = validated.data;
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE "CHUONGTRINHHOC" SET "MaNganh"=$1, "MaMonHoc"=$2, "HocKy"=$3, "HocKyDuKien"=$4, "BatBuoc"=$5, "TrangThai"=$6, "GhiChu"=$7 WHERE "id"=$8 RETURNING *`,
      d.MaNganh, d.MaMonHoc, d.HocKyDuKien, d.HocKyDuKien,
      d.BatBuoc ?? true, d.TrangThai ?? true, d.GhiChu || null, id
    );
    res.json({ success: true, message: 'Cập nhật chương trình thành công', data: rows[0] });
  } catch (error) {
    if (error.code === 'P2010' || (error.message && error.message.includes('uq_cth'))) return res.status(400).json({ success: false, message: 'Môn học đã có trong chương trình' });
    if (error.message && error.message.includes('RBTV')) {
        const msg = error.message.match(/Vi phạm RBTV[^\n\"]+/)?.[0] || 'Lỗi ràng buộc database (RBTV)';
        return res.status(400).json({ success: false, message: msg });
    }
    return sendErrorResponse(res, error, 'Lỗi server', 'updateCurriculumItem error:');
  }
};

const deleteCurriculumItem = async (req, res) => {
  try {
    const id = parseInt(req.params.itemId || req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    await prisma.CHUONGTRINHHOC.delete({ where: { id } });
    res.json({ success: true, message: 'Đã gỡ môn khỏi chương trình' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'deleteCurriculumItem error:');
  }
};

const getStudentDebt = async (req, res) => {
  try {
    const data = await calculateCurriculumDebt(req.params.maSv || req.params.id, req.query.MaHocKy);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    res.json({ success: true, data });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getStudentDebt error:');
  }
};

const getStudentThesisEligibility = async (req, res) => {
  try {
    const data = await getThesisEligibility(req.params.maSv || req.params.id, req.query.MaHocKy);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    res.json({ success: true, data });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getStudentThesisEligibility error:');
  }
};

module.exports = {
  getAllMajors,
  createMajor,
  updateMajor,
  deleteMajor,
  getCurriculum,
  createCurriculumItem,
  updateCurriculumItem,
  deleteCurriculumItem,
  getStudentDebt,
  getStudentThesisEligibility
};
