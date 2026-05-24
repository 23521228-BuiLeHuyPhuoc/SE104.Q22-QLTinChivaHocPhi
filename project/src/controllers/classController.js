const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';

const parseIntOrNull = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const getClasses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { MaMonHoc, TrangThai, search } = req.query;
    const where = notDeleted();
    if (MaMonHoc) where.MaMonHoc = MaMonHoc;
    if (TrangThai !== undefined) where.TrangThai = TrangThai === 'true';
    if (search) {
      where.OR = [
        { MaLop: { contains: search, mode: 'insensitive' } },
        { TenLop: { contains: search, mode: 'insensitive' } },
        { GiangVien: { contains: search, mode: 'insensitive' } }
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
          CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS }, select: { id: true } }
        }
      }),
      prisma.LOP.count({ where })
    ]);
    const data = rows.map((row) => ({ ...row, SoLuongDaDangKy: row.CHITIETDANGKY.length }));
    res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('Error getting classes:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getClassById = async (req, res) => {
  try {
    const cls = await prisma.LOP.findFirst({
      where: { MaLop: req.params.id, DaXoa: false },
      include: { MONHOC: { include: { KHOA: true } }, LOPMO: { include: { HOCKY: true, LICHHOCLOP: true } } }
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    res.json({ success: true, data: cls });
  } catch (error) {
    console.error('Error getting class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createClass = async (req, res) => {
  try {
    const { MaLop, TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa, MoTa } = req.body;
    if (!MaLop || !TenLop || !MaMonHoc) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã lớp, tên lớp và môn học' });
    const existingClass = await prisma.LOP.findUnique({ where: { MaLop } });
    if (existingClass && existingClass.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã lớp đã tồn tại' });
    const course = await prisma.MONHOC.findFirst({ where: { MaMonHoc, DaXoa: false } });
    if (!course) return res.status(400).json({ success: false, message: 'Môn học không tồn tại' });
    const cls = await prisma.LOP.create({
      data: { MaLop, TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa: parseInt(SoLuongToiDa, 10) || 50, MoTa, ...updateAudit(req) }
    });
    res.status(201).json({ success: true, message: 'Tạo lớp học thành công', data: cls });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateClass = async (req, res) => {
  try {
    const existing = await prisma.LOP.findFirst({ where: { MaLop: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    const { TenLop, MaMonHoc, GiangVien, LichHoc, PhongHoc, SoLuongToiDa, MoTa, TrangThai } = req.body;
    const data = {};
    if (TenLop) data.TenLop = TenLop;
    if (MaMonHoc) data.MaMonHoc = MaMonHoc;
    if (GiangVien !== undefined) data.GiangVien = GiangVien;
    if (LichHoc !== undefined) data.LichHoc = LichHoc;
    if (PhongHoc !== undefined) data.PhongHoc = PhongHoc;
    if (SoLuongToiDa !== undefined) data.SoLuongToiDa = parseInt(SoLuongToiDa, 10);
    if (MoTa !== undefined) data.MoTa = MoTa;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    Object.assign(data, updateAudit(req));
    const updated = await prisma.LOP.update({ where: { MaLop: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật lớp học thành công', data: updated });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteClass = async (req, res) => {
  try {
    const existing = await prisma.LOP.findFirst({ where: { MaLop: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    await prisma.LOP.update({ where: { MaLop: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển lớp học vào thùng rác' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getOpenedClasses = async (req, res) => {
  try {
    const where = { LOP: { DaXoa: false }, HOCKY: { DaXoa: false } };
    if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const rows = await prisma.LOPMO.findMany({
      where,
      include: { LOP: { include: { MONHOC: true, CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } } } }, HOCKY: true, LICHHOCLOP: true },
      orderBy: { NgayTao: 'desc' }
    });
    res.json({ success: true, data: rows.map((row) => ({ ...row, SoLuongDaDangKy: row.LOP.CHITIETDANGKY.length })) });
  } catch (error) {
    console.error('Error getting opened classes:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const openClass = async (req, res) => {
  try {
    const { MaHocKy, MaLop, GhiChu } = req.body;
    const existing = await prisma.LOPMO.findFirst({ where: { MaHocKy, MaLop } });
    if (existing) return res.status(400).json({ success: false, message: 'Lớp đã được mở trong học kỳ này' });
    const result = await prisma.LOPMO.create({ data: { MaHocKy, MaLop, GhiChu } });
    res.status(201).json({ success: true, message: 'Mở lớp thành công', data: result });
  } catch (error) {
    console.error('Error opening class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const closeClass = async (req, res) => {
  try {
    await prisma.LOPMO.update({ where: { id: parseInt(req.params.id, 10) }, data: { TrangThai: false } });
    res.json({ success: true, message: 'Đóng lớp thành công' });
  } catch (error) {
    console.error('Error closing class:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
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
            TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC: true,
            TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC: true
          },
          orderBy: [{ ThuTrongTuan: 'asc' }, { MaTietBatDau: 'asc' }]
        }
      }
    });
    res.json({ success: true, data: opened });
  } catch (error) {
    console.error('getClassSchedules error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const upsertClassSchedule = async (req, res) => {
  try {
    const { MaHocKy, ThuTrongTuan, MaTietBatDau, MaTietKetThuc, PhongHoc, GhiChu, id } = req.body;
    if (!MaHocKy || !ThuTrongTuan || !MaTietBatDau || !MaTietKetThuc) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập học kỳ, thứ và tiết học' });
    }
    const opened = await prisma.LOPMO.findFirst({ where: { MaHocKy, MaLop: req.params.id, TrangThai: true } });
    if (!opened) return res.status(404).json({ success: false, message: 'Lớp chưa được mở trong học kỳ này' });

    const data = {
      LopMoId: opened.id,
      ThuTrongTuan: parseInt(ThuTrongTuan, 10),
      MaTietBatDau,
      MaTietKetThuc,
      PhongHoc,
      GhiChu,
      TrangThai: true
    };
    const scheduleId = parseIntOrNull(id);
    const schedule = scheduleId
      ? await prisma.LICHHOCLOP.update({ where: { id: scheduleId }, data })
      : await prisma.LICHHOCLOP.create({ data });
    res.json({ success: true, message: 'Cập nhật lịch học thành công', data: schedule });
  } catch (error) {
    console.error('upsertClassSchedule error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
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
    console.error('Error getting class stats:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
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
  getClassStats
};
