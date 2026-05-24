const prisma = require('../config/database');

const getStudentIdFromRequest = async (req) => {
  if (req.user?.Role === 'admin') return null;
  if (req.user?.MaSv) return req.user.MaSv;
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaTaiKhoan: Number(req.user?.MaTaiKhoan || req.user?.id || 0) },
    select: { MaSv: true }
  });
  return student?.MaSv || null;
};

const ensureStudentAccess = async (req, res, studentId) => {
  if (req.user?.Role === 'admin') return true;
  const currentStudentId = await getStudentIdFromRequest(req);
  if (currentStudentId && currentStudentId === studentId) return true;
  res.status(403).json({ success: false, message: 'Không có quyền truy cập dữ liệu sinh viên này' });
  return false;
};

const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', MaHocKy, HinhThucThu, TrangThai } = req.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (HinhThucThu) where.HinhThucThu = HinhThucThu;
    if (TrangThai) where.TrangThai = TrangThai;
    if (MaHocKy) where.PHIEUDANGKY = { MaHocKy };
    if (search) { where.SINHVIEN = { OR: [{ MaSv: { contains: search, mode: 'insensitive' } }, { HoTen: { contains: search, mode: 'insensitive' } }] }; }

    const [rows, total] = await Promise.all([
      prisma.PHIEUTHUHOCPHI.findMany({ where, skip, take: parseInt(limit), orderBy: { NgayLap: 'desc' }, include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } } }),
      prisma.PHIEUTHUHOCPHI.count({ where })
    ]);
    const data = rows.map(p => ({ SoPhieuThu: p.SoPhieuThu, MaSv: p.MaSv, HoTen: p.SINHVIEN.HoTen, Email: p.SINHVIEN.Email, MaHocKy: p.PHIEUDANGKY.MaHocKy, TenHocKy: p.PHIEUDANGKY.HOCKY.TenHocKy, TenNamHoc: p.PHIEUDANGKY.HOCKY.NAMHOC.TenNamHoc, SoTienThu: Number(p.SoTienThu), HinhThucThu: p.HinhThucThu, NgayLap: p.NgayLap, NguoiThu: p.NguoiThu, GhiChu: p.GhiChu, TrangThai: p.TrangThai }));
    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { console.error('Get all payments error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getPaymentById = async (req, res) => {
  try {
    const p = await prisma.PHIEUTHUHOCPHI.findUnique({ where: { SoPhieuThu: parseInt(req.params.id) }, include: { SINHVIEN: true, PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } } });
    if (!p) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    res.json({ success: true, data: { SoPhieuThu: p.SoPhieuThu, MaSv: p.MaSv, HoTen: p.SINHVIEN.HoTen, SoTienThu: Number(p.SoTienThu), HinhThucThu: p.HinhThucThu, NgayLap: p.NgayLap, NguoiThu: p.NguoiThu, GhiChu: p.GhiChu, TrangThai: p.TrangThai } });
  } catch (error) { console.error('Get payment by ID error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getStudentPayments = async (req, res) => {
  try {
    if (!(await ensureStudentAccess(req, res, req.params.studentId))) return;
    const rows = await prisma.PHIEUTHUHOCPHI.findMany({ where: { MaSv: req.params.studentId }, orderBy: { NgayLap: 'desc' }, include: { PHIEUDANGKY: { include: { HOCKY: { include: { NAMHOC: true } } } } } });
    res.json({ success: true, data: rows.map(p => ({ SoPhieuThu: p.SoPhieuThu, MaHocKy: p.PHIEUDANGKY.MaHocKy, TenHocKy: p.PHIEUDANGKY.HOCKY.TenHocKy, SoTienThu: Number(p.SoTienThu), HinhThucThu: p.HinhThucThu, NgayLap: p.NgayLap, GhiChu: p.GhiChu, TrangThai: p.TrangThai })) });
  } catch (error) { console.error('Get student payments error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const createPayment = async (req, res) => {
  try {
    const { MaSv, MaHocKy, SoTienThu, HinhThucThu = 'Tiền mặt', GhiChu } = req.body;
    const NguoiThu = req.user?.HoTen || 'Admin';
    if (!MaSv || !MaHocKy || !SoTienThu) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });

    const phieu = await prisma.PHIEUDANGKY.findFirst({ where: { MaSv, MaHocKy } });
    if (!phieu) return res.status(404).json({ success: false, message: 'Sinh viên chưa đăng ký trong học kỳ này' });

    const payment = await prisma.PHIEUTHUHOCPHI.create({ data: { SoPhieuDangKy: phieu.SoPhieu, MaSv, SoTienThu: parseFloat(SoTienThu), HinhThucThu, NguoiThu, GhiChu, TrangThai: 'Thành công' } });
    res.status(201).json({ success: true, message: 'Tạo phiếu thu thành công', data: payment });
  } catch (error) { console.error('Create payment error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const cancelPayment = async (req, res) => {
  try {
    const existing = await prisma.PHIEUTHUHOCPHI.findUnique({ where: { SoPhieuThu: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    await prisma.PHIEUTHUHOCPHI.update({ where: { SoPhieuThu: parseInt(req.params.id) }, data: { TrangThai: 'Đã hủy' } });
    res.json({ success: true, message: 'Hủy phiếu thu thành công' });
  } catch (error) { console.error('Cancel payment error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getPaymentStats = async (req, res) => {
  try {
    const where = { TrangThai: 'Thành công' };
    if (req.query.MaHocKy) where.PHIEUDANGKY = { MaHocKy: req.query.MaHocKy };
    const rows = await prisma.PHIEUTHUHOCPHI.findMany({ where });
    const totalAmount = rows.reduce((s, p) => s + Number(p.SoTienThu), 0);
    const byMethodMap = rows.reduce((acc, p) => {
      const key = p.HinhThucThu || 'Khác';
      if (!acc[key]) acc[key] = { HinhThucThu: key, count: 0, total: 0 };
      acc[key].count += 1;
      acc[key].total += Number(p.SoTienThu);
      return acc;
    }, {});
    res.json({ success: true, data: { totalReceipts: rows.length, totalAmount, byMethod: Object.values(byMethodMap) } });
  } catch (error) { console.error('Get payment stats error:', error); res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

module.exports = { getAllPayments, getPaymentById, getStudentPayments, createPayment, cancelPayment, getPaymentStats };
