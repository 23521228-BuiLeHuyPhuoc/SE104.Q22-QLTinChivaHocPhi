const prisma = require('../config/database');

const getAllBeneficiaries = async (req, res) => {
  try {
    const beneficiaries = await prisma.DOITUONG.findMany({
      orderBy: { DoUuTien: 'asc' },
      include: { _count: { select: { DOITUONGSINHVIEN: true } } }
    });
    res.json({ success: true, data: beneficiaries });
  } catch (error) {
    console.error('getAllBeneficiaries error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createBeneficiary = async (req, res) => {
  try {
    const { MaDoiTuong, TenDoiTuong, TiLeGiamHocPhi, DoUuTien, MoTa } = req.body;
    if (!MaDoiTuong || !TenDoiTuong || TiLeGiamHocPhi === undefined || !DoUuTien) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const existing = await prisma.DOITUONG.findUnique({ where: { MaDoiTuong } });
    if (existing) return res.status(400).json({ success: false, message: 'Mã đối tượng đã tồn tại' });
    const obj = await prisma.DOITUONG.create({
      data: { MaDoiTuong, TenDoiTuong, TiLeGiamHocPhi: parseFloat(TiLeGiamHocPhi), DoUuTien: parseInt(DoUuTien), MoTa }
    });
    res.status(201).json({ success: true, message: 'Tạo đối tượng thành công', data: obj });
  } catch (error) {
    console.error('createBeneficiary error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenDoiTuong, TiLeGiamHocPhi, DoUuTien, MoTa } = req.body;
    const data = {};
    if (TenDoiTuong) data.TenDoiTuong = TenDoiTuong;
    if (TiLeGiamHocPhi !== undefined) data.TiLeGiamHocPhi = parseFloat(TiLeGiamHocPhi);
    if (DoUuTien !== undefined) data.DoUuTien = parseInt(DoUuTien);
    if (MoTa !== undefined) data.MoTa = MoTa;
    const obj = await prisma.DOITUONG.update({ where: { MaDoiTuong: id }, data });
    res.json({ success: true, message: 'Cập nhật đối tượng thành công', data: obj });
  } catch (error) {
    console.error('updateBeneficiary error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deleteBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const count = await prisma.DOITUONGSINHVIEN.count({ where: { MaDoiTuong: id } });
    if (count > 0) {
      return res.status(400).json({ success: false, message: `Đối tượng đang có ${count} sinh viên, không thể xóa` });
    }
    await prisma.DOITUONG.delete({ where: { MaDoiTuong: id } });
    res.json({ success: true, message: 'Xóa đối tượng thành công' });
  } catch (error) {
    console.error('deleteBeneficiary error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getBeneficiaryStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const students = await prisma.DOITUONGSINHVIEN.findMany({
      where: { MaDoiTuong: id },
      include: { SINHVIEN: { select: { MaSv: true, HoTen: true, Email: true, MaNganh: true, TrangThai: true } } },
      orderBy: { NgayTao: 'desc' }
    });
    res.json({ success: true, data: students });
  } catch (error) {
    console.error('getBeneficiaryStudents error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const addStudentToBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const { MaSv, GhiChu } = req.body;
    if (!MaSv) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã sinh viên' });
    const sv = await prisma.SINHVIEN.findUnique({ where: { MaSv } });
    if (!sv) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    const record = await prisma.DOITUONGSINHVIEN.create({
      data: { MaSv, MaDoiTuong: id, GhiChu }
    });
    res.status(201).json({ success: true, message: 'Thêm sinh viên vào đối tượng thành công', data: record });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Sinh viên đã thuộc đối tượng này' });
    }
    console.error('addStudentToBeneficiary error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const removeStudentFromBeneficiary = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    await prisma.DOITUONGSINHVIEN.deleteMany({
      where: { MaDoiTuong: id, MaSv: studentId }
    });
    res.json({ success: true, message: 'Xóa sinh viên khỏi đối tượng thành công' });
  } catch (error) {
    console.error('removeStudentFromBeneficiary error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  getAllBeneficiaries, createBeneficiary, updateBeneficiary, deleteBeneficiary,
  getBeneficiaryStudents, addStudentToBeneficiary, removeStudentFromBeneficiary
};
