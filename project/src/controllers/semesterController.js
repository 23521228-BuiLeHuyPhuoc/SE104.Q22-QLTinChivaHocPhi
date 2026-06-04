const prisma = require('../config/database');
const { getPaginationMeta } = require('../utils/pagination');
const { filterRowsByRegex, paginateRows } = require('../utils/searchRegex');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const {
  getRegistrationWindowState,
  getAppealWindowState,
  getSemesterWorkflowState,
  assertCanFinalizeRegistration,
  assertCanOpenTuitionPayment
} = require('../utils/registrationWindow');
const { getTuitionPaymentWindowState } = require('../utils/paymentRules');
const { recalculateRegistrationTotals } = require('./registrationController');
const { REGISTRATION_STATUS, APPEAL_STATUS, SEMESTER_STATUS } = require('../utils/businessConstants');

const ACTIVE_REGISTRATION_STATUS = REGISTRATION_STATUS.ACTIVE;
const CANCELLED_REGISTRATION_STATUS = REGISTRATION_STATUS.CANCELLED;
const ONGOING_SEMESTER_STATUS = SEMESTER_STATUS.ONGOING;
const MIN_OPEN_CLASS_RATIO = 0.75;
const FINALIZE_CANCEL_REASON = 'Hủy do không đủ sinh viên đăng ký';
const VISIBLE_SEMESTER_WHERE = { DaXoa: false, NOT: { MaHocKy: { startsWith: 'HK-DEMO-' } } };

const getSemesterKindLabel = (hk) => {
  const order = Number(hk?.ThuTu || 1);
  const type = String(hk?.LoaiHocKy || '').toLowerCase();
  if (order === 3 || type.startsWith('h')) return 'Học kỳ Hè';
  if (order === 2) return 'Học kỳ II';
  return 'Học kỳ I';
};

const getSemesterDisplayLabel = (hk) => {
  const yearName = hk?.NAMHOC?.TenNamHoc || hk?.MaNamHoc || '';
  return `${getSemesterKindLabel(hk)}${yearName ? ` - ${yearName}` : ''}`;
};

const getUtcDayStart = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const isCurrentSemester = (hk, now = new Date()) => {
  if (hk?.TrangThai === ONGOING_SEMESTER_STATUS) return true;
  const start = hk?.NgayBatDau ? getUtcDayStart(hk.NgayBatDau) : null;
  const end = hk?.NgayKetThuc ? getUtcDayStart(hk.NgayKetThuc) : null;
  const current = getUtcDayStart(now);
  if (start === null || end === null || current === null) return false;
  return current >= start && current <= end;
};

const semesterSelect = (hk) => {
  const pendingAppeals = hk.SoDonCuuXetChoDuyet ?? hk._count?.DONCUUXETDANGKY ?? 0;
  const registrationWindow = getRegistrationWindowState(hk);
  const appealWindow = getAppealWindowState(hk);
  const tuitionPaymentWindow = getTuitionPaymentWindowState(hk);
  const workflow = getSemesterWorkflowState(hk, { pendingAppeals });

  return {
    MaHocKy: hk.MaHocKy,
    TenHocKy: hk.TenHocKy,
    HocKyLabel: getSemesterKindLabel(hk),
    DisplayLabel: getSemesterDisplayLabel(hk),
    MaNamHoc: hk.MaNamHoc,
    TenNamHoc: hk.NAMHOC?.TenNamHoc,
    NAMHOC: hk.NAMHOC ? {
      MaNamHoc: hk.NAMHOC.MaNamHoc,
      TenNamHoc: hk.NAMHOC.TenNamHoc,
      NamBatDau: hk.NAMHOC.NamBatDau,
      NamKetThuc: hk.NAMHOC.NamKetThuc
    } : undefined,
    LoaiHocKy: hk.LoaiHocKy,
    ThuTu: hk.ThuTu,
    NgayBatDau: hk.NgayBatDau,
    NgayKetThuc: hk.NgayKetThuc,
    NgayBatDauDangKy: hk.NgayBatDauDangKy,
    NgayKetThucDangKy: hk.NgayKetThucDangKy,
    NgayBatDauCuuXet: hk.NgayBatDauCuuXet,
    NgayKetThucCuuXet: hk.NgayKetThucCuuXet,
    NgayChotDangKy: hk.NgayChotDangKy,
    MoThuHocPhi: hk.MoThuHocPhi,
    NgayMoThuHocPhi: hk.NgayMoThuHocPhi,
    NgayBatDauDongHocPhi: hk.NgayBatDauDongHocPhi,
    HanDongHocPhi: hk.HanDongHocPhi,
    TrangThai: hk.TrangThai,
    NgayCapNhat: hk.NgayCapNhat,
    NguoiCapNhat: hk.NguoiCapNhat,
    NguoiCapNhatTen: hk.NguoiCapNhatTen,
    SoLopMo: hk.SoLopMo ?? hk._count?.LOPMO ?? 0,
    SoSinhVienDangKy: hk.SoSinhVienDangKy ?? hk._count?.PHIEUDANGKY ?? 0,
    SoDonCuuXetChoDuyet: pendingAppeals,
    RegistrationWindow: registrationWindow,
    AppealWindow: appealWindow,
    TuitionPaymentWindow: tuitionPaymentWindow,
    Workflow: workflow,
    isCurrent: isCurrentSemester(hk),
    CoTheDangKy: registrationWindow.isOpen,
    CoTheCuuXet: appealWindow.isOpen,
    LyDoKhongTheDangKy: registrationWindow.message
  };
};

