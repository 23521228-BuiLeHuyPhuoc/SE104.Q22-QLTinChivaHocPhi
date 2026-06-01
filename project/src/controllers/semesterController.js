const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const semesterSelect = (hk) => ({
  MaHocKy: hk.MaHocKy,
  TenHocKy: hk.TenHocKy,
  MaNamHoc: hk.MaNamHoc,
  TenNamHoc: hk.NAMHOC?.TenNamHoc,
  LoaiHocKy: hk.LoaiHocKy,
  ThuTu: hk.ThuTu,
  NgayBatDau: hk.NgayBatDau,
  NgayKetThuc: hk.NgayKetThuc,
  NgayBatDauDangKy: hk.NgayBatDauDangKy,
  NgayKetThucDangKy: hk.NgayKetThucDangKy,
  HanDongHocPhi: hk.HanDongHocPhi,
  TrangThai: hk.TrangThai,
  NgayCapNhat: hk.NgayCapNhat,
  NguoiCapNhat: hk.NguoiCapNhat
});

const getAllSemesters = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [semesters, total] = await Promise.all([
      prisma.HOCKY.findMany({
        where: notDeleted(),
        skip,
        take: limit,
        include: { NAMHOC: true },
        orderBy: [{ NAMHOC: { NamBatDau: 'desc' } }, { ThuTu: 'asc' }]
      }),
      prisma.HOCKY.count({ where: notDeleted() })
    ]);
    res.json({ success: true, data: semesters.map(semesterSelect), pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get all semesters error:');
  }
};

const getRegistrationOptions = async (req, res) => {
  try {
    // 1. Find the currently ongoing semester (only one should be active at a time)
    const ongoingSemester = await prisma.HOCKY.findFirst({
      where: {
        DaXoa: false,
        TrangThai: 'Đang diễn ra'
      },
      include: { NAMHOC: true }
    });

    if (ongoingSemester) {
      // If there is an ongoing semester, students can only register for this one!
      return res.json({ success: true, data: [semesterSelect(ongoingSemester)] });
    }

    // 2. Fallback: if no ongoing semester, return semesters that are 'Sắp diễn ra'
    const upcomingSemesters = await prisma.HOCKY.findMany({
      where: {
        DaXoa: false,
        TrangThai: 'Sắp diễn ra'
      },
      orderBy: [{ NgayBatDau: 'asc' }, { MaHocKy: 'asc' }],
      include: { NAMHOC: true }
    });

    if (upcomingSemesters.length) {
      return res.json({ success: true, data: upcomingSemesters.map(semesterSelect) });
    }

    const fallbackSemesters = await prisma.HOCKY.findMany({
      where: { DaXoa: false },
      take: 5,
      orderBy: [{ NgayBatDau: 'desc' }, { MaHocKy: 'desc' }],
      include: { NAMHOC: true }
    });
    res.json({ success: true, data: fallbackSemesters.map(semesterSelect).reverse() });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get registration options error:');
  }
};

