const prisma = require('../config/database');

const getAllPricing = async (req, res) => {
  try {
    const { LoaiMon, MaHocKy } = req.query;
    const where = {};
    if (LoaiMon) where.LoaiMon = LoaiMon;
    if (MaHocKy) where.MaHocKy = MaHocKy;
    const pricing = await prisma.DONGIATINCHI.findMany({
      where,
      orderBy: { id: 'desc' },
      include: { HOCKY: true }
    });
    res.json({ success: true, data: pricing });
  } catch (error) {
    console.error('getAllPricing error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const createPricing = async (req, res) => {
  try {
    const { LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu } = req.body;
    if (!LoaiMon || !LoaiHoc || !DonGia) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const pricing = await prisma.DONGIATINCHI.create({
      data: {
        LoaiMon,
        LoaiHoc: LoaiHoc || 'hoc_moi',
        DonGia: parseInt(DonGia),
        MaHocKy: MaHocKy || null,
        GhiChu
      }
    });
    res.status(201).json({ success: true, message: 'Tạo đơn giá thành công', data: pricing });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Đơn giá cho loại môn và loại học này đã tồn tại' });
    }
    console.error('createPricing error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updatePricing = async (req, res) => {
  try {
    const { id } = req.params;
    const { LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu } = req.body;
    const data = {};
    if (LoaiMon) data.LoaiMon = LoaiMon;
    if (LoaiHoc) data.LoaiHoc = LoaiHoc;
    if (DonGia !== undefined) data.DonGia = parseInt(DonGia);
    if (MaHocKy !== undefined) data.MaHocKy = MaHocKy || null;
    if (GhiChu !== undefined) data.GhiChu = GhiChu;
    const pricing = await prisma.DONGIATINCHI.update({
      where: { id: parseInt(id) },
      data
    });
    res.json({ success: true, message: 'Cập nhật đơn giá thành công', data: pricing });
  } catch (error) {
    console.error('updatePricing error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const deletePricing = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.DONGIATINCHI.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Xóa đơn giá thành công' });
  } catch (error) {
    console.error('deletePricing error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getAllPricing, createPricing, updatePricing, deletePricing };