const registrationSemesterSelect = (semester) => semesterSelect(semester);

const academicYearSelect = (year) => ({
  MaNamHoc: year.MaNamHoc,
  TenNamHoc: year.TenNamHoc,
  NamBatDau: year.NamBatDau,
  NamKetThuc: year.NamKetThuc,
  TrangThai: year.TrangThai,
  NguoiCapNhat: year.NguoiCapNhat,
  NguoiCapNhatTen: year.NguoiCapNhatTen,
  NgayCapNhat: year.NgayCapNhat
});

const parseAcademicYearCode = (value) => {
  const code = String(value || '').trim();
  const match = code.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  return {
    code: `${start}-${end}`,
    start,
    end
  };
};

const parseAcademicYearStatus = (value) => (
  value === undefined ? true : value === true || value === 'true' || value === 1 || value === '1'
);

const SEMESTER_DEFAULT_PAGE_SIZE = 15;
const SEMESTER_PAGE_SIZES = new Set([5, 10, 15]);
const SEMESTER_DATE_FIELDS = new Set([
  'NgayBatDau',
  'NgayKetThuc',
  'NgayBatDauDangKy',
  'NgayKetThucDangKy',
  'NgayBatDauCuuXet',
  'NgayKetThucCuuXet',
  'NgayChotDangKy',
  'NgayMoThuHocPhi',
  'NgayBatDauDongHocPhi',
  'HanDongHocPhi'
]);

const toPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getSemesterPagination = (query = {}) => {
  const limitCandidate = toPositiveInt(query.limit, SEMESTER_DEFAULT_PAGE_SIZE);
  const limit = SEMESTER_PAGE_SIZES.has(limitCandidate) ? limitCandidate : SEMESTER_DEFAULT_PAGE_SIZE;
  const page = toPositiveInt(query.page, 1);
  return { page, limit, skip: (page - 1) * limit };
};

const makeSemesterDateError = (message) => {
  const error = new Error(message);
  error.status = 400;
  error.code = 'INVALID_SEMESTER_DATES';
  return error;
};

const STRICT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/;

const parseStrictDate = (value, label) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw makeSemesterDateError(`${label} không hợp lệ`);
    return value;
  }

  const raw = String(value).trim();
  const match = raw.match(STRICT_DATE_PATTERN);
  if (!match) throw makeSemesterDateError(`${label} phải đúng định dạng YYYY-MM-DD`);

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = match[4] === undefined ? 0 : parseInt(match[4], 10);
  const minute = match[5] === undefined ? 0 : parseInt(match[5], 10);
  const second = match[6] === undefined ? 0 : parseInt(match[6], 10);
  const millisecond = match[7] === undefined ? 0 : parseInt(match[7].padEnd(3, '0'), 10);

  if (year < 1000 || year > 9999 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    throw makeSemesterDateError(`${label} không hợp lệ`);
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second ||
    date.getUTCMilliseconds() !== millisecond
  ) {
    throw makeSemesterDateError(`${label} không tồn tại trong lịch`);
  }

  return date;
};

const isDateOnlyInput = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

const toEndOfUtcDay = (date) => {
  const end = new Date(date.getTime());
  end.setUTCHours(23, 59, 59, 999);
  return end;
};

const parseNullableDate = (value, label, options = {}) => {
  if (value === undefined || value === null || value === '') return null;
  const date = parseStrictDate(value, label);
  if (Number.isNaN(date.getTime())) throw makeSemesterDateError(`${label} không hợp lệ`);
  return options.endOfDayForDateOnly && isDateOnlyInput(value) ? toEndOfUtcDay(date) : date;
};

const toDateOnly = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const parseFilterDate = (value, label) => {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw makeSemesterDateError(`${label} phải đúng định dạng YYYY-MM-DD`);
  }
  return parseStrictDate(raw, label);
};

const addDaysUtc = (date, days) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const normalizeSemesterKind = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === '1' || raw === 'i' || raw === 'hk1') return '1';
  if (raw === '2' || raw === 'ii' || raw === 'hk2') return '2';
  if (raw === '3' || raw === 'he' || raw === 'hè' || raw === 'hkhe' || raw === 'hkh') return '3';
  return '';
};

