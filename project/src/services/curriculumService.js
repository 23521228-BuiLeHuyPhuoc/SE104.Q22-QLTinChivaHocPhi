const prisma = require('../config/database');

const ACTIVE_REGISTRATION_STATUS = '\u0110\u00e3 \u0111\u0103ng k\u00fd';
const THESIS_COURSE_CODES = String(process.env.THESIS_COURSE_CODES || '').split(',').map((item) => item.trim()).filter(Boolean);
const THESIS_COURSE_KEYWORDS = String(process.env.THESIS_COURSE_KEYWORDS || 'khoa luan,tot nghiep').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
const DEFAULT_THESIS_DEBT_LIMIT = Number(process.env.THESIS_DEBT_LIMIT || 8);

const toBool = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === '1' || value === 1;
};

const toInt = (value, fallback = 1) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const includeCurriculumCourse = {
  MONHOC: {
    include: {
      KHOA: true,
      DIEUKIENMONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC: {
        where: { DaXoa: false, TrangThai: true },
        include: {
          MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC: {
            select: { MaMonHoc: true, TenMonHoc: true, LoaiMon: true, SoTinChi: true }
          }
        }
      }
    }
  },
  NGANHHOC: { include: { KHOA: true } }
};

const conditionPayload = (condition) => ({
  MaMonDieuKien: condition.MaMonDieuKien,
  LoaiDieuKien: condition.LoaiDieuKien,
  TenMonDieuKien: condition.MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC?.TenMonHoc || condition.MaMonDieuKien
});

const buildCurriculumRow = (row, semesterMap) => {
  const conditions = row.MONHOC?.DIEUKIENMONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC || [];
  const violations = conditions.map((condition) => {
    const requiredSemester = semesterMap.get(condition.MaMonDieuKien);
    if (!requiredSemester) {
      return {
        ...conditionPayload(condition),
        valid: false,
        message: 'Mon dieu kien chua co trong chuong trinh'
      };
    }
    const currentSemester = Number(row.HocKyDuKien || 1);
    const valid = condition.LoaiDieuKien === 'tien_quyet'
      ? requiredSemester < currentSemester
      : requiredSemester <= currentSemester;
    return {
      ...conditionPayload(condition),
      HocKyDieuKien: requiredSemester,
      valid,
      message: valid ? '' : 'Học kỳ dự kiến vi phạm điều kiện'
    };
  }).filter((item) => !item.valid);

  return {
    id: row.id,
    MaNganh: row.MaNganh,
    TenNganh: row.NGANHHOC?.TenNganh,
    MaKhoa: row.NGANHHOC?.MaKhoa || row.MONHOC?.MaKhoa,
    TenKhoa: row.NGANHHOC?.KHOA?.TenKhoa || row.MONHOC?.KHOA?.TenKhoa,
    MaMonHoc: row.MaMonHoc,
    TenMonHoc: row.MONHOC?.TenMonHoc,
    LoaiMon: row.MONHOC?.LoaiMon,
    SoTinChi: Number(row.MONHOC?.SoTinChi || 0),
    HocKyDuKien: row.HocKyDuKien,
    BatBuoc: row.BatBuoc !== false,
    TrangThai: row.TrangThai !== false,
    GhiChu: row.GhiChu,
    conditions: conditions.map(conditionPayload),
    violations,
    isValid: violations.length === 0
  };
};

