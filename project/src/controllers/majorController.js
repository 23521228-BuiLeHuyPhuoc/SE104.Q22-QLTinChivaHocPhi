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

const normalizeText = (value) => String(value || '').trim();

const parsePositiveInt = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePositiveNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getAllMajors = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, MaKhoa, all } = req.query;
    const searchField = ['MaNganh', 'TenNganh', 'TenKhoa'].includes(req.query.searchField) ? req.query.searchField : 'all';
    const where = notDeleted();
    if (search) {
      const searchMap = {
        MaNganh: [{ MaNganh: { contains: search, mode: 'insensitive' } }],
        TenNganh: [{ TenNganh: { contains: search, mode: 'insensitive' } }],
        TenKhoa: [{ KHOA: { is: { TenKhoa: { contains: search, mode: 'insensitive' } } } }]
      };
      where.OR = searchField === 'all'
        ? [...searchMap.MaNganh, ...searchMap.TenNganh, ...searchMap.TenKhoa]
        : searchMap[searchField];
    }
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
    const majorId = normalizeText(MaNganh);
    const majorName = normalizeText(TenNganh);
    const facultyId = normalizeText(MaKhoa);
    const minCredits = parsePositiveInt(SoTinChiToiThieu, 120);
    const trainingYears = parsePositiveNumber(ThoiGianDaoTao, 4);

    if (!majorId || !majorName || !facultyId) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    if (!minCredits) return res.status(400).json({ success: false, message: 'Số tín chỉ tối thiểu phải là số nguyên dương' });
    if (!trainingYears) return res.status(400).json({ success: false, message: 'Thời gian đào tạo phải lớn hơn 0' });

    const existing = await prisma.NGANHHOC.findUnique({ where: { MaNganh: majorId } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã ngành đã tồn tại' });
    const major = await prisma.NGANHHOC.create({
      data: {
        MaNganh: majorId,
        TenNganh: majorName,
        MaKhoa: facultyId,
        SoTinChiToiThieu: minCredits,
        ThoiGianDaoTao: trainingYears,
        MoTa: MoTa !== undefined ? normalizeText(MoTa) || null : null,
        ...updateAudit(req)
      }
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
    if (TenNganh !== undefined) {
      const majorName = normalizeText(TenNganh);
      if (!majorName) return res.status(400).json({ success: false, message: 'Tên ngành không được để trống' });
      data.TenNganh = majorName;
    }
    if (MaKhoa !== undefined) {
      const facultyId = normalizeText(MaKhoa);
      if (!facultyId) return res.status(400).json({ success: false, message: 'Khoa không được để trống' });
      data.MaKhoa = facultyId;
    }
    if (SoTinChiToiThieu !== undefined) {
      const minCredits = parsePositiveInt(SoTinChiToiThieu);
      if (!minCredits) return res.status(400).json({ success: false, message: 'Số tín chỉ tối thiểu phải là số nguyên dương' });
      data.SoTinChiToiThieu = minCredits;
    }
    if (ThoiGianDaoTao !== undefined) {
      const trainingYears = parsePositiveNumber(ThoiGianDaoTao);
      if (!trainingYears) return res.status(400).json({ success: false, message: 'Thời gian đào tạo phải lớn hơn 0' });
      data.ThoiGianDaoTao = trainingYears;
    }
    if (MoTa !== undefined) data.MoTa = normalizeText(MoTa) || null;
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
      `INSERT INTO "CHUONGTRINHHOC" ("MaNganh", "MaMonHoc", "HocKy", "HocKyDuKien", "TrangThai", "GhiChu")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      d.MaNganh, d.MaMonHoc, d.HocKyDuKien, d.HocKyDuKien,
      d.TrangThai ?? true, d.GhiChu || null
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
    if (req.body.MaNganh !== undefined && normalizeText(req.body.MaNganh).toUpperCase() !== existing.MaNganh) {
      return res.status(400).json({ success: false, message: 'KhÃ´ng Ä‘Æ°á»£c phÃ©p sá»­a ngÃ nh cá»§a dÃ²ng chÆ°Æ¡ng trÃ¬nh há»c' });
    }
    if (req.body.MaMonHoc !== undefined && normalizeText(req.body.MaMonHoc).toUpperCase() !== existing.MaMonHoc) {
      return res.status(400).json({ success: false, message: 'KhÃ´ng Ä‘Æ°á»£c phÃ©p sá»­a mÃ´n há»c cá»§a dÃ²ng chÆ°Æ¡ng trÃ¬nh há»c' });
    }
    const validated = await validateCurriculumPlacement({
      MaNganh: existing.MaNganh,
      MaMonHoc: existing.MaMonHoc,
      HocKyDuKien: req.body.HocKyDuKien ?? existing.HocKyDuKien,
      TrangThai: req.body.TrangThai ?? existing.TrangThai,
      GhiChu: req.body.GhiChu ?? existing.GhiChu
    }, id);
    if (validated.error) return res.status(400).json({ success: false, message: validated.error, violations: validated.violations || [] });
    const d = validated.data;
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE "CHUONGTRINHHOC" SET "HocKy"=$1, "HocKyDuKien"=$2, "TrangThai"=$3, "GhiChu"=$4 WHERE "id"=$5 RETURNING *`,
      d.HocKyDuKien, d.HocKyDuKien, d.TrangThai ?? true, d.GhiChu || null, id
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