const buildSemesterWhere = (query = {}) => {
  const where = { ...VISIBLE_SEMESTER_WHERE };
  const and = [];
  const q = String(query.q || query.search || '').trim();
  const searchScope = ['semesterCode', 'semesterName', 'academicYear'].includes(query.searchScope) ? query.searchScope : 'semesterCode';
  const semesterKind = normalizeSemesterKind(query.semesterKind || (query.searchField === 'HocKy' ? query.search : ''));
  const status = String(query.status || '').trim();
  const registrationFinalized = String(query.registrationFinalized || '').trim();
  const tuitionOpen = String(query.tuitionOpen || '').trim();
  const requestedDateField = SEMESTER_DATE_FIELDS.has(query.dateField) ? query.dateField : 'all';
  const legacyDateSearch = query.searchField && SEMESTER_DATE_FIELDS.has(query.searchField) ? query.search : '';
  const exactDate = parseFilterDate(query.dateExact || query.date || legacyDateSearch, 'Ngày chính xác');
  const dateFrom = exactDate || parseFilterDate(query.dateFrom, 'Từ ngày');
  const dateTo = exactDate || parseFilterDate(query.dateTo, 'Đến ngày');

  if (semesterKind) and.push({ ThuTu: parseInt(semesterKind, 10) });
  if (status) and.push({ TrangThai: status });
  if (registrationFinalized === 'finalized') and.push({ NgayChotDangKy: { not: null } });
  if (registrationFinalized === 'not_finalized') and.push({ NgayChotDangKy: null });
  if (tuitionOpen === 'open') and.push({ MoThuHocPhi: true });
  if (tuitionOpen === 'closed') and.push({ MoThuHocPhi: false });

  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range.gte = dateFrom;
    if (dateTo) range.lt = addDaysUtc(dateTo, 1);
    if (requestedDateField === 'all') {
      and.push({ OR: Array.from(SEMESTER_DATE_FIELDS).map((field) => ({ [field]: range })) });
    } else {
      and.push({ [requestedDateField]: range });
    }
  }

  if (and.length) where.AND = and;
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

const getSemesterPage = async (query = {}) => {
  const { page, limit } = getSemesterPagination(query);
  const where = buildSemesterWhere({ ...query, q: '', search: '' });
  const semesters = await prisma.HOCKY.findMany({
    where,
    include: {
      NAMHOC: true,
      _count: {
        select: {
          LOPMO: true,
          PHIEUDANGKY: true,
          DONCUUXETDANGKY: { where: { TrangThai: APPEAL_STATUS.PENDING } }
        }
      }
    },
    orderBy: [{ NAMHOC: { NamBatDau: 'desc' } }, { ThuTu: 'asc' }, { MaHocKy: 'asc' }]
  });

  const searchScope = ['semesterCode', 'semesterName', 'academicYear'].includes(query.searchScope) ? query.searchScope : 'semesterCode';
  const keyword = String(query.q || query.search || '').trim();
  const filtered = filterRowsByRegex(semesters, keyword, (row) => {
    const values = {
      semesterCode: [row.MaHocKy],
      semesterName: [row.TenHocKy],
      academicYear: [row.MaNamHoc, row.NAMHOC && row.NAMHOC.TenNamHoc]
    };
    return values[searchScope] || values.semesterCode;
  });
  const pageRows = paginateRows(filtered, page, limit);

  const withUpdaterNames = await attachUpdaterNames(pageRows);
  return {
    data: withUpdaterNames.map(semesterSelect),
    pagination: getPaginationMeta(filtered.length, page, limit)
  };
};

