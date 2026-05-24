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
    const { SoTinChiDangKyToiThieu, SoTinChiDangKyToiDa, SoTinChiDangKyToiDaKhiVuot } = req.body;

    const toiThieu = parseInt(SoTinChiDangKyToiThieu);
    const toiDa = parseInt(SoTinChiDangKyToiDa);
    const toiDaVuot = parseInt(SoTinChiDangKyToiDaKhiVuot);

    if (toiThieu < 1) return res.status(400).json({ success: false, message: 'Số tín chỉ tối thiểu phải >= 1' });
    if (toiDa <= toiThieu) return res.status(400).json({ success: false, message: 'Số tín chỉ tối đa phải > tối thiểu' });
    if (toiDaVuot < toiDa) return res.status(400).json({ success: false, message: 'Số tín chỉ tối đa khi vượt phải >= tối đa' });

    const existing = await prisma.THAMSO.findFirst();
    let settings;
    if (existing) {
      settings = await prisma.THAMSO.update({
        where: { id: existing.id },
        data: {
          SoTinChiDangKyToiThieu: toiThieu,
          SoTinChiDangKyToiDa: toiDa,
          SoTinChiDangKyToiDaKhiVuot: toiDaVuot,
          NgayCapNhat: new Date()
        }
      });
    } else {
      settings = await prisma.THAMSO.create({
        data: {
          id: 1,
          SoTinChiDangKyToiThieu: toiThieu,
          SoTinChiDangKyToiDa: toiDa,
          SoTinChiDangKyToiDaKhiVuot: toiDaVuot
        }
      });
    }
    res.json({ success: true, message: 'Cập nhật tham số thành công', data: settings });
  } catch (error) {
    console.error('updateSettings error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getSettings, updateSettings };
