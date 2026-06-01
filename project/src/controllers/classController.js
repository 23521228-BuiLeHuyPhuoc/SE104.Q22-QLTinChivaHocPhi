const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';

const parseIntOrNull = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const getPeriodOrderMap = async (startId, endId, client = prisma) => {
  const periods = await client.TIETHOC.findMany({
    where: { MaTiet: { in: Array.from(new Set([startId, endId].filter(Boolean))) }, DaXoa: false, TrangThai: true },
    select: { MaTiet: true, ThuTu: true }
  });
  return new Map(periods.map((period) => [period.MaTiet, period.ThuTu]));
};

const cleanOptionalText = (value) => {
  if (value === undefined) return undefined;
  const text = String(value || '').trim();
  return text || null;
};

const lecturerDisplayName = (lecturer) => {
  if (!lecturer) return null;
  return [lecturer.HocHamHocVi, lecturer.HoTen].filter(Boolean).join(' ').trim() || null;
};

const makeHttpError = (message, status = 400, code) => {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
};

const getVietnamDateOnly = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day)
  ));
};

const resolveCurrentSemesterId = async (value, client = prisma) => {
  const requested = cleanOptionalText(value);
  if (requested) return requested;

  const today = getVietnamDateOnly();
  const semester = await client.HOCKY.findFirst({
    where: {
      DaXoa: false,
      NgayBatDau: { lte: today },
      NgayKetThuc: { gte: today }
    },
    orderBy: [{ NgayBatDau: 'desc' }, { MaHocKy: 'desc' }],
    select: { MaHocKy: true }
  });

  if (!semester) {
    throw makeHttpError('Không tìm thấy học kỳ hiện tại theo ngày bắt đầu và kết thúc học kỳ');
  }

  return semester.MaHocKy;
};

const resolveLecturerData = async (value) => {
  const MaGiangVien = cleanOptionalText(value);
  if (!MaGiangVien) return { MaGiangVien: null, GiangVien: null };

  const lecturer = await prisma.GIANGVIEN.findFirst({
    where: { MaGiangVien, DaXoa: false, TrangThai: true }
  });
  if (!lecturer) {
    const error = new Error('Giảng viên không tồn tại hoặc đã bị khóa');
    error.status = 400;
    throw error;
  }
  return { MaGiangVien, GiangVien: lecturerDisplayName(lecturer) };
};

const resolveRoomData = async (value) => {
  const MaPhong = cleanOptionalText(value);
  if (!MaPhong) return { MaPhong: null, PhongHoc: null };

  const room = await prisma.PHONGHOC.findFirst({
    where: { MaPhong, DaXoa: false, TrangThai: true }
  });
  if (!room) {
    const error = new Error('Phòng học không tồn tại hoặc đã bị khóa');
    error.status = 400;
    throw error;
  }
  return { MaPhong, PhongHoc: room.MaPhong };
};

const chooseAssignmentValue = (body, existing, field) => {
  if (Object.prototype.hasOwnProperty.call(body, field)) return cleanOptionalText(body[field]) ?? null;
  return existing?.[field] ?? null;
};

const hasAssignmentInput = (body) => (
  ['MaGiangVien', 'ThuTrongTuan', 'MaTietBatDau', 'MaTietKetThuc', 'MaPhong'].some((field) => (
    Object.prototype.hasOwnProperty.call(body, field)
  ))
);

const emptyClassAssignmentData = () => ({
  MaGiangVien: null,
  GiangVien: null,
  ThuTrongTuan: null,
  MaTietBatDau: null,
  MaTietKetThuc: null,
  MaPhong: null,
  PhongHoc: null,
  LichHoc: null
});

const formatCatalogScheduleText = (thuTrongTuan, startOrder, endOrder) => {
  const day = Number(thuTrongTuan) === 1 ? 'Chủ nhật' : `Thứ ${thuTrongTuan}`;
  return `${day} Tiết ${startOrder}${startOrder === endOrder ? '' : `-${endOrder}`}`;
};