const validateSemesterDateRange = ({
  NgayBatDau,
  NgayKetThuc,
  NgayBatDauDangKy,
  NgayKetThucDangKy,
  NgayBatDauCuuXet,
  NgayKetThucCuuXet,
  NgayBatDauDongHocPhi,
  HanDongHocPhi
}) => {
  const start = NgayBatDau ? toDateOnly(NgayBatDau) : null;
  const end = NgayKetThuc ? toDateOnly(NgayKetThuc) : null;
  const registrationStart = NgayBatDauDangKy ? toDateOnly(NgayBatDauDangKy) : null;
  const registrationEnd = NgayKetThucDangKy ? toDateOnly(NgayKetThucDangKy) : null;
  const appealStart = NgayBatDauCuuXet ? toDateOnly(NgayBatDauCuuXet) : null;
  const appealEnd = NgayKetThucCuuXet ? toDateOnly(NgayKetThucCuuXet) : null;
  const tuitionStart = NgayBatDauDongHocPhi ? toDateOnly(NgayBatDauDongHocPhi) : null;
  const tuitionDue = HanDongHocPhi ? toDateOnly(HanDongHocPhi) : null;

  if (
    start === null ||
    end === null ||
    registrationStart === null ||
    registrationEnd === null ||
    appealStart === null ||
    appealEnd === null ||
    tuitionStart === null ||
    tuitionDue === null
  ) {
    throw makeSemesterDateError('Cần nhập đầy đủ thời gian học kỳ, đăng ký, cứu xét đăng ký và đóng học phí');
  }

  if ((start === null) !== (end === null)) {
    throw makeSemesterDateError('Cần nhập đủ ngày bắt đầu và ngày kết thúc học kỳ');
  }

  if ((registrationStart === null) !== (registrationEnd === null)) {
    throw makeSemesterDateError('Cần nhập đủ ngày bắt đầu và ngày kết thúc đăng ký');
  }

  if ((appealStart === null) !== (appealEnd === null)) {
    throw makeSemesterDateError('Cần nhập đủ ngày bắt đầu và ngày kết thúc cứu xét đăng ký');
  }

  if (start !== null && end !== null && start >= end) {
    throw makeSemesterDateError('Ngày bắt đầu học kỳ phải trước ngày kết thúc học kỳ');
  }

  if ((registrationStart !== null || registrationEnd !== null) && start === null) {
    throw makeSemesterDateError('Cần nhập ngày bắt đầu học kỳ trước khi nhập thời gian đăng ký');
  }

  if (registrationStart !== null && registrationEnd !== null && registrationStart >= registrationEnd) {
    throw makeSemesterDateError('Ngày bắt đầu đăng ký phải trước ngày kết thúc đăng ký');
  }

  if (start !== null && registrationStart !== null && registrationStart >= start) {
    throw makeSemesterDateError('Ngày bắt đầu đăng ký phải trước ngày bắt đầu học kỳ');
  }

  if (start !== null && registrationEnd !== null && registrationEnd >= start) {
    throw makeSemesterDateError('Ngày kết thúc đăng ký phải trước ngày bắt đầu học kỳ');
  }

  if ((appealStart !== null || appealEnd !== null) && registrationEnd === null) {
    throw makeSemesterDateError('Cần cấu hình hạn đăng ký trước khi nhập thời gian cứu xét');
  }

  if (appealStart !== null && appealEnd !== null && appealStart > appealEnd) {
    throw makeSemesterDateError('Ngày bắt đầu cứu xét phải trước hoặc bằng ngày kết thúc cứu xét');
  }

  if (registrationEnd !== null && appealStart !== null && appealStart <= registrationEnd) {
    throw makeSemesterDateError('Thời gian cứu xét phải bắt đầu sau khi kết thúc đăng ký');
  }

  if (start !== null && appealStart !== null && appealStart >= start) {
    throw makeSemesterDateError('Ngày bắt đầu cứu xét phải trước ngày bắt đầu học kỳ');
  }

  if (start !== null && appealEnd !== null && appealEnd >= start) {
    throw makeSemesterDateError('Ngày kết thúc cứu xét phải trước ngày bắt đầu học kỳ');
  }

  if (tuitionStart !== null && appealEnd === null) {
    throw makeSemesterDateError('Cần nhập ngày kết thúc cứu xét trước khi nhập ngày bắt đầu đóng học phí');
  }

  if (tuitionStart !== null && appealEnd !== null && tuitionStart <= appealEnd) {
    throw makeSemesterDateError('Ngày bắt đầu đóng học phí phải sau ngày kết thúc cứu xét');
  }

  if (tuitionStart !== null && tuitionDue !== null && tuitionStart > tuitionDue) {
    throw makeSemesterDateError('Ngày bắt đầu đóng học phí phải trước hoặc bằng hạn đóng học phí');
  }

  if (tuitionDue !== null && end !== null && tuitionDue >= end) {
    throw makeSemesterDateError('Hạn đóng học phí phải trước ngày kết thúc học kỳ');
  }
};

const ensureSingleOngoingSemester = async (MaHocKy) => {
  const ongoing = await prisma.HOCKY.findFirst({
    where: {
      DaXoa: false,
      TrangThai: 'Đang diễn ra',
      MaHocKy: { not: MaHocKy }
    },
    select: { MaHocKy: true, TenHocKy: true }
  });

  if (ongoing) {
    const error = new Error(`Chỉ được có một học kỳ đang diễn ra. Học kỳ ${ongoing.MaHocKy} - ${ongoing.TenHocKy} đang diễn ra.`);
    error.status = 400;
    error.code = 'ONE_ACTIVE_SEMESTER';
    throw error;
  }
};