const getCurriculumRows = async (query = {}) => {
  const { MaNganh, MaKhoa, HocKyDuKien, LoaiMon, valid, search } = query;
  const where = {
    MONHOC: { DaXoa: false },
    NGANHHOC: { DaXoa: false }
  };
  if (MaNganh) where.MaNganh = MaNganh;
  if (HocKyDuKien) where.HocKyDuKien = toInt(HocKyDuKien);
  if (MaKhoa) where.NGANHHOC.MaKhoa = MaKhoa;
  if (LoaiMon) where.MONHOC.LoaiMon = LoaiMon;
  if (search) {
    where.OR = [
      { MaMonHoc: { contains: search, mode: 'insensitive' } },
      { MONHOC: { TenMonHoc: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const rows = await prisma.CHUONGTRINHHOC.findMany({
    where,
    include: includeCurriculumCourse,
    orderBy: [{ MaNganh: 'asc' }, { HocKyDuKien: 'asc' }, { MaMonHoc: 'asc' }]
  });
  const semesterMap = new Map(rows.map((row) => [row.MaMonHoc, Number(row.HocKyDuKien || 1)]));
  const data = rows.map((row) => buildCurriculumRow(row, semesterMap));
  if (valid === 'true') return data.filter((row) => row.isValid);
  if (valid === 'false') return data.filter((row) => !row.isValid);
  return data;
};

const validateCurriculumPlacement = async (payload, currentId = null) => {
  const MaNganh = normalizeCode(payload.MaNganh);
  const MaMonHoc = normalizeCode(payload.MaMonHoc);
  const HocKyDuKien = toInt(payload.HocKyDuKien, 1);
  if (!MaNganh || !MaMonHoc) return { error: 'Vui lòng chọn ngành và môn học' };
  if (HocKyDuKien < 1) return { error: 'Học kỳ dự kiến không hợp lệ' };

  const [major, course, duplicate, curriculumRows, conditions] = await Promise.all([
    prisma.NGANHHOC.findFirst({ where: { MaNganh, DaXoa: false }, select: { MaNganh: true } }),
    prisma.MONHOC.findFirst({ where: { MaMonHoc, DaXoa: false }, select: { MaMonHoc: true } }),
    prisma.CHUONGTRINHHOC.findFirst({
      where: { MaNganh, MaMonHoc, ...(currentId ? { NOT: { id: currentId } } : {}) }
    }),
    prisma.CHUONGTRINHHOC.findMany({
      where: { MaNganh, TrangThai: true, ...(currentId ? { NOT: { id: currentId } } : {}) },
      select: { MaMonHoc: true, HocKyDuKien: true }
    }),
    prisma.DIEUKIENMONHOC.findMany({
      where: { MaMonHoc, DaXoa: false, TrangThai: true },
      select: { MaMonDieuKien: true, LoaiDieuKien: true }
    })
  ]);

  if (!major) return { error: 'Ngành học không tồn tại' };
  if (!course) return { error: 'Môn học không tồn tại' };
  if (duplicate) return { error: 'Môn học đã có trong chương trình này' };

  const semesterMap = new Map(curriculumRows.map((row) => [row.MaMonHoc, Number(row.HocKyDuKien || 1)]));
  const violations = conditions.map((condition) => {
    const requiredSemester = semesterMap.get(condition.MaMonDieuKien);
    if (!requiredSemester) return null;
    const valid = condition.LoaiDieuKien === 'tien_quyet'
      ? requiredSemester < HocKyDuKien
      : requiredSemester <= HocKyDuKien;
    return valid ? null : {
      MaMonDieuKien: condition.MaMonDieuKien,
      LoaiDieuKien: condition.LoaiDieuKien,
      HocKyDieuKien: requiredSemester,
      HocKyMonHoc: HocKyDuKien
    };
  }).filter(Boolean);

  if (violations.length) return { error: 'Môn học vi phạm ràng buộc học kỳ', violations };
  return {
    data: {
      MaNganh,
      MaMonHoc,
      HocKy: HocKyDuKien,
      HocKyDuKien,
      BatBuoc: toBool(payload.BatBuoc, true),
      TrangThai: toBool(payload.TrangThai, true),
      GhiChu: payload.GhiChu ? String(payload.GhiChu).trim() : null
    }
  };
};

const parseSemesterIndex = async (MaHocKy) => {
  if (!MaHocKy) return 99;
  const semester = await prisma.HOCKY.findFirst({ where: { MaHocKy }, select: { ThuTu: true, MaHocKy: true } });
  if (semester?.ThuTu) return Number(semester.ThuTu);
  const digits = String(MaHocKy).match(/(\d+)$/);
  return digits ? Number(digits[1]) : 99;
};

const calculateCurriculumDebt = async (MaSv, MaHocKy) => {
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaSv, DaXoa: false },
    include: { NGANHHOC: true }
  });
  if (!student) return null;

  const maxSemester = await parseSemesterIndex(MaHocKy);
  const [curriculum, passedRows] = await Promise.all([
    prisma.CHUONGTRINHHOC.findMany({
      where: {
        MaNganh: student.MaNganh,
        TrangThai: true,
        HocKyDuKien: { lte: maxSemester },
        MONHOC: { DaXoa: false, TrangThai: true }
      },
      include: { MONHOC: { include: { KHOA: true } } },
      orderBy: [{ HocKyDuKien: 'asc' }, { MaMonHoc: 'asc' }]
    }),
    prisma.MONDAHOC.findMany({
      where: { MaSv, DaXoa: false, KetQua: 'qua_mon' },
      select: { MaMonHoc: true }
    })
  ]);

  const passedSet = new Set(passedRows.map((row) => row.MaMonHoc));

  // Tách môn bắt buộc và tự chọn
  const mandatoryCourses = curriculum.filter((row) => row.BatBuoc !== false);
  const electiveCourses = curriculum.filter((row) => row.BatBuoc === false);

  // Nợ môn bắt buộc: các môn bắt buộc chưa qua
  const missingMandatory = mandatoryCourses.filter((row) => !passedSet.has(row.MaMonHoc)).map((row) => ({
    MaMonHoc: row.MaMonHoc,
    TenMonHoc: row.MONHOC?.TenMonHoc,
    SoTinChi: Number(row.MONHOC?.SoTinChi || 0),
    HocKyDuKien: row.HocKyDuKien,
    BatBuoc: true
  }));
  const mandatoryDebtCredits = missingMandatory.reduce((sum, row) => sum + Number(row.SoTinChi || 0), 0);

  // Tính nợ tín chỉ tự chọn
  const totalMandatoryCredits = mandatoryCourses.reduce((sum, row) => sum + Number(row.MONHOC?.SoTinChi || 0), 0);
  const soTinChiToiThieu = Number(student.NGANHHOC?.SoTinChiToiThieu || 0);
  const requiredElectiveCredits = Math.max(0, soTinChiToiThieu - totalMandatoryCredits);
  const earnedElectiveCredits = electiveCourses
    .filter((row) => passedSet.has(row.MaMonHoc))
    .reduce((sum, row) => sum + Number(row.MONHOC?.SoTinChi || 0), 0);
  const electiveDebtCredits = Math.max(0, requiredElectiveCredits - earnedElectiveCredits);

  // Tổng nợ = nợ bắt buộc + nợ tự chọn
  const debtCredits = mandatoryDebtCredits + electiveDebtCredits;

  // Danh sách môn thiếu: gồm môn bắt buộc chưa qua + thông tin thiếu tín chỉ tự chọn
  const missingCourses = [...missingMandatory];
  if (electiveDebtCredits > 0) {
    missingCourses.push({
      MaMonHoc: '_TU_CHON_',
      TenMonHoc: `Thiếu ${electiveDebtCredits} tín chỉ tự chọn`,
      SoTinChi: electiveDebtCredits,
      HocKyDuKien: null,
      BatBuoc: false
    });
  }

  return {
    student: {
      MaSv: student.MaSv,
      HoTen: student.HoTen,
      MaNganh: student.MaNganh,
      TenNganh: student.NGANHHOC?.TenNganh
    },
    MaHocKy,
    maxSemester,
    totalCreditsDue: curriculum.reduce((sum, row) => sum + Number(row.MONHOC?.SoTinChi || 0), 0),
    debtCredits,
    mandatoryDebtCredits,
    electiveDebtCredits,
    requiredElectiveCredits,
    earnedElectiveCredits,
    missingCourses
  };
};

const isThesisCourse = (course) => {
  if (!course) return false;
  if (THESIS_COURSE_CODES.includes(course.MaMonHoc)) return true;
  const name = String(course.TenMonHoc || '').toLowerCase();
  return THESIS_COURSE_KEYWORDS.some((keyword) => name.includes(keyword));
};

const normalizeThesisDebtLimit = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_THESIS_DEBT_LIMIT;
};