const resolveClassAssignmentData = async (body, existing = {}) => {
  if (!hasAssignmentInput(body)) return { data: {}, conflictInput: null };

  const MaGiangVien = cleanOptionalText(chooseAssignmentValue(body, existing, 'MaGiangVien'));
  const MaPhong = cleanOptionalText(chooseAssignmentValue(body, existing, 'MaPhong'));
  const ThuTrongTuanRaw = chooseAssignmentValue(body, existing, 'ThuTrongTuan');
  const MaTietBatDau = cleanOptionalText(chooseAssignmentValue(body, existing, 'MaTietBatDau'));
  const MaTietKetThuc = cleanOptionalText(chooseAssignmentValue(body, existing, 'MaTietKetThuc'));

  const hasMeaningfulAssignment = Boolean(MaGiangVien || MaPhong || MaTietBatDau || MaTietKetThuc);
  if (!hasMeaningfulAssignment) {
    return { data: hasAssignmentInput(body) ? emptyClassAssignmentData() : {}, conflictInput: null };
  }

  if (!MaGiangVien || !MaPhong || !ThuTrongTuanRaw || !MaTietBatDau || !MaTietKetThuc) {
    throw makeHttpError('Vui lòng chọn đủ giảng viên, phòng học và lịch học cho lớp');
  }

  const ThuTrongTuan = parseInt(ThuTrongTuanRaw, 10);
  if (!Number.isInteger(ThuTrongTuan) || ThuTrongTuan < 1 || ThuTrongTuan > 7) {
    throw makeHttpError('Thứ trong tuần không hợp lệ');
  }

  const periodOrderMap = await getPeriodOrderMap(MaTietBatDau, MaTietKetThuc);
  if (!periodOrderMap.has(MaTietBatDau) || !periodOrderMap.has(MaTietKetThuc)) {
    throw makeHttpError('Tiết học không hợp lệ');
  }
  const startOrder = periodOrderMap.get(MaTietBatDau);
  const endOrder = periodOrderMap.get(MaTietKetThuc);
  if (startOrder > endOrder) {
    throw makeHttpError('Tiết bắt đầu phải trước hoặc bằng tiết kết thúc');
  }

  const lecturerData = await resolveLecturerData(MaGiangVien);
  const roomData = await resolveRoomData(MaPhong);
  return {
    data: {
      ...lecturerData,
      ThuTrongTuan,
      MaTietBatDau,
      MaTietKetThuc,
      ...roomData,
      LichHoc: formatCatalogScheduleText(ThuTrongTuan, startOrder, endOrder)
    },
    conflictInput: {
      MaGiangVien: lecturerData.MaGiangVien,
      MaPhong: roomData.MaPhong,
      ThuTrongTuan,
      MaTietBatDau,
      MaTietKetThuc,
      startOrder,
      endOrder
    }
  };
};

