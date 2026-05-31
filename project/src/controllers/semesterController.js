const prisma = require('../config/database');
const { getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { assertRegistrationClosed, getRegistrationWindowState } = require('../utils/registrationWindow');
const { recalculateRegistrationTotals } = require('./registrationController');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';
const CANCELLED_REGISTRATION_STATUS = 'Đã hủy';
const ONGOING_SEMESTER_STATUS = 'Đang diễn ra';
const MIN_OPEN_CLASS_RATIO = 0.75;

const semesterSelect = (hk) => ({
  MaHocKy: hk.MaHocKy,
  TenHocKy: hk.TenHocKy,
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
  HanDongHocPhi: hk.HanDongHocPhi,
  TrangThai: hk.TrangThai,
  NgayCapNhat: hk.NgayCapNhat,
  NguoiCapNhat: hk.NguoiCapNhat,
  NguoiCapNhatTen: hk.NguoiCapNhatTen,
  SoLopMo: hk.SoLopMo ?? hk._count?.LOPMO ?? 0,
  SoSinhVienDangKy: hk.SoSinhVienDangKy ?? hk._count?.PHIEUDANGKY ?? 0
});

const registrationSemesterSelect = (semester) => {
  const windowState = getRegistrationWindowState(semester);
  return {
    ...semesterSelect(semester),
    RegistrationWindow: {
      isOpen: windowState.isOpen,
      isClosed: windowState.isClosed,
      reason: windowState.reason,
      message: windowState.message,
      registrationStart: windowState.registrationStart,
      registrationDeadline: windowState.registrationDeadline
    },
    CoTheDangKy: windowState.isOpen,
    LyDoKhongTheDangKy: windowState.message
  };
};

const academicYearSelect = (year) => ({
  MaNamHoc: year.MaNamHoc,
  TenNamHoc: year.TenNamHoc,
  NamBatDau: year.NamBatDau,
  NamKetThuc: year.NamKetThuc,
  TrangThai: year.TrangThai
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
const SEMESTER_DATE_FIELDS = new Set(['NgayBatDau', 'NgayKetThuc', 'NgayBatDauDangKy', 'NgayKetThucDangKy', 'HanDongHocPhi']);

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
  const where = { DaXoa: false };
  const and = [];
  const q = String(query.q || query.search || '').trim();
  const semesterKind = normalizeSemesterKind(query.semesterKind || (query.searchField === 'HocKy' ? query.search : ''));
  const status = String(query.status || '').trim();
  const requestedDateField = SEMESTER_DATE_FIELDS.has(query.dateField) ? query.dateField : 'all';
  const legacyDateSearch = query.searchField && SEMESTER_DATE_FIELDS.has(query.searchField) ? query.search : '';
  const exactDate = parseFilterDate(query.dateExact || query.date || legacyDateSearch, 'Ngày chính xác');
  const dateFrom = exactDate || parseFilterDate(query.dateFrom, 'Từ ngày');
  const dateTo = exactDate || parseFilterDate(query.dateTo, 'Đến ngày');

  if (q && query.searchField !== 'HocKy' && !SEMESTER_DATE_FIELDS.has(query.searchField)) {
    and.push({
      OR: [
        { MaHocKy: { contains: q, mode: 'insensitive' } },
        { TenHocKy: { contains: q, mode: 'insensitive' } },
        { MaNamHoc: { contains: q, mode: 'insensitive' } },
        { NAMHOC: { TenNamHoc: { contains: q, mode: 'insensitive' } } }
      ]
    });
  }

  if (semesterKind) and.push({ ThuTu: parseInt(semesterKind, 10) });
  if (status) and.push({ TrangThai: status });

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
  const { page, limit, skip } = getSemesterPagination(query);
  const where = buildSemesterWhere(query);
  const [semesters, total] = await Promise.all([
    prisma.HOCKY.findMany({
      where,
      skip,
      take: limit,
      include: {
        NAMHOC: true,
        _count: {
          select: {
            LOPMO: true,
            PHIEUDANGKY: true
          }
        }
      },
      orderBy: [{ NAMHOC: { NamBatDau: 'desc' } }, { ThuTu: 'asc' }, { MaHocKy: 'asc' }]
    }),
    prisma.HOCKY.count({ where })
  ]);

  const withUpdaterNames = await attachUpdaterNames(semesters);
  return {
    data: withUpdaterNames.map(semesterSelect),
    pagination: getPaginationMeta(total, page, limit)
  };
};

const validateSemesterDateRange = ({ NgayBatDau, NgayKetThuc, NgayBatDauDangKy, NgayKetThucDangKy, HanDongHocPhi }) => {
  const start = NgayBatDau ? toDateOnly(NgayBatDau) : null;
  const end = NgayKetThuc ? toDateOnly(NgayKetThuc) : null;
  const registrationStart = NgayBatDauDangKy ? toDateOnly(NgayBatDauDangKy) : null;
  const registrationEnd = NgayKetThucDangKy ? toDateOnly(NgayKetThucDangKy) : null;
  const tuitionDue = HanDongHocPhi ? toDateOnly(HanDongHocPhi) : null;

  if ((start === null) !== (end === null)) {
    throw makeSemesterDateError('Cần nhập đủ ngày bắt đầu và ngày kết thúc học kỳ');
  }

  if ((registrationStart === null) !== (registrationEnd === null)) {
    throw makeSemesterDateError('Cần nhập đủ ngày bắt đầu và ngày kết thúc đăng ký');
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

  if (tuitionDue !== null && (start === null || end === null)) {
    throw makeSemesterDateError('Cần nhập ngày bắt đầu và ngày kết thúc học kỳ trước khi nhập hạn đóng học phí');
  }

  if (tuitionDue !== null && start !== null && end !== null && (tuitionDue < start || tuitionDue > end)) {
    throw makeSemesterDateError('Hạn đóng học phí phải nằm trong khoảng thời gian học kỳ');
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
        DaXoa: false,
        NgayBatDauDangKy: { not: null },
        NgayKetThucDangKy: { not: null }
      },
      take: 8,
      orderBy: [{ NgayBatDau: { sort: 'desc', nulls: 'last' } }, { MaHocKy: 'desc' }],
      include: { NAMHOC: true }
    });

    res.json({ success: true, data: semesters.map(registrationSemesterSelect) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get registration options error:');
  }
};

const getActiveSemester = async (req, res) => {
  try {
    let hk = await prisma.HOCKY.findFirst({ where: { ...notDeleted(), OR: [{ TrangThai: 'Đang diễn ra' }, { TrangThai: 'Đang hoạt động' }] }, include: { NAMHOC: true } });
    if (!hk) hk = await prisma.HOCKY.findFirst({ where: { ...notDeleted(), OR: [{ TrangThai: 'Sắp diễn ra' }, { TrangThai: 'Sắp tới' }] }, include: { NAMHOC: true }, orderBy: { NgayBatDau: 'asc' } });
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
      const semester = await tx.HOCKY.findFirst({
        where: { MaHocKy: maHocKy, DaXoa: false }
      });
      if (!semester) throw { status: 404, message: 'Không tìm thấy học kỳ' };
      assertRegistrationClosed(semester);

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
        const threshold = Math.ceil(capacity * MIN_OPEN_CLASS_RATIO);
        const registeredCount = registrationCountByClass.get(openedClass.MaLop) || 0;
        const willOpen = capacity > 0 && registeredCount >= threshold;

        return {
          id: openedClass.id,
          MaLop: openedClass.MaLop,
          TenLop: openedClass.LOP?.TenLop || null,
          SoLuongToiDa: capacity,
          SoLuongDaDangKy: registeredCount,
          NguongMoLop: threshold,
          TrangThaiSauChot: willOpen
        };
      });

      const openedAfterFinalize = classSummaries.filter((item) => item.TrangThaiSauChot);
      const closedAfterFinalize = classSummaries.filter((item) => !item.TrangThaiSauChot);
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
            LyDoHuy: 'Lớp không đủ 75% sức chứa khi chốt đăng ký'
          }
        })
        : { count: 0 };

      for (const item of openedAfterFinalize) {
        await tx.LOPMO.update({
          where: { id: item.id },
          data: {
            TrangThai: true,
            SoLuongDaDangKy: item.SoLuongDaDangKy
          }
        });
      }

      for (const item of closedAfterFinalize) {
        await tx.LICHHOCLOP.updateMany({
          where: { LopMoId: item.id, TrangThai: true },
          data: { TrangThai: false }
        });
        await tx.LOPMO.update({
          where: { id: item.id },
          data: {
            TrangThai: false,
            SoLuongDaDangKy: 0
          }
        });
      }

      for (const registration of affectedRegistrations) {
        await recalculateRegistrationTotals(tx, registration.SoPhieu);
      }

      await tx.HOCKY.update({
        where: { MaHocKy: maHocKy },
        data: {
          TrangThai: ONGOING_SEMESTER_STATUS,
          ...updateAudit(req)
        }
      });

      return {
        MaHocKy: maHocKy,
        TiLeMoLopToiThieu: MIN_OPEN_CLASS_RATIO,
        SoLopDatNguong: openedAfterFinalize.length,
        SoLopBiDong: closedAfterFinalize.length,
        SoDangKyBiHuy: cancelled.count,
        classes: classSummaries
      };
    });

    res.json({
      success: true,
      message: 'Chốt đăng ký học phần thành công. Học kỳ đã chuyển sang trạng thái đang diễn ra.',
      data: result
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message, code: error.code });
        return sendErrorResponse(res, error, 'Không thể chốt đăng ký học phần', 'Finalize registration error:');
  }
};