const getActiveSemester = async (req, res) => {
  try {
    let hk = await prisma.HOCKY.findFirst({ where: { ...notDeleted(), OR: [{ TrangThai: 'Đang diễn ra' }, { TrangThai: 'Đang hoạt động' }] }, include: { NAMHOC: true } });
    if (!hk) hk = await prisma.HOCKY.findFirst({ where: { ...notDeleted(), OR: [{ TrangThai: 'Sắp diễn ra' }, { TrangThai: 'Sắp tới' }] }, include: { NAMHOC: true }, orderBy: { NgayBatDau: 'asc' } });
    if (!hk) return res.status(404).json({ success: false, message: 'Khong co hoc ky nao dang hoat dong' });
    res.json({ success: true, data: semesterSelect(hk) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get active semester error:');
  }
};

const getSemesterById = async (req, res) => {
  try {
    const hk = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false }, include: { NAMHOC: true, LOPMO: true, PHIEUDANGKY: true } });
    if (!hk) return res.status(404).json({ success: false, message: 'Khong tim thay hoc ky' });
    res.json({ success: true, data: { ...semesterSelect(hk), stats: { openedClasses: hk.LOPMO.length, registrations: hk.PHIEUDANGKY.length } } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get semester by ID error:');
  }
};

const createSemester = async (req, res) => {
  try {
    const { MaHocKy, TenHocKy, MaNamHoc, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, NgayBatDauDangKy, NgayKetThucDangKy, HanDongHocPhi, TrangThai } = req.body;
    if (!MaHocKy || !TenHocKy || !MaNamHoc) return res.status(400).json({ success: false, message: 'Vui long nhap day du thong tin' });
    const existing = await prisma.HOCKY.findUnique({ where: { MaHocKy } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Ma hoc ky da ton tai' });
    const semester = await prisma.HOCKY.create({
      data: {
        MaHocKy,
        TenHocKy,
        MaNamHoc,
        LoaiHocKy,
        ThuTu: ThuTu ? parseInt(ThuTu, 10) : 1,
        NgayBatDau: NgayBatDau ? new Date(NgayBatDau) : null,
        NgayKetThuc: NgayKetThuc ? new Date(NgayKetThuc) : null,
        NgayBatDauDangKy: NgayBatDauDangKy ? new Date(NgayBatDauDangKy) : null,
        NgayKetThucDangKy: NgayKetThucDangKy ? new Date(NgayKetThucDangKy) : null,
        HanDongHocPhi: HanDongHocPhi ? new Date(HanDongHocPhi) : null,
        TrangThai: TrangThai || 'Sắp diễn ra',
        ...updateAudit(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tao hoc ky thanh cong', data: semester });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Create semester error:');
  }
};

const updateSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay hoc ky' });
    const { TenHocKy, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, NgayBatDauDangKy, NgayKetThucDangKy, HanDongHocPhi, TrangThai } = req.body;
    const data = {};
    if (TenHocKy) data.TenHocKy = TenHocKy;
    if (LoaiHocKy) data.LoaiHocKy = LoaiHocKy;
    if (ThuTu !== undefined) data.ThuTu = parseInt(ThuTu, 10);
    if (TrangThai) data.TrangThai = TrangThai;
    if (NgayBatDau !== undefined) data.NgayBatDau = NgayBatDau ? new Date(NgayBatDau) : null;
    if (NgayKetThuc !== undefined) data.NgayKetThuc = NgayKetThuc ? new Date(NgayKetThuc) : null;
    if (NgayBatDauDangKy !== undefined) data.NgayBatDauDangKy = NgayBatDauDangKy ? new Date(NgayBatDauDangKy) : null;
    if (NgayKetThucDangKy !== undefined) data.NgayKetThucDangKy = NgayKetThucDangKy ? new Date(NgayKetThucDangKy) : null;
    if (HanDongHocPhi !== undefined) data.HanDongHocPhi = HanDongHocPhi ? new Date(HanDongHocPhi) : null;
    Object.assign(data, updateAudit(req));
    const updated = await prisma.HOCKY.update({ where: { MaHocKy: req.params.id }, data });
    res.json({ success: true, message: 'Cap nhat hoc ky thanh cong', data: updated });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Update semester error:');
  }
};

const deleteSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay hoc ky' });
    await prisma.HOCKY.update({ where: { MaHocKy: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Da chuyen hoc ky vao thung rac' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Delete semester error:');
  }
};

const getAcademicYears = async (req, res) => {
  try {
    const years = await prisma.NAMHOC.findMany({ where: { TrangThai: true }, orderBy: { TenNamHoc: 'desc' } });
    res.json({ success: true, data: years });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'Get academic years error:');
  }
};

module.exports = {
  getAllSemesters,
  getRegistrationOptions,
  getActiveSemester,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
  getAcademicYears
};