const sameText = (left, right) => {
  const normalizedLeft = cleanOptionalText(left);
  const normalizedRight = cleanOptionalText(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};

const conflictClassName = (conflict) => (
  [conflict.MaLop, conflict.TenLop].filter(Boolean).join(' - ') || conflict.MaLop || 'khác'
);

const scheduleConflictDetails = (conflict, input) => {
  if (!conflict) return null;

  const sameRoom = sameText(conflict.MaPhong, input.MaPhong);
  const sameLecturer = sameText(conflict.MaGiangVien, input.MaGiangVien);
  const sameClass = sameText(conflict.MaLop, input.MaLop);
  const samePeriod =
    Number(conflict.StartOrder) === Number(input.startOrder) &&
    Number(conflict.EndOrder) === Number(input.endOrder);
  const className = conflictClassName(conflict);

  if (sameRoom && sameLecturer && samePeriod) {
    return {
      code: 'RBTV04',
      message: `RBTV04: Không được tạo hai lịch học giống hệt nhau với lớp ${className}.`,
      conflict
    };
  }

  if (sameClass) {
    return {
      code: 'RBTV03',
      message: `RBTV03: Lớp ${className} đã có lịch học trùng thời gian.`,
      conflict
    };
  }

  if (sameRoom) {
    return {
      code: 'RBTV01_RBTV05_RBTV07',
      message: `RBTV01/RBTV05/RBTV07: Phòng ${input.MaPhong} đã có lớp ${className} học trùng thời gian.`,
      conflict
    };
  }

  if (sameLecturer) {
    return {
      code: 'RBTV02_RBTV06_RBTV08',
      message: `RBTV02/RBTV06/RBTV08: Giảng viên ${input.MaGiangVien} đã có lớp ${className} dạy trùng thời gian.`,
      conflict
    };
  }

  return null;
};

const throwScheduleConflict = (details) => {
  if (!details) return;
  const error = makeHttpError(details.message, 409, details.code);
  error.details = details;
  throw error;
};

const firstScheduleConflict = (conflicts, input) => {
  const details = conflicts.map((conflict) => scheduleConflictDetails(conflict, input)).filter(Boolean);
  return details.find((item) => item.code === 'RBTV04') ||
    details.find((item) => item.code === 'RBTV03') ||
    details[0] ||
    null;
};

const ensureCatalogScheduleAvailable = async (client, input) => {
  const conflicts = await client.$queryRaw`
    SELECT
      l."MaLop",
      l."TenLop",
      COALESCE(l."MaGiangVien", l."GiangVien") AS "MaGiangVien",
      COALESCE(l."MaPhong", l."PhongHoc") AS "MaPhong",
      l."ThuTrongTuan",
      l."MaTietBatDau",
      l."MaTietKetThuc",
      bd."ThuTu" AS "StartOrder",
      kt."ThuTu" AS "EndOrder"
    FROM "LOP" l
    JOIN "TIETHOC" bd ON bd."MaTiet" = l."MaTietBatDau"
    JOIN "TIETHOC" kt ON kt."MaTiet" = l."MaTietKetThuc"
    WHERE l."MaLop" IS DISTINCT FROM ${input.MaLop || ''}
      AND COALESCE(l."DaXoa", FALSE) = FALSE
      AND COALESCE(l."TrangThai", TRUE) = TRUE
      AND l."ThuTrongTuan" = ${input.ThuTrongTuan}
      AND (
        COALESCE(l."MaPhong", l."PhongHoc") = ${input.MaPhong}
        OR COALESCE(l."MaGiangVien", l."GiangVien") = ${input.MaGiangVien}
      )
      AND (
        (${input.startOrder} < kt."ThuTu" AND bd."ThuTu" < ${input.endOrder})
        OR (bd."ThuTu" = ${input.startOrder} AND kt."ThuTu" = ${input.endOrder})
      )
    LIMIT 20
  `;

  throwScheduleConflict(firstScheduleConflict(conflicts, input));
};

const ensureOpenedScheduleAvailable = async (client, {
  MaHocKy,
  MaLop,
  MaGiangVien,
  MaPhong,
  ThuTrongTuan,
  MaTietBatDau,
  MaTietKetThuc,
  startOrder,
  endOrder,
  excludeScheduleId,
  excludeLopMoId
}) => {
  const conflicts = await client.$queryRaw`
    SELECT
      lm.id AS "LopMoId",
      lm."MaLop",
      l."TenLop",
      COALESCE(lm."MaGiangVien", lm."GiangVien") AS "MaGiangVien",
      COALESCE(lh."MaPhong", lh."PhongHoc") AS "MaPhong",
      lh."ThuTrongTuan",
      lh."MaTietBatDau",
      lh."MaTietKetThuc",
      bd."ThuTu" AS "StartOrder",
      kt."ThuTu" AS "EndOrder"
    FROM "LOPMO" lm
    JOIN "LOP" l ON l."MaLop" = lm."MaLop"
    JOIN "LICHHOCLOP" lh ON lh."LopMoId" = lm.id
    JOIN "TIETHOC" bd ON bd."MaTiet" = lh."MaTietBatDau"
    JOIN "TIETHOC" kt ON kt."MaTiet" = lh."MaTietKetThuc"
    WHERE lm."MaHocKy" = ${MaHocKy}
      AND COALESCE(l."DaXoa", FALSE) = FALSE
      AND COALESCE(lm."TrangThai", TRUE) = TRUE
      AND COALESCE(lh."TrangThai", TRUE) = TRUE
      AND lh.id <> ${excludeScheduleId || -1}
      AND lm.id <> ${excludeLopMoId || -1}
      AND lh."ThuTrongTuan" = ${ThuTrongTuan}
      AND (
        COALESCE(lh."MaPhong", lh."PhongHoc") = ${MaPhong}
        OR COALESCE(lm."MaGiangVien", lm."GiangVien") = ${MaGiangVien}
        OR lm."MaLop" = ${MaLop}
      )
      AND (
        (${startOrder} < kt."ThuTu" AND bd."ThuTu" < ${endOrder})
        OR (bd."ThuTu" = ${startOrder} AND kt."ThuTu" = ${endOrder})
      )
    LIMIT 20
  `;

  throwScheduleConflict(firstScheduleConflict(conflicts, {
    MaHocKy,
    MaLop,
    MaGiangVien,
    MaPhong,
    ThuTrongTuan,
    MaTietBatDau,
    MaTietKetThuc,
    startOrder,
    endOrder
  }));
};

const getClasses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { MaMonHoc, MaHocKy, TrangThai, openStatus, search } = req.query;
    const where = notDeleted();
    if (MaMonHoc) where.MaMonHoc = MaMonHoc;
    if (TrangThai !== undefined) where.TrangThai = TrangThai === 'true';
    if (MaHocKy && openStatus === 'not_open') {
      where.LOPMO = { none: { MaHocKy } };
    } else if (MaHocKy) {
      where.LOPMO = {
        some: {
          MaHocKy,
          HOCKY: { DaXoa: false },
          ...(openStatus === 'open' ? { TrangThai: true } : {}),
          ...(openStatus === 'closed' ? { TrangThai: false } : {})
        }
      };
    } else if (openStatus === 'open') {
      where.LOPMO = { some: { TrangThai: true, HOCKY: { DaXoa: false } } };
    } else if (openStatus === 'closed') {
      where.LOPMO = { some: { TrangThai: false, HOCKY: { DaXoa: false } } };
    } else if (openStatus === 'not_open') {
      where.LOPMO = { none: {} };
    }
    if (search) {
      where.OR = [
        { MaLop: { contains: search, mode: 'insensitive' } },
        { TenLop: { contains: search, mode: 'insensitive' } },
        { MaMonHoc: { contains: search, mode: 'insensitive' } },
        { MONHOC: { TenMonHoc: { contains: search, mode: 'insensitive' } } },
        { MaGiangVien: { contains: search, mode: 'insensitive' } },
        { GiangVien: { contains: search, mode: 'insensitive' } },
        { LichHoc: { contains: search, mode: 'insensitive' } },
        { MaPhong: { contains: search, mode: 'insensitive' } },
        { PhongHoc: { contains: search, mode: 'insensitive' } },
        { GIANGVIEN: { is: { HoTen: { contains: search, mode: 'insensitive' } } } },
        { PHONGHOC: { is: { TenPhong: { contains: search, mode: 'insensitive' } } } },
        { LOPMO: { some: { MaGiangVien: { contains: search, mode: 'insensitive' } } } },
        { LOPMO: { some: { GiangVien: { contains: search, mode: 'insensitive' } } } },
        { LOPMO: { some: { GIANGVIEN: { is: { HoTen: { contains: search, mode: 'insensitive' } } } } } },
        {
          LOPMO: {
            some: {
              LICHHOCLOP: {
                some: {
                  OR: [
                    { MaPhong: { contains: search, mode: 'insensitive' } },
                    { PhongHoc: { contains: search, mode: 'insensitive' } },
                    { PHONGHOC: { is: { TenPhong: { contains: search, mode: 'insensitive' } } } }
                  ]
                }
              }
            }
          }
        }
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.LOP.findMany({
        where,
        skip,
        take: limit,
        orderBy: { NgayTao: 'desc' },
        include: {
          MONHOC: { include: { KHOA: true } },
          GIANGVIEN: true,
          PHONGHOC: true,
          TIETHOC_LOP_MaTietBatDauToTIETHOC: true,
          TIETHOC_LOP_MaTietKetThucToTIETHOC: true,
          CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS }, select: { id: true } },
          LOPMO: {
            include: {
              HOCKY: true,
              GIANGVIEN: true,
              LICHHOCLOP: { where: { TrangThai: true }, include: { PHONGHOC: true } }
            },
            orderBy: { NgayTao: 'desc' }
          }
        }
      }),
      prisma.LOP.count({ where })
    ]);
    const data = rows.map((row) => {
      const openedForSemester = MaHocKy ? row.LOPMO.find((item) => item.MaHocKy === MaHocKy) : null;
      const activeOpened = row.LOPMO.find((item) => item.TrangThai !== false);
      const currentOpened = openedForSemester || activeOpened || row.LOPMO[0] || null;
      return {
        ...row,
        MaGiangVien: currentOpened?.MaGiangVien || row.MaGiangVien || null,
        GiangVien: lecturerDisplayName(currentOpened?.GIANGVIEN) || currentOpened?.GiangVien || lecturerDisplayName(row.GIANGVIEN) || row.GiangVien || null,
        SoLuongDaDangKy: currentOpened ? Number(currentOpened.SoLuongDaDangKy || 0) : row.CHITIETDANGKY.length,
        LopMoHienTai: currentOpened
      };
    });
    res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Error getting classes:');
  }
};