const getAllSemesters = async (req, res) => {
  try {
    const result = await getSemesterPage(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get all semesters error:');
  }
};

const getRegistrationOptions = async (req, res) => {
  try {
    const semesters = await prisma.HOCKY.findMany({
      where: {
        ...VISIBLE_SEMESTER_WHERE,
        NgayBatDauDangKy: { not: null },
        NgayKetThucDangKy: { not: null }
      },
      take: 8,
      orderBy: [{ NgayBatDau: { sort: 'desc', nulls: 'last' } }, { MaHocKy: 'desc' }],
      include: {
        NAMHOC: true,
        _count: { select: { DONCUUXETDANGKY: { where: { TrangThai: APPEAL_STATUS.PENDING } } } }
      }
    });

    res.json({ success: true, data: semesters.map(registrationSemesterSelect) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get registration options error:');
  }
};

const getActiveSemester = async (req, res) => {
  try {
    let hk = await prisma.HOCKY.findFirst({ where: { ...VISIBLE_SEMESTER_WHERE, OR: [{ TrangThai: 'Đang diễn ra' }, { TrangThai: 'Đang hoạt động' }] }, include: { NAMHOC: true } });
    if (!hk) hk = await prisma.HOCKY.findFirst({ where: { ...VISIBLE_SEMESTER_WHERE, OR: [{ TrangThai: 'Sắp diễn ra' }, { TrangThai: 'Sắp tới' }] }, include: { NAMHOC: true }, orderBy: { NgayBatDau: 'asc' } });
    if (!hk) return res.status(404).json({ success: false, message: 'Không có học kỳ nào đang hoạt động' });
    res.json({ success: true, data: semesterSelect(hk) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get active semester error:');
  }
};

const getSemesterById = async (req, res) => {
  try {
    const hk = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false }, include: { NAMHOC: true, LOPMO: true, PHIEUDANGKY: true } });
    if (!hk) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    res.json({ success: true, data: { ...semesterSelect(hk), stats: { openedClasses: hk.LOPMO.length, registrations: hk.PHIEUDANGKY.length } } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get semester by ID error:');
  }
};

const finalizeRegistration = async (req, res) => {
  try {
    const maHocKy = req.params.id;
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL app.finalize_registration = '1'");
      const semester = await tx.HOCKY.findFirst({
        where: { MaHocKy: maHocKy, DaXoa: false }
      });
      if (!semester) throw { status: 404, message: 'Không tìm thấy học kỳ' };
      const pendingAppeals = await tx.DONCUUXETDANGKY.count({
        where: { MaHocKy: maHocKy, TrangThai: APPEAL_STATUS.PENDING }
      });
      assertCanFinalizeRegistration(semester, { pendingAppeals });

      const otherOngoing = await tx.HOCKY.findFirst({
        where: {
          DaXoa: false,
          TrangThai: ONGOING_SEMESTER_STATUS,
          MaHocKy: { not: maHocKy }
        },
        select: { MaHocKy: true, TenHocKy: true }
      });
      if (otherOngoing) {
        throw {
          status: 400,
          message: `Chỉ được có một học kỳ đang diễn ra. Học kỳ ${otherOngoing.MaHocKy} - ${otherOngoing.TenHocKy} đang diễn ra.`
        };
      }

      const openedClasses = await tx.LOPMO.findMany({
        where: { MaHocKy: maHocKy, LOP: { DaXoa: false } },
        include: {
          LOP: {
            select: {
              MaLop: true,
              TenLop: true,
              SoLuongToiDa: true
            }
          }
        }
      });

      const countRows = await tx.CHITIETDANGKY.groupBy({
        by: ['MaLop'],
        where: {
          TrangThai: ACTIVE_REGISTRATION_STATUS,
          PHIEUDANGKY: { MaHocKy: maHocKy }
        },
        _count: { _all: true }
      });
      const registrationCountByClass = new Map(countRows.map((row) => [row.MaLop, row._count._all]));

      const classSummaries = openedClasses.map((openedClass) => {
        const capacity = Math.max(0, Number(openedClass.LOP?.SoLuongToiDa || 0));
        const threshold = capacity * MIN_OPEN_CLASS_RATIO;
        const registeredCount = registrationCountByClass.get(openedClass.MaLop) || 0;
        const willOpen = capacity > 0 && (registeredCount / capacity) >= MIN_OPEN_CLASS_RATIO;

        return {
          id: openedClass.id,
          MaLop: openedClass.MaLop,
          TenLop: openedClass.LOP?.TenLop || null,
          SoLuongToiDa: capacity,
          SoLuongDaDangKy: registeredCount,
          NguongMoLop: Math.ceil(threshold),
          TrangThaiSauChot: willOpen
        };
      });

      const openedAfterFinalize = classSummaries.filter((item) => item.TrangThaiSauChot);
      const closedAfterFinalize = classSummaries.filter((item) => !item.TrangThaiSauChot);
      const openedClassIds = openedAfterFinalize.map((item) => item.id);
      const closedClassIds = closedAfterFinalize.map((item) => item.id);
      const closedClassCodes = closedAfterFinalize.map((item) => item.MaLop);

      const affectedRegistrations = closedClassCodes.length
        ? await tx.PHIEUDANGKY.findMany({
          where: {
            MaHocKy: maHocKy,
            CHITIETDANGKY: {
              some: {
                MaLop: { in: closedClassCodes },
                TrangThai: ACTIVE_REGISTRATION_STATUS
              }
            }
          },
          select: { SoPhieu: true }
        })
        : [];

      const cancelled = closedClassCodes.length
        ? await tx.CHITIETDANGKY.updateMany({
          where: {
            MaLop: { in: closedClassCodes },
            TrangThai: ACTIVE_REGISTRATION_STATUS,
            PHIEUDANGKY: { MaHocKy: maHocKy }
          },
          data: {
            TrangThai: CANCELLED_REGISTRATION_STATUS,
            NgayHuy: new Date(),
            LyDoHuy: FINALIZE_CANCEL_REASON
          }
        })
        : { count: 0 };

      if (openedClassIds.length) {
        await tx.LOPMO.updateMany({
          where: { id: { in: openedClassIds } },
          data: { TrangThai: true }
        });
      }

      if (closedClassIds.length) {
        await tx.LICHHOCLOP.updateMany({
          where: { LopMoId: { in: closedClassIds }, TrangThai: true },
          data: { TrangThai: false }
        });
        await tx.LOPMO.updateMany({
          where: { id: { in: closedClassIds } },
          data: { TrangThai: false, SoLuongDaDangKy: 0 }
        });
      }

      if (openedClasses.length) {
        await tx.$executeRaw`
          UPDATE "LOPMO" AS lm
          SET "SoLuongDaDangKy" = COALESCE(counts."SoLuongDaDangKy", 0)
          FROM (
            SELECT lm_inner.id, COUNT(ctdk.id)::INTEGER AS "SoLuongDaDangKy"
            FROM "LOPMO" AS lm_inner
            LEFT JOIN "PHIEUDANGKY" AS pdk
              ON pdk."MaHocKy" = lm_inner."MaHocKy"
            LEFT JOIN "CHITIETDANGKY" AS ctdk
              ON ctdk."SoPhieu" = pdk."SoPhieu"
             AND ctdk."MaLop" = lm_inner."MaLop"
             AND ctdk."TrangThai" = ${ACTIVE_REGISTRATION_STATUS}
            WHERE lm_inner."MaHocKy" = ${maHocKy}
            GROUP BY lm_inner.id
          ) AS counts
          WHERE lm.id = counts.id
            AND lm."MaHocKy" = ${maHocKy}
        `;
      }

      for (const registration of affectedRegistrations) {
        await recalculateRegistrationTotals(tx, registration.SoPhieu);
      }

      const finalizedAt = new Date();
      await tx.HOCKY.update({
        where: { MaHocKy: maHocKy },
        data: {
          TrangThai: ONGOING_SEMESTER_STATUS,
          NgayChotDangKy: finalizedAt,
          MoThuHocPhi: true,
          NgayMoThuHocPhi: finalizedAt,
          ...updateAudit(req)
        }
      });

      return {
        MaHocKy: maHocKy,
        TiLeMoLopToiThieu: MIN_OPEN_CLASS_RATIO,
        SoLopDatNguong: openedAfterFinalize.length,
        SoLopBiDong: closedAfterFinalize.length,
        SoDangKyBiHuy: cancelled.count,
        MoThuHocPhi: true,
        NgayMoThuHocPhi: finalizedAt,
        classes: classSummaries
      };
    }, { timeout: 30000, maxWait: 10000 });

    res.json({
      success: true,
      message: 'Chốt đăng ký học phần thành công. Học kỳ đã sẵn sàng lập phiếu thu; sinh viên chỉ thanh toán sau khi admin tạo phiếu thu.',
      data: result
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message, code: error.code });
        return sendErrorResponse(res, error, 'Không thể chốt đăng ký học phần', 'Finalize registration error:');
  }
};

const openTuitionPayment = async (req, res) => {
  try {
    const maHocKy = req.params.id;
    const result = await prisma.$transaction(async (tx) => {
      const semester = await tx.HOCKY.findFirst({ where: { MaHocKy: maHocKy, DaXoa: false } });
      if (!semester) throw { status: 404, message: 'Không tìm thấy học kỳ' };
      const pendingAppeals = await tx.DONCUUXETDANGKY.count({
        where: { MaHocKy: maHocKy, TrangThai: APPEAL_STATUS.PENDING }
      });
      assertCanOpenTuitionPayment(semester, { pendingAppeals });

      return tx.HOCKY.update({
        where: { MaHocKy: maHocKy },
        data: {
          MoThuHocPhi: true,
          NgayMoThuHocPhi: new Date(),
          ...updateAudit(req)
        }
      });
    });
    res.json({ success: true, message: 'Đã mở thu học phí cho học kỳ', data: semesterSelect(result) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message, code: error.code });
    return sendErrorResponse(res, error, 'Không thể mở thu học phí', 'Open tuition payment error:');
  }
};

const closeTuitionPayment = async (req, res) => {
  try {
    const maHocKy = req.params.id;
    const semester = await prisma.HOCKY.findFirst({ where: { MaHocKy: maHocKy, DaXoa: false } });
    if (!semester) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });

    const updated = await prisma.HOCKY.update({
      where: { MaHocKy: maHocKy },
      data: {
        MoThuHocPhi: false,
        ...updateAudit(req)
      }
    });
    res.json({ success: true, message: 'Đã khóa thu học phí cho học kỳ', data: semesterSelect(updated) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Không thể khóa thu học phí', 'Close tuition payment error:');
  }
};

const createSemester = async (req, res) => {
  try {
    const {
      MaHocKy,
      TenHocKy,
      MaNamHoc,
      LoaiHocKy,
      ThuTu,
      NgayBatDau,
      NgayKetThuc,
      NgayBatDauDangKy,
      NgayKetThucDangKy,
      NgayBatDauCuuXet,
      NgayKetThucCuuXet,
      NgayBatDauDongHocPhi,
      HanDongHocPhi,
      TrangThai
    } = req.body;
    if (!MaHocKy || !TenHocKy || !MaNamHoc) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    const existing = await prisma.HOCKY.findUnique({ where: { MaHocKy } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã học kỳ đã tồn tại' });
    if (TrangThai === 'Đang diễn ra') await ensureSingleOngoingSemester(MaHocKy);
    const dates = {
      NgayBatDau: parseNullableDate(NgayBatDau, 'Ngày bắt đầu học kỳ'),
      NgayKetThuc: parseNullableDate(NgayKetThuc, 'Ngày kết thúc học kỳ'),
      NgayBatDauDangKy: parseNullableDate(NgayBatDauDangKy, 'Ngày bắt đầu đăng ký'),
      NgayKetThucDangKy: parseNullableDate(NgayKetThucDangKy, 'Ngày kết thúc đăng ký', { endOfDayForDateOnly: true }),
      NgayBatDauCuuXet: parseNullableDate(NgayBatDauCuuXet, 'Ngày bắt đầu cứu xét'),
      NgayKetThucCuuXet: parseNullableDate(NgayKetThucCuuXet, 'Ngày kết thúc cứu xét', { endOfDayForDateOnly: true }),
      NgayBatDauDongHocPhi: parseNullableDate(NgayBatDauDongHocPhi, 'Ngày bắt đầu đóng học phí'),
      HanDongHocPhi: parseNullableDate(HanDongHocPhi, 'Hạn đóng học phí')
    };
    validateSemesterDateRange(dates);
    const semester = await prisma.HOCKY.create({
      data: {
        MaHocKy,
        TenHocKy,
        MaNamHoc,
        LoaiHocKy,
        ThuTu: ThuTu ? parseInt(ThuTu, 10) : 1,
        NgayBatDau: dates.NgayBatDau,
        NgayKetThuc: dates.NgayKetThuc,
        NgayBatDauDangKy: dates.NgayBatDauDangKy,
        NgayKetThucDangKy: dates.NgayKetThucDangKy,
        NgayBatDauCuuXet: dates.NgayBatDauCuuXet,
        NgayKetThucCuuXet: dates.NgayKetThucCuuXet,
        NgayBatDauDongHocPhi: dates.NgayBatDauDongHocPhi,
        HanDongHocPhi: dates.HanDongHocPhi,
        TrangThai: TrangThai || 'Sắp diễn ra',
        ...updateAudit(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tạo học kỳ thành công', data: semester });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Create semester error:');
  }
};

const updateSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    const {
      TenHocKy,
      MaNamHoc,
      LoaiHocKy,
      ThuTu,
      NgayBatDau,
      NgayKetThuc,
      NgayBatDauDangKy,
      NgayKetThucDangKy,
      NgayBatDauCuuXet,
      NgayKetThucCuuXet,
      NgayBatDauDongHocPhi,
      HanDongHocPhi,
      TrangThai
    } = req.body;
    const data = {};
    if (TenHocKy) data.TenHocKy = TenHocKy;
    if (MaNamHoc) data.MaNamHoc = MaNamHoc;
    if (LoaiHocKy) data.LoaiHocKy = LoaiHocKy;
    if (ThuTu !== undefined) data.ThuTu = parseInt(ThuTu, 10);
    if (TrangThai) {
      if (TrangThai === 'Đang diễn ra') await ensureSingleOngoingSemester(req.params.id);
      data.TrangThai = TrangThai;
    }
    const nextDates = {
      NgayBatDau: NgayBatDau !== undefined ? parseNullableDate(NgayBatDau, 'Ngày bắt đầu học kỳ') : existing.NgayBatDau,
      NgayKetThuc: NgayKetThuc !== undefined ? parseNullableDate(NgayKetThuc, 'Ngày kết thúc học kỳ') : existing.NgayKetThuc,
      NgayBatDauDangKy: NgayBatDauDangKy !== undefined ? parseNullableDate(NgayBatDauDangKy, 'Ngày bắt đầu đăng ký') : existing.NgayBatDauDangKy,
      NgayKetThucDangKy: NgayKetThucDangKy !== undefined ? parseNullableDate(NgayKetThucDangKy, 'Ngày kết thúc đăng ký', { endOfDayForDateOnly: true }) : existing.NgayKetThucDangKy,
      NgayBatDauCuuXet: NgayBatDauCuuXet !== undefined ? parseNullableDate(NgayBatDauCuuXet, 'Ngày bắt đầu cứu xét') : existing.NgayBatDauCuuXet,
      NgayKetThucCuuXet: NgayKetThucCuuXet !== undefined ? parseNullableDate(NgayKetThucCuuXet, 'Ngày kết thúc cứu xét', { endOfDayForDateOnly: true }) : existing.NgayKetThucCuuXet,
      NgayBatDauDongHocPhi: NgayBatDauDongHocPhi !== undefined ? parseNullableDate(NgayBatDauDongHocPhi, 'Ngày bắt đầu đóng học phí') : existing.NgayBatDauDongHocPhi,
      HanDongHocPhi: HanDongHocPhi !== undefined ? parseNullableDate(HanDongHocPhi, 'Hạn đóng học phí') : existing.HanDongHocPhi
    };
    validateSemesterDateRange(nextDates);
    if (NgayBatDau !== undefined) data.NgayBatDau = nextDates.NgayBatDau;
    if (NgayKetThuc !== undefined) data.NgayKetThuc = nextDates.NgayKetThuc;
    if (NgayBatDauDangKy !== undefined) data.NgayBatDauDangKy = nextDates.NgayBatDauDangKy;
    if (NgayKetThucDangKy !== undefined) data.NgayKetThucDangKy = nextDates.NgayKetThucDangKy;
    if (NgayBatDauCuuXet !== undefined) data.NgayBatDauCuuXet = nextDates.NgayBatDauCuuXet;
    if (NgayKetThucCuuXet !== undefined) data.NgayKetThucCuuXet = nextDates.NgayKetThucCuuXet;
    if (NgayBatDauDongHocPhi !== undefined) data.NgayBatDauDongHocPhi = nextDates.NgayBatDauDongHocPhi;
    if (HanDongHocPhi !== undefined) data.HanDongHocPhi = nextDates.HanDongHocPhi;
    Object.assign(data, updateAudit(req));
    const updated = await prisma.HOCKY.update({ where: { MaHocKy: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật học kỳ thành công', data: updated });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Update semester error:');
  }
};

const deleteSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    await prisma.HOCKY.update({ where: { MaHocKy: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển học kỳ vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Delete semester error:');
  }
};

const getAcademicYears = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const searchField = ['MaNamHoc', 'TenNamHoc'].includes(req.query.searchField) ? req.query.searchField : 'all';
    const status = String(req.query.status || '').trim();
    const where = {};

    if (status === 'active') where.TrangThai = true;
    else if (status === 'inactive') where.TrangThai = false;
    else where.TrangThai = true;

    const years = await prisma.NAMHOC.findMany({ where, orderBy: [{ NamBatDau: 'desc' }, { MaNamHoc: 'desc' }] });
    const filtered = filterRowsByRegex(years, search, (row) => {
      const values = { MaNamHoc: [row.MaNamHoc], TenNamHoc: [row.TenNamHoc] };
      return searchField === 'all' ? Object.values(values).flat() : (values[searchField] || []);
    });
    const withUpdaterNames = await attachUpdaterNames(filtered);
    res.json({ success: true, data: withUpdaterNames.map(academicYearSelect) });
  } catch (error) {
    return sendErrorResponse(res, error, 'L???i server', 'Get academic years error:');
  }
};

const createAcademicYear = async (req, res) => {
  try {
    const { MaNamHoc, TenNamHoc, NamBatDau, NamKetThuc, TrangThai } = req.body;
    const parsed = parseAcademicYearCode(MaNamHoc || TenNamHoc);
    const code = parsed?.code || String(MaNamHoc || '').trim();
    const start = NamBatDau !== undefined ? parseInt(NamBatDau, 10) : parsed?.start;
    const end = NamKetThuc !== undefined ? parseInt(NamKetThuc, 10) : parsed?.end;

    if (!code || (!TenNamHoc && !parsed)) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập năm học theo định dạng 2025-2026' });
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
      return res.status(400).json({ success: false, message: 'Năm kết thúc phải lớn hơn năm bắt đầu' });
    }

    const existing = await prisma.NAMHOC.findUnique({ where: { MaNamHoc: code } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Năm học đã tồn tại', data: academicYearSelect(existing) });
    }

    const year = await prisma.NAMHOC.create({
      data: {
        MaNamHoc: code,
        TenNamHoc: String(TenNamHoc || code).trim(),
        NamBatDau: start,
        NamKetThuc: end,
        TrangThai: parseAcademicYearStatus(TrangThai),
        ...updateAudit(req)
      }
    });

    res.status(201).json({ success: true, message: 'Tạo năm học thành công', data: academicYearSelect(year) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Create academic year error:');
  }
};

const updateAcademicYear = async (req, res) => {
  try {
    const existing = await prisma.NAMHOC.findUnique({ where: { MaNamHoc: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy năm học' });

    const { TenNamHoc, NamBatDau, NamKetThuc, TrangThai } = req.body;
    const start = NamBatDau !== undefined ? parseInt(NamBatDau, 10) : existing.NamBatDau;
    const end = NamKetThuc !== undefined ? parseInt(NamKetThuc, 10) : existing.NamKetThuc;
    if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
      return res.status(400).json({ success: false, message: 'Năm kết thúc phải lớn hơn năm bắt đầu' });
    }

    const data = {
      NamBatDau: start,
      NamKetThuc: end,
      ...updateAudit(req)
    };
    if (TenNamHoc !== undefined) {
      data.TenNamHoc = String(TenNamHoc || '').trim();
      if (!data.TenNamHoc) return res.status(400).json({ success: false, message: 'Tên năm học không được để trống' });
    }
    if (TrangThai !== undefined) data.TrangThai = parseAcademicYearStatus(TrangThai);

    const year = await prisma.NAMHOC.update({ where: { MaNamHoc: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật năm học thành công', data: academicYearSelect(year) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Update academic year error:');
  }
};

const deleteAcademicYear = async (req, res) => {
  try {
    const existing = await prisma.NAMHOC.findUnique({ where: { MaNamHoc: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy năm học' });

    const semesterCount = await prisma.HOCKY.count({ where: { MaNamHoc: req.params.id, DaXoa: false } });
    if (semesterCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa năm học đã có học kỳ. Hãy tạm khóa nếu không dùng nữa.'
      });
    }

    await prisma.NAMHOC.delete({ where: { MaNamHoc: req.params.id } });
    res.json({ success: true, message: 'Đã xóa năm học' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Delete academic year error:');
  }
};

module.exports = {
  getAllSemesters,
  getRegistrationOptions,
  getActiveSemester,
  getSemesterById,
  finalizeRegistration,
  openTuitionPayment,
  closeTuitionPayment,
  createSemester,
  updateSemester,
  deleteSemester,
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear
};