const getThesisEligibility = async (MaSv, MaHocKy) => {
  const debt = await calculateCurriculumDebt(MaSv, MaHocKy);
  if (!debt) return null;
  const [thesisCourses, settings] = await Promise.all([
    prisma.CHUONGTRINHHOC.findMany({
      where: { MaNganh: debt.student.MaNganh, TrangThai: true, MONHOC: { DaXoa: false } },
      include: { MONHOC: true }
    }),
    prisma.THAMSO.findFirst({ select: { GioiHanTinChiNoKhoaLuan: true } })
  ]);
  const debtLimit = normalizeThesisDebtLimit(settings?.GioiHanTinChiNoKhoaLuan);
  return {
    ...debt,
    debtLimit,
    eligible: debt.debtCredits <= debtLimit,
    thesisCourses: thesisCourses.filter((row) => isThesisCourse(row.MONHOC)).map((row) => ({
      MaMonHoc: row.MaMonHoc,
      TenMonHoc: row.MONHOC?.TenMonHoc,
      HocKyDuKien: row.HocKyDuKien
    }))
  };
};

const getStudentIdFromRequest = async (req) => {
  if (req.user?.MaSv) return req.user.MaSv;
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaTaiKhoan: Number(req.user?.MaTaiKhoan || req.user?.id || 0), DaXoa: false },
    select: { MaSv: true }
  });
  return student?.MaSv || null;
};

module.exports = {
  ACTIVE_REGISTRATION_STATUS,
  getCurriculumRows,
  validateCurriculumPlacement,
  calculateCurriculumDebt,
  getThesisEligibility,
  getStudentIdFromRequest,
  toBool,
  toInt
};
