const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';

const parseIntOrNull = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const getPeriodOrderMap = async (startId, endId) => {
  const periods = await prisma.TIETHOC.findMany({
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

const rejectCatalogScheduleFields = (body) => {
  const forbiddenFields = ['LichHoc', 'MaPhong', 'PhongHoc', 'GiangVien', 'MaGiangVien'];
  const field = forbiddenFields.find((key) => cleanOptionalText(body[key]) !== undefined && cleanOptionalText(body[key]) !== null);
  if (!field) return null;
  return `Không nhập ${field} khi tạo/sửa lớp học. Giảng viên, phòng và lịch học chỉ được khai báo khi mở lớp.`;
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
        MaGiangVien: currentOpened?.MaGiangVien || null,
        GiangVien: lecturerDisplayName(currentOpened?.GIANGVIEN) || currentOpened?.GiangVien || null,
        SoLuongDaDangKy: currentOpened ? Number(currentOpened.SoLuongDaDangKy || 0) : row.CHITIETDANGKY.length,
        LopMoHienTai: currentOpened
      };
    });
    res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Error getting classes:');
  }
};

const getClassById = async (req, res) => {
  try {
    const cls = await prisma.LOP.findFirst({
      where: { MaLop: req.params.id, DaXoa: false },
      include: {
        MONHOC: { include: { KHOA: true } },
        LOPMO: { include: { HOCKY: true, GIANGVIEN: true, LICHHOCLOP: { include: { PHONGHOC: true } } } }
      }
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    res.json({ success: true, data: cls });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Error getting class:');
  }
};

const createClass = async (req, res) => {
  try {
    const forbiddenMessage = rejectCatalogScheduleFields(req.body);
    if (forbiddenMessage) return res.status(400).json({ success: false, message: forbiddenMessage });

    const { MaLop, TenLop, MaMonHoc } = req.body;
    if (!MaLop || !TenLop || !MaMonHoc) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã lớp, tên lớp và môn học' });
    const existingClass = await prisma.LOP.findUnique({ where: { MaLop } });
    if (existingClass && existingClass.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã lớp đã tồn tại' });
    const course = await prisma.MONHOC.findFirst({ where: { MaMonHoc, DaXoa: false } });
    if (!course) return res.status(400).json({ success: false, message: 'Môn học không tồn tại' });
    const cls = await prisma.LOP.create({
      data: {
        MaLop,
        TenLop,
        MaMonHoc,
        ...updateAudit(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tạo lớp học thành công', data: cls });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Error creating class:');
  }
};

const updateClass = async (req, res) => {
  try {
    const existing = await prisma.LOP.findFirst({ where: { MaLop: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    const forbiddenMessage = rejectCatalogScheduleFields(req.body);
    if (forbiddenMessage) return res.status(400).json({ success: false, message: forbiddenMessage });

    const { TenLop, MaMonHoc, TrangThai } = req.body;
    const data = {};
    if (TenLop) data.TenLop = TenLop;
    if (MaMonHoc) data.MaMonHoc = MaMonHoc;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    Object.assign(data, updateAudit(req));
    const updated = await prisma.LOP.update({ where: { MaLop: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật lớp học thành công', data: updated });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Error updating class:');
  }
};

const deleteClass = async (req, res) => {
  try {
    const existing = await prisma.LOP.findFirst({ where: { MaLop: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    await prisma.LOP.update({ where: { MaLop: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển lớp học vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Error deleting class:');
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
        return sendErrorResponse(res, error, 'Lỗi server', 'Error getting opened classes:');
  }
};

const openClass = async (req, res) => {
  try {
    const { MaHocKy, MaLop, MaGiangVien, MaPhong, ThuTrongTuan, MaTietBatDau, MaTietKetThuc, GhiChu } = req.body;
    if (!MaHocKy || !MaLop || !MaGiangVien || !MaPhong || !ThuTrongTuan || !MaTietBatDau || !MaTietKetThuc) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn học kỳ, giảng viên, phòng và lịch học khi mở lớp' });
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
      const opened = existing
        ? await tx.LOPMO.update({ where: { id: existing.id }, data: { TrangThai: true, GhiChu, ...lecturerData } })
        : await tx.LOPMO.create({ data: { MaHocKy, MaLop, GhiChu, ...lecturerData } });

      if (existing) {
        await tx.LICHHOCLOP.updateMany({
          where: { LopMoId: opened.id, TrangThai: true },
          data: { TrangThai: false }
        });
      }

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
        return sendErrorResponse(res, error, 'Lỗi server', 'Error opening class:');
  }
};

const closeClass = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Mã lớp mở không hợp lệ' });
    const opened = await prisma.LOPMO.findFirst({ where: { id, LOP: { DaXoa: false } }, select: { id: true } });
    if (!opened) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp mở' });
    await prisma.LOPMO.update({ where: { id }, data: { TrangThai: false } });
    res.json({ success: true, message: 'Đóng lớp thành công' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Error closing class:');
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
        return sendErrorResponse(res, error, 'Lỗi server', 'getClassSchedules error:');
  }
};

const upsertClassSchedule = async (req, res) => {
  try {
    const { MaHocKy, ThuTrongTuan, MaTietBatDau, MaTietKetThuc, MaPhong, PhongHoc, GhiChu, id } = req.body;
    if (!MaHocKy || !ThuTrongTuan || !MaTietBatDau || !MaTietKetThuc) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập học kỳ, thứ và tiết học' });
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
    if (!opened) return res.status(404).json({ success: false, message: 'Lớp chưa được mở trong học kỳ này' });

    const roomData = MaPhong !== undefined
      ? await resolveRoomData(MaPhong)
      : { PhongHoc: cleanOptionalText(PhongHoc) };

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
    const schedule = scheduleId
      ? await prisma.LICHHOCLOP.update({ where: { id: scheduleId }, data })
      : await prisma.LICHHOCLOP.create({ data });
    res.json({ success: true, message: 'Cập nhật lịch học thành công', data: schedule });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'upsertClassSchedule error:');
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
        return sendErrorResponse(res, error, 'Lỗi server', 'Error getting class stats:');
  }
};

module.exports = {
  getClasses,
  getClassById,
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