const getClassById = async (req, res) => {
  try {
    const cls = await prisma.LOP.findFirst({
      where: { MaLop: req.params.id, DaXoa: false },
      include: {
        MONHOC: { include: { KHOA: true } },
        GIANGVIEN: true,
        PHONGHOC: true,
        TIETHOC_LOP_MaTietBatDauToTIETHOC: true,
        TIETHOC_LOP_MaTietKetThucToTIETHOC: true,
        LOPMO: { include: { HOCKY: true, GIANGVIEN: true, LICHHOCLOP: { include: { PHONGHOC: true } } } }
      }
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Khong tim thay lop hoc' });
    res.json({ success: true, data: cls });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Error getting class:');
  }
};

const validateClassSchedule = async (req, res) => {
  try {
    const mode = cleanOptionalText(req.body.mode) || 'opened';

    if (mode === 'catalog') {
      const MaLop = cleanOptionalText(req.body.MaLop);
      if (!MaLop) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã lớp trước khi kiểm tra lịch học' });

      const assignment = await resolveClassAssignmentData(req.body);
      if (assignment.conflictInput) {
        await ensureCatalogScheduleAvailable(prisma, { MaLop, ...assignment.conflictInput });
      }

      return res.json({ success: true, data: { valid: true } });
    }

    const { MaLop, ThuTrongTuan, MaTietBatDau, MaTietKetThuc, MaPhong, id } = req.body;
    const MaHocKy = await resolveCurrentSemesterId(req.body.MaHocKy);
    if (!MaLop || !ThuTrongTuan || !MaTietBatDau || !MaTietKetThuc || !MaPhong) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lớp, thứ, tiết học và phòng' });
    }

    const thuTrongTuan = parseInt(ThuTrongTuan, 10);
    if (!Number.isInteger(thuTrongTuan) || thuTrongTuan < 1 || thuTrongTuan > 7) {
      return res.status(400).json({ success: false, message: 'Thứ trong tuần không hợp lệ' });
    }

    const periodOrderMap = await getPeriodOrderMap(MaTietBatDau, MaTietKetThuc);
    if (!periodOrderMap.has(MaTietBatDau) || !periodOrderMap.has(MaTietKetThuc)) {
      return res.status(400).json({ success: false, message: 'Tiết học không hợp lệ' });
    }
    if (periodOrderMap.get(MaTietBatDau) > periodOrderMap.get(MaTietKetThuc)) {
      return res.status(400).json({ success: false, message: 'Tiết bắt đầu phải trước hoặc bằng tiết kết thúc' });
    }

    const roomData = await resolveRoomData(MaPhong);
    let lecturerId = cleanOptionalText(req.body.MaGiangVien);
    let excludeLopMoId = null;

    if (mode === 'open') {
      if (!lecturerId) return res.status(400).json({ success: false, message: 'Vui lòng chọn giảng viên' });
      await resolveLecturerData(lecturerId);

      const existing = await prisma.LOPMO.findFirst({
        where: { MaHocKy, MaLop },
        select: { id: true, TrangThai: true }
      });
      if (existing && existing.TrangThai !== false) {
        return res.status(400).json({ success: false, message: 'Lớp đã được mở trong học kỳ này' });
      }
      excludeLopMoId = existing?.id || null;
    } else if (!lecturerId) {
      const opened = await prisma.LOPMO.findFirst({
        where: { MaHocKy, MaLop, TrangThai: true },
        select: { MaGiangVien: true, GiangVien: true }
      });
      if (!opened) return res.status(404).json({ success: false, message: 'Lớp chưa được mở trong học kỳ này' });
      lecturerId = cleanOptionalText(opened.MaGiangVien || opened.GiangVien);
    }

    if (!lecturerId) return res.status(400).json({ success: false, message: 'Lớp mở chưa có giảng viên phụ trách' });

    await ensureOpenedScheduleAvailable(prisma, {
      MaHocKy,
      MaLop,
      MaGiangVien: lecturerId,
      MaPhong: roomData.MaPhong,
      ThuTrongTuan: thuTrongTuan,
      MaTietBatDau,
      MaTietKetThuc,
      startOrder: periodOrderMap.get(MaTietBatDau),
      endOrder: periodOrderMap.get(MaTietKetThuc),
      excludeScheduleId: parseIntOrNull(id),
      excludeLopMoId
    });

    return res.json({ success: true, data: { valid: true } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'validateClassSchedule error:');
  }
};

const createClass = async (req, res) => {
  try {
    const { MaLop, TenLop, MaMonHoc } = req.body;
    if (!MaLop || !TenLop || !MaMonHoc) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã lớp, tên lớp và môn học' });
    const existingClass = await prisma.LOP.findUnique({ where: { MaLop } });
    if (existingClass && existingClass.DaXoa === false) return res.status(400).json({ success: false, message: 'Ma lop da ton tai' });
    const course = await prisma.MONHOC.findFirst({ where: { MaMonHoc, DaXoa: false } });
    if (!course) return res.status(400).json({ success: false, message: 'Môn học không tồn tại' });
    const assignment = await resolveClassAssignmentData(req.body);
    if (assignment.conflictInput) {
      await ensureCatalogScheduleAvailable(prisma, { MaLop, ...assignment.conflictInput });
    }
    const cls = await prisma.LOP.create({
      data: {
        MaLop,
        TenLop,
        MaMonHoc,
        ...assignment.data,
        ...updateAudit(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tao lop hoc thanh cong', data: cls });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Error creating class:');
  }
};

const updateClass = async (req, res) => {
  try {
    const existing = await prisma.LOP.findFirst({ where: { MaLop: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    const { TenLop, MaMonHoc, TrangThai } = req.body;
    if (MaMonHoc) {
      const course = await prisma.MONHOC.findFirst({ where: { MaMonHoc, DaXoa: false } });
      if (!course) return res.status(400).json({ success: false, message: 'Môn học không tồn tại' });
    }
    const data = {};
    if (TenLop) data.TenLop = TenLop;
    if (MaMonHoc) data.MaMonHoc = MaMonHoc;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    const assignment = await resolveClassAssignmentData(req.body, existing);
    if (assignment.conflictInput) {
      await ensureCatalogScheduleAvailable(prisma, { MaLop: req.params.id, ...assignment.conflictInput });
    }
    Object.assign(data, assignment.data);
    Object.assign(data, updateAudit(req));
    const updated = await prisma.LOP.update({ where: { MaLop: req.params.id }, data });
    res.json({ success: true, message: 'Cap nhat lop hoc thanh cong', data: updated });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Error updating class:');
  }
};

const deleteClass = async (req, res) => {
  try {
    const existing = await prisma.LOP.findFirst({ where: { MaLop: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay lop hoc' });
    await prisma.LOP.update({ where: { MaLop: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Da chuyen lop hoc vao thung rac' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Error deleting class:');
  }
};

const getOpenedClasses = async (req, res) => {
  try {
    const where = { LOP: { DaXoa: false }, HOCKY: { DaXoa: false } };
    if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const rows = await prisma.LOPMO.findMany({
      where,
      include: {
        LOP: {
          include: {
            MONHOC: true,
            CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } }
          }
        },
        GIANGVIEN: true,
        HOCKY: true,
        LICHHOCLOP: { include: { PHONGHOC: true } }
      },
      orderBy: { NgayTao: 'desc' }
    });
    res.json({ success: true, data: rows.map((row) => ({ ...row, SoLuongDaDangKy: Number(row.SoLuongDaDangKy || 0) })) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Error getting opened classes:');
  }
};

const openClass = async (req, res) => {
  try {
    const { MaLop, MaGiangVien, MaPhong, ThuTrongTuan, MaTietBatDau, MaTietKetThuc, GhiChu } = req.body;
    const MaHocKy = await resolveCurrentSemesterId(req.body.MaHocKy);
    if (!MaLop || !MaGiangVien || !MaPhong || !ThuTrongTuan || !MaTietBatDau || !MaTietKetThuc) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn giảng viên, phòng và lịch học khi mở lớp' });
    }
    const thuTrongTuan = parseInt(ThuTrongTuan, 10);
    if (!Number.isInteger(thuTrongTuan) || thuTrongTuan < 1 || thuTrongTuan > 7) {
      return res.status(400).json({ success: false, message: 'Thứ trong tuần không hợp lệ' });
    }
    const periodOrderMap = await getPeriodOrderMap(MaTietBatDau, MaTietKetThuc);
    if (!periodOrderMap.has(MaTietBatDau) || !periodOrderMap.has(MaTietKetThuc)) {
      return res.status(400).json({ success: false, message: 'Tiết học không hợp lệ' });
    }
    if (periodOrderMap.get(MaTietBatDau) > periodOrderMap.get(MaTietKetThuc)) {
      return res.status(400).json({ success: false, message: 'Tiết bắt đầu phải trước hoặc bằng tiết kết thúc' });
    }

    const lecturerData = await resolveLecturerData(MaGiangVien);
    const roomData = await resolveRoomData(MaPhong);

    const [semester, cls] = await Promise.all([
      prisma.HOCKY.findFirst({ where: { MaHocKy, DaXoa: false }, select: { MaHocKy: true } }),
      prisma.LOP.findFirst({ where: { MaLop, DaXoa: false, TrangThai: true }, select: { MaLop: true } })
    ]);
    if (!semester) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    if (!cls) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học đang hoạt động' });

    const existing = await prisma.LOPMO.findFirst({ where: { MaHocKy, MaLop } });
    if (existing && existing.TrangThai !== false) return res.status(400).json({ success: false, message: 'Lớp đã được mở trong học kỳ này' });

    const result = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.LICHHOCLOP.updateMany({
          where: { LopMoId: existing.id, TrangThai: true },
          data: { TrangThai: false }
        });
      }

      const opened = existing
        ? await tx.LOPMO.update({ where: { id: existing.id }, data: { TrangThai: true, GhiChu, ...lecturerData } })
        : await tx.LOPMO.create({ data: { MaHocKy, MaLop, GhiChu, ...lecturerData } });

      await ensureOpenedScheduleAvailable(tx, {
        MaHocKy,
        MaLop,
        MaGiangVien: lecturerData.MaGiangVien,
        MaPhong: roomData.MaPhong,
        ThuTrongTuan: thuTrongTuan,
        MaTietBatDau,
        MaTietKetThuc,
        startOrder: periodOrderMap.get(MaTietBatDau),
        endOrder: periodOrderMap.get(MaTietKetThuc)
      });

      const schedule = await tx.LICHHOCLOP.create({
        data: {
          LopMoId: opened.id,
          ThuTrongTuan: thuTrongTuan,
          MaTietBatDau,
          MaTietKetThuc,
          ...roomData,
          TrangThai: true
        }
      });

      return { ...opened, LICHHOCLOP: [schedule] };
    });

    if (existing) return res.json({ success: true, message: 'Mở lại lớp thành công', data: result });
    res.status(201).json({ success: true, message: 'Mở lớp thành công', data: result });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Error opening class:');
  }
};

const closeClass = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Mã lớp mở không hợp lệ' });
    const opened = await prisma.LOPMO.findFirst({ where: { id, LOP: { DaXoa: false } }, select: { id: true } });
    if (!opened) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp mở' });
    await prisma.$transaction(async (tx) => {
      await tx.LICHHOCLOP.updateMany({
        where: { LopMoId: id, TrangThai: true },
        data: { TrangThai: false }
      });
      await tx.LOPMO.update({ where: { id }, data: { TrangThai: false } });
    });
    res.json({ success: true, message: 'Đóng lớp thành công' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Error closing class:');
  }
};

const getClassSchedules = async (req, res) => {
  try {
    const where = { MaLop: req.params.id };
    if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const opened = await prisma.LOPMO.findMany({
      where,
      include: {
        HOCKY: true,
        LICHHOCLOP: {
          where: { TrangThai: true },
          include: {
            PHONGHOC: true,
            TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC: true,
            TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC: true
          },
          orderBy: [{ ThuTrongTuan: 'asc' }, { MaTietBatDau: 'asc' }]
        }
      }
    });
    res.json({ success: true, data: opened });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'getClassSchedules error:');
  }
};

const upsertClassSchedule = async (req, res) => {
  try {
    const { MaHocKy, ThuTrongTuan, MaTietBatDau, MaTietKetThuc, MaPhong, PhongHoc, GhiChu, id } = req.body;
    if (!MaHocKy || !ThuTrongTuan || !MaTietBatDau || !MaTietKetThuc || !MaPhong) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập học kỳ, thứ, tiết học và phòng' });
    }

    const thuTrongTuan = parseInt(ThuTrongTuan, 10);
    if (!Number.isInteger(thuTrongTuan) || thuTrongTuan < 1 || thuTrongTuan > 7) {
      return res.status(400).json({ success: false, message: 'Thứ trong tuần không hợp lệ' });
    }

    const periodOrderMap = await getPeriodOrderMap(MaTietBatDau, MaTietKetThuc);
    if (!periodOrderMap.has(MaTietBatDau) || !periodOrderMap.has(MaTietKetThuc)) {
      return res.status(400).json({ success: false, message: 'Tiết học không hợp lệ' });
    }
    if (periodOrderMap.get(MaTietBatDau) > periodOrderMap.get(MaTietKetThuc)) {
      return res.status(400).json({ success: false, message: 'Tiết bắt đầu phải trước hoặc bằng tiết kết thúc' });
    }

    const opened = await prisma.LOPMO.findFirst({ where: { MaHocKy, MaLop: req.params.id, TrangThai: true } });
    if (!opened) return res.status(404).json({ success: false, message: 'Lop chua duoc mo trong hoc ky nay' });

    if (!cleanOptionalText(opened.MaGiangVien || opened.GiangVien)) {
      return res.status(400).json({ success: false, message: 'Lop mo chua co giang vien phu trach' });
    }

    const roomData = await resolveRoomData(MaPhong);

    const data = {
      LopMoId: opened.id,
      ThuTrongTuan: thuTrongTuan,
      MaTietBatDau,
      MaTietKetThuc,
      ...roomData,
      GhiChu,
      TrangThai: true
    };
    const scheduleId = parseIntOrNull(id);
    if (id && !scheduleId) return res.status(400).json({ success: false, message: 'Mã lịch học không hợp lệ' });
    if (scheduleId) {
      const existingSchedule = await prisma.LICHHOCLOP.findFirst({
        where: { id: scheduleId, LOPMO: { MaLop: req.params.id } },
        select: { id: true }
      });
      if (!existingSchedule) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch học của lớp này' });
    }
    await ensureOpenedScheduleAvailable(prisma, {
      MaHocKy,
      MaLop: req.params.id,
      MaGiangVien: opened.MaGiangVien || opened.GiangVien,
      MaPhong: roomData.MaPhong,
      ThuTrongTuan: thuTrongTuan,
      MaTietBatDau,
      MaTietKetThuc,
      startOrder: periodOrderMap.get(MaTietBatDau),
      endOrder: periodOrderMap.get(MaTietKetThuc),
      excludeScheduleId: scheduleId
    });
    const schedule = scheduleId
      ? await prisma.LICHHOCLOP.update({ where: { id: scheduleId }, data })
      : await prisma.LICHHOCLOP.create({ data });
    res.json({ success: true, message: 'Cap nhat lich hoc thanh cong', data: schedule });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'upsertClassSchedule error:');
  }
};

const deleteClassSchedule = async (req, res) => {
  try {
    const scheduleId = parseIntOrNull(req.params.scheduleId);
    if (!scheduleId) return res.status(400).json({ success: false, message: 'Mã lịch học không hợp lệ' });

    const schedule = await prisma.LICHHOCLOP.findFirst({
      where: { id: scheduleId, LOPMO: { MaLop: req.params.id } }
    });
    if (!schedule) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch học của lớp này' });

    await prisma.LICHHOCLOP.update({ where: { id: scheduleId }, data: { TrangThai: false } });
    res.json({ success: true, message: 'Đã xóa lịch học' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'deleteClassSchedule error:');
  }
};

const getClassStudents = async (req, res) => {
  try {
    const where = {
      MaLop: req.params.id,
      TrangThai: ACTIVE_REGISTRATION_STATUS,
      PHIEUDANGKY: {
        ...(req.query.MaHocKy ? { MaHocKy: req.query.MaHocKy } : {}),
        SINHVIEN: { DaXoa: false }
      }
    };

    const rows = await prisma.CHITIETDANGKY.findMany({
      where,
      orderBy: { NgayDangKy: 'desc' },
      include: {
        PHIEUDANGKY: {
          include: {
            SINHVIEN: { select: { MaSv: true, HoTen: true } },
            HOCKY: { select: { MaHocKy: true, TenHocKy: true } }
          }
        }
      }
    });

    res.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        SoPhieu: row.SoPhieu,
        MaSv: row.PHIEUDANGKY?.SINHVIEN?.MaSv || row.PHIEUDANGKY?.MaSv || '',
        HoTen: row.PHIEUDANGKY?.SINHVIEN?.HoTen || '',
        MaHocKy: row.PHIEUDANGKY?.MaHocKy || '',
        TenHocKy: row.PHIEUDANGKY?.HOCKY?.TenHocKy || '',
        NgayDangKy: row.NgayDangKy || row.PHIEUDANGKY?.NgayLap || null,
        TrangThai: row.TrangThai || ''
      }))
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getClassStudents error:');
  }
};

const getClassStats = async (req, res) => {
  try {
    const [totalClasses, activeClasses, totalOpened] = await Promise.all([
      prisma.LOP.count({ where: notDeleted() }),
      prisma.LOP.count({ where: { ...notDeleted(), TrangThai: true } }),
      prisma.LOPMO.count({ where: { TrangThai: true, LOP: { DaXoa: false }, HOCKY: { DaXoa: false } } })
    ]);
    res.json({ success: true, data: { total_classes: totalClasses, active_classes: activeClasses, total_opened_classes: totalOpened } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Error getting class stats:');
  }
};

module.exports = {
  getClasses,
  getClassById,
  validateClassSchedule,
  createClass,
  updateClass,
  deleteClass,
  getOpenedClasses,
  openClass,
  closeClass,
  getClassSchedules,
  upsertClassSchedule,
  deleteClassSchedule,
  getClassStudents,
  getClassStats
};
