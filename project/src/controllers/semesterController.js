const prisma = require('../config/database');

const getAllSemesters = async (req, res) => {
  try {
    const semesters = await prisma.HOCKY.findMany({ include: { NAMHOC: true }, orderBy: [{ NAMHOC: { TenNamHoc: 'desc' } }, { ThuTu: 'asc' }] });
    res.json({ success: true, data: semesters.map(hk => ({ MaHocKy: hk.MaHocKy, TenHocKy: hk.TenHocKy, MaNamHoc: hk.MaNamHoc, TenNamHoc: hk.NAMHOC.TenNamHoc, LoaiHocKy: hk.LoaiHocKy, ThuTu: hk.ThuTu, NgayBatDau: hk.NgayBatDau, NgayKetThuc: hk.NgayKetThuc, HanDongHocPhi: hk.HanDongHocPhi, TrangThai: hk.TrangThai })) });
  } catch (error) { console.error('Get all semesters error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getActiveSemester = async (req, res) => {
  try {
    let hk = await prisma.HOCKY.findFirst({ where: { OR: [{ TrangThai: 'Đang diễn ra' }, { TrangThai: 'Đang hoạt động' }] }, include: { NAMHOC: true } });
    if (!hk) hk = await prisma.HOCKY.findFirst({ where: { OR: [{ TrangThai: 'Sắp diễn ra' }, { TrangThai: 'Sắp tới' }] }, include: { NAMHOC: true }, orderBy: { NgayBatDau: 'asc' } });
    if (!hk) return res.status(404).json({ success: false, message: 'Không có học kỳ nào đang hoạt động' });
    res.json({ success: true, data: { MaHocKy: hk.MaHocKy, TenHocKy: hk.TenHocKy, TenNamHoc: hk.NAMHOC.TenNamHoc, TrangThai: hk.TrangThai } });
  } catch (error) { console.error('Get active semester error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getSemesterById = async (req, res) => {
  try {
    const hk = await prisma.HOCKY.findUnique({ where: { MaHocKy: req.params.id }, include: { NAMHOC: true, LOPMO: true, PHIEUDANGKY: true } });
    if (!hk) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    res.json({ success: true, data: { MaHocKy: hk.MaHocKy, TenHocKy: hk.TenHocKy, TenNamHoc: hk.NAMHOC.TenNamHoc, TrangThai: hk.TrangThai, NgayBatDau: hk.NgayBatDau, NgayKetThuc: hk.NgayKetThuc, stats: { openedClasses: hk.LOPMO.length, registrations: hk.PHIEUDANGKY.length } } });
  } catch (error) { console.error('Get semester by ID error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const createSemester = async (req, res) => {
  try {
    const { MaHocKy, TenHocKy, MaNamHoc, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, HanDongHocPhi, TrangThai } = req.body;
    if (!MaHocKy || !TenHocKy || !MaNamHoc) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    const existing = await prisma.HOCKY.findUnique({ where: { MaHocKy } });
    if (existing) return res.status(400).json({ success: false, message: 'Mã học kỳ đã tồn tại' });
    const semester = await prisma.HOCKY.create({ data: { MaHocKy, TenHocKy, MaNamHoc, LoaiHocKy, ThuTu: ThuTu ? parseInt(ThuTu) : 1, NgayBatDau: NgayBatDau ? new Date(NgayBatDau) : null, NgayKetThuc: NgayKetThuc ? new Date(NgayKetThuc) : null, HanDongHocPhi: HanDongHocPhi ? new Date(HanDongHocPhi) : null, TrangThai: TrangThai || 'Sắp diễn ra' } });
    res.status(201).json({ success: true, message: 'Tạo học kỳ thành công', data: semester });
  } catch (error) { console.error('Create semester error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const updateSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findUnique({ where: { MaHocKy: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    const { TenHocKy, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, HanDongHocPhi, TrangThai } = req.body;
    const data = {};
    if (TenHocKy) data.TenHocKy = TenHocKy; if (LoaiHocKy) data.LoaiHocKy = LoaiHocKy;
    if (ThuTu) data.ThuTu = parseInt(ThuTu); if (TrangThai) data.TrangThai = TrangThai;
    if (NgayBatDau) data.NgayBatDau = new Date(NgayBatDau); if (NgayKetThuc) data.NgayKetThuc = new Date(NgayKetThuc);
    if (HanDongHocPhi) data.HanDongHocPhi = new Date(HanDongHocPhi);
    const updated = await prisma.HOCKY.update({ where: { MaHocKy: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật học kỳ thành công', data: updated });
  } catch (error) { console.error('Update semester error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const deleteSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findUnique({ where: { MaHocKy: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    const openedCount = await prisma.LOPMO.count({ where: { MaHocKy: req.params.id } });
    if (openedCount > 0) return res.status(400).json({ success: false, message: 'Không thể xóa học kỳ đã có lớp mở' });
    await prisma.HOCKY.delete({ where: { MaHocKy: req.params.id } });
    res.json({ success: true, message: 'Xóa học kỳ thành công' });
  } catch (error) { console.error('Delete semester error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getAcademicYears = async (req, res) => {
  try {
    const years = await prisma.NAMHOC.findMany({ orderBy: { TenNamHoc: 'desc' } });
    res.json({ success: true, data: years });
  } catch (error) { console.error('Get academic years error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { getAllSemesters, getActiveSemester, getSemesterById, createSemester, updateSemester, deleteSemester, getAcademicYears };
