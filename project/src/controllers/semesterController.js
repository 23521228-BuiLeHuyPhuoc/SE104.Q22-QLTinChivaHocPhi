const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');

const semesterSelect = (hk) => ({
  MaHocKy: hk.MaHocKy,
  TenHocKy: hk.TenHocKy,
  MaNamHoc: hk.MaNamHoc,
  TenNamHoc: hk.NAMHOC?.TenNamHoc,
  LoaiHocKy: hk.LoaiHocKy,
  ThuTu: hk.ThuTu,
  NgayBatDau: hk.NgayBatDau,
  NgayKetThuc: hk.NgayKetThuc,
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
    console.error('Get all semesters error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
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
    console.error('Get registration options error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getActiveSemester = async (req, res) => {
  try {
    let hk = await prisma.HOCKY.findFirst({ where: { ...notDeleted(), OR: [{ TrangThai: 'Đang diễn ra' }, { TrangThai: 'Đang hoạt động' }] }, include: { NAMHOC: true } });
    if (!hk) hk = await prisma.HOCKY.findFirst({ where: { ...notDeleted(), OR: [{ TrangThai: 'Sắp diễn ra' }, { TrangThai: 'Sắp tới' }] }, include: { NAMHOC: true }, orderBy: { NgayBatDau: 'asc' } });
    if (!hk) return res.status(404).json({ success: false, message: 'Không có học kỳ nào đang hoạt động' });
    res.json({ success: true, data: semesterSelect(hk) });
  } catch (error) {
    console.error('Get active semester error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getSemesterById = async (req, res) => {
  try {
    const hk = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false }, include: { NAMHOC: true, LOPMO: true, PHIEUDANGKY: true } });
    if (!hk) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    res.json({ success: true, data: { ...semesterSelect(hk), stats: { openedClasses: hk.LOPMO.length, registrations: hk.PHIEUDANGKY.length } } });
  } catch (error) {
    console.error('Get semester by ID error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createSemester = async (req, res) => {
  try {
    const { MaHocKy, TenHocKy, MaNamHoc, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, NgayBatDauDangKy, NgayKetThucDangKy, HanDongHocPhi, TrangThai } = req.body;
    if (!MaHocKy || !TenHocKy || !MaNamHoc) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    const existing = await prisma.HOCKY.findUnique({ where: { MaHocKy } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã học kỳ đã tồn tại' });
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
    res.status(201).json({ success: true, message: 'Tạo học kỳ thành công', data: semester });
  } catch (error) {
    console.error('Create semester error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
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
    res.json({ success: true, message: 'Cập nhật học kỳ thành công', data: updated });
  } catch (error) {
    console.error('Update semester error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    await prisma.HOCKY.update({ where: { MaHocKy: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển học kỳ vào thùng rác' });
  } catch (error) {
    console.error('Delete semester error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getAcademicYears = async (req, res) => {
  try {
    const years = await prisma.NAMHOC.findMany({ where: { TrangThai: true }, orderBy: { TenNamHoc: 'desc' } });
    res.json({ success: true, data: years });
  } catch (error) {
    console.error('Get academic years error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
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
