const prisma = require('../config/database');
const { sendErrorResponse } = require('../utils/errorHandler');

const getSettings = async (req, res) => {
  try {
    const settings = await prisma.THAMSO.findFirst();
    res.json({ success: true, data: settings });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'getSettings error:');
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

    if (toiThieu < 1) return res.status(400).json({ success: false, message: 'So tin chi toi thieu phai >= 1' });
    if (toiDa <= toiThieu) return res.status(400).json({ success: false, message: 'So tin chi toi da phai > toi thieu' });
    if (toiDaVuot < toiDa) return res.status(400).json({ success: false, message: 'So tin chi toi da khi vuot phai >= toi da' });
    if (!englishList) return res.status(400).json({ success: false, message: 'Danh sach mon Anh van khong duoc rong' });

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

    res.json({ success: true, message: 'Cap nhat tham so thanh cong', data: settings });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'updateSettings error:');
  }
};

module.exports = { getSettings, updateSettings };
