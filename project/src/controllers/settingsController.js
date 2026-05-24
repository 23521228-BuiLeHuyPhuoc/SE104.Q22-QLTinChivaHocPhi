const prisma = require('../config/database');

const getSettings = async (req, res) => {
  try {
    const settings = await prisma.THAMSO.findFirst();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('getSettings error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const {
      SoTinChiDangKyToiThieu,
      SoTinChiDangKyToiDa,
      SoTinChiDangKyToiDaKhiVuot,
      DanhSachMonAnhVanBatBuoc,
      NamKiemTraAnhVan,
      GioiHanTinChiChuaDatAnhVan
    } = req.body;

    const toiThieu = parseInt(SoTinChiDangKyToiThieu, 10);
    const toiDa = parseInt(SoTinChiDangKyToiDa, 10);
    const toiDaVuot = parseInt(SoTinChiDangKyToiDaKhiVuot, 10);
    const englishList = String(DanhSachMonAnhVanBatBuoc || 'ENG01,ENG02,ENG03').split(',').map((item) => item.trim()).filter(Boolean).join(',');
    const namKiemTra = parseInt(NamKiemTraAnhVan, 10) || 2;
    const gioiHanAnhVan = parseInt(GioiHanTinChiChuaDatAnhVan, 10) || 14;

    if (toiThieu < 1) return res.status(400).json({ success: false, message: 'Số tín chỉ tối thiểu phải >= 1' });
    if (toiDa <= toiThieu) return res.status(400).json({ success: false, message: 'Số tín chỉ tối đa phải > tối thiểu' });
    if (toiDaVuot < toiDa) return res.status(400).json({ success: false, message: 'Số tín chỉ tối đa khi vượt phải >= tối đa' });
    if (!englishList) return res.status(400).json({ success: false, message: 'Danh sách môn Anh văn không được rỗng' });

    const data = {
      SoTinChiDangKyToiThieu: toiThieu,
      SoTinChiDangKyToiDa: toiDa,
      SoTinChiDangKyToiDaKhiVuot: toiDaVuot,
      DanhSachMonAnhVanBatBuoc: englishList,
      NamKiemTraAnhVan: namKiemTra,
      GioiHanTinChiChuaDatAnhVan: gioiHanAnhVan,
      NgayCapNhat: new Date()
    };

    const existing = await prisma.THAMSO.findFirst();
    const settings = existing
      ? await prisma.THAMSO.update({ where: { id: existing.id }, data })
      : await prisma.THAMSO.create({ data: { id: 1, ...data } });

    res.json({ success: true, message: 'Cập nhật tham số thành công', data: settings });
  } catch (error) {
    console.error('updateSettings error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getSettings, updateSettings };
