const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const getAllBeneficiaries = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = notDeleted();
    const [beneficiaries, total] = await Promise.all([
      prisma.DOITUONG.findMany({ where, skip, take: limit, orderBy: { DoUuTien: 'asc' }, include: { _count: { select: { DOITUONGSINHVIEN: true } } } }),
      prisma.DOITUONG.count({ where })
    ]);
    res.json({ success: true, data: beneficiaries, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'getAllBeneficiaries error:');
  }
};

const createBeneficiary = async (req, res) => {
  try {
    const { MaDoiTuong, TenDoiTuong, TiLeGiamHocPhi, DoUuTien, MoTa } = req.body;
    if (!MaDoiTuong || !TenDoiTuong || TiLeGiamHocPhi === undefined || !DoUuTien) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const existing = await prisma.DOITUONG.findUnique({ where: { MaDoiTuong } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã đối tượng đã tồn tại' });
    const obj = await prisma.DOITUONG.create({
      data: { MaDoiTuong, TenDoiTuong, TiLeGiamHocPhi: parseFloat(TiLeGiamHocPhi), DoUuTien: parseInt(DoUuTien, 10), MoTa, ...updateAudit(req) }
    });
    res.status(201).json({ success: true, message: 'Tạo đối tượng thành công', data: obj });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'createBeneficiary error:');
  }
};

const updateBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenDoiTuong, TiLeGiamHocPhi, DoUuTien, MoTa, TrangThai } = req.body;
    const data = updateAudit(req);
    if (TenDoiTuong) data.TenDoiTuong = TenDoiTuong;
    if (TiLeGiamHocPhi !== undefined) data.TiLeGiamHocPhi = parseFloat(TiLeGiamHocPhi);
    if (DoUuTien !== undefined) data.DoUuTien = parseInt(DoUuTien, 10);
    if (MoTa !== undefined) data.MoTa = MoTa;
    if (TrangThai !== undefined) data.TrangThai = TrangThai;
    const obj = await prisma.DOITUONG.update({ where: { MaDoiTuong: id }, data });
    res.json({ success: true, message: 'Cập nhật đối tượng thành công', data: obj });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'updateBeneficiary error:');
  }
};

const deleteBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.DOITUONG.findFirst({ where: { MaDoiTuong: id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy đối tượng' });
    await prisma.DOITUONG.update({ where: { MaDoiTuong: id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển đối tượng vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'deleteBeneficiary error:');
  }
};

const getBeneficiaryStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const students = await prisma.DOITUONGSINHVIEN.findMany({
      where: { MaDoiTuong: id, SINHVIEN: { DaXoa: false } },
      include: { SINHVIEN: { select: { MaSv: true, HoTen: true, Email: true, MaNgành: true, TrangThai: true } } },
      orderBy: { NgayTao: 'desc' }
    });
    res.json({ success: true, data: students });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'getBeneficiaryStudents error:');
  }
};

const addStudentToBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const { MaSv, GhiChu } = req.body;
    if (!MaSv) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã sinh viên' });
    const sv = await prisma.SINHVIEN.findFirst({ where: { MaSv, DaXoa: false } });
    if (!sv) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    const record = await prisma.DOITUONGSINHVIEN.create({ data: { MaSv, MaDoiTuong: id, GhiChu } });
    res.status(201).json({ success: true, message: 'Thêm sinh viên vào đối tượng thành công', data: record });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ success: false, message: 'Sinh viên đã thuộc đối tượng này' });
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'addStudentToBeneficiary error:');
  }
};

const removeStudentFromBeneficiary = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    await prisma.DOITUONGSINHVIEN.deleteMany({ where: { MaDoiTuong: id, MaSv: studentId } });
    res.json({ success: true, message: 'Xoa sinh viên khoi doi tuong thanh cong' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi máy chủ', 'removeStudentFromBeneficiary error:');
  }
};

module.exports = {
  getAllBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  getBeneficiaryStudents,
  addStudentToBeneficiary,
  removeStudentFromBeneficiary
};