const createSemester = async (req, res) => {
  try {
    const { MaHocKy, TenHocKy, MaNamHoc, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, NgayBatDauDangKy, NgayKetThucDangKy, HanDongHocPhi, TrangThai } = req.body;
    if (!MaHocKy || !TenHocKy || !MaNamHoc) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    const existing = await prisma.HOCKY.findUnique({ where: { MaHocKy } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã học kỳ đã tồn tại' });
    if (TrangThai === 'Đang diễn ra') await ensureSingleOngoingSemester(MaHocKy);
    const dates = {
      NgayBatDau: parseNullableDate(NgayBatDau, 'Ngày bắt đầu học kỳ'),
      NgayKetThuc: parseNullableDate(NgayKetThuc, 'Ngày kết thúc học kỳ'),
      NgayBatDauDangKy: parseNullableDate(NgayBatDauDangKy, 'Ngày bắt đầu đăng ký'),
      NgayKetThucDangKy: parseNullableDate(NgayKetThucDangKy, 'Ngày kết thúc đăng ký', { endOfDayForDateOnly: true }),
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
    const { TenHocKy, MaNamHoc, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, NgayBatDauDangKy, NgayKetThucDangKy, HanDongHocPhi, TrangThai } = req.body;
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
      HanDongHocPhi: HanDongHocPhi !== undefined ? parseNullableDate(HanDongHocPhi, 'Hạn đóng học phí') : existing.HanDongHocPhi
    };
    validateSemesterDateRange(nextDates);
    if (NgayBatDau !== undefined) data.NgayBatDau = nextDates.NgayBatDau;
    if (NgayKetThuc !== undefined) data.NgayKetThuc = nextDates.NgayKetThuc;
    if (NgayBatDauDangKy !== undefined) data.NgayBatDauDangKy = nextDates.NgayBatDauDangKy;
    if (NgayKetThucDangKy !== undefined) data.NgayKetThucDangKy = nextDates.NgayKetThucDangKy;
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
    const years = await prisma.NAMHOC.findMany({ where: { TrangThai: true }, orderBy: { TenNamHoc: 'desc' } });
    res.json({ success: true, data: years.map(academicYearSelect) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get academic years error:');
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
        TrangThai: parseAcademicYearStatus(TrangThai)
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
      NamKetThuc: end
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
  createSemester,
  updateSemester,
  deleteSemester,
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear
};
