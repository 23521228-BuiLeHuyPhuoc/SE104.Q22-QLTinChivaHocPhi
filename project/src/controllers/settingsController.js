const prisma = require('../config/database');
const { sendErrorResponse } = require('../utils/errorHandler');

const SETTING_IMPACTS = [
  {
    key: 'SoTinChiDangKyToiThieu',
    label: 'Số tín chỉ tối thiểu / kỳ',
    constraint: 'Luồng thanh toán học phí kiểm tra phiếu đăng ký đã đạt số tín chỉ tối thiểu sau khi đăng ký được chốt.'
  },
  {
    key: 'SoTinChiDangKyToiDa',
    label: 'Số tín chỉ tối đa / kỳ',
    constraint: 'Luồng đăng ký môn chặn đăng ký thêm khi tổng tín chỉ vượt giới hạn thông thường.'
  },
  {
    key: 'SoTinChiDangKyToiDaKhiVuot',
    label: 'Số tín chỉ tối đa khi vượt',
    constraint: 'Luồng đăng ký môn chặn tuyệt đối khi tổng tín chỉ vượt giới hạn hệ thống cho phép.'
  },
  {
    key: 'DanhSachMonAnhVanBatBuoc',
    label: 'Mã môn Anh văn bắt buộc',
    constraint: 'Luồng đăng ký môn kiểm tra MONDAHOC theo danh sách này để xác định sinh viên đã hoàn tất Anh văn hay chưa.'
  },
  {
    key: 'NamKiemTraAnhVan',
    label: 'Năm kiểm tra Anh văn',
    constraint: 'Luồng đăng ký môn bắt đầu áp dụng giới hạn Anh văn sau mốc số năm này tính từ ngày nhập học.'
  },
  {
    key: 'GioiHanTinChiChuaDatAnhVan',
    label: 'Giới hạn tín chỉ khi chưa đạt Anh văn',
    constraint: 'Luồng đăng ký môn hạ trần tín chỉ xuống giá trị này nếu sinh viên đã tới mốc kiểm tra nhưng chưa qua đủ môn Anh văn bắt buộc.'
  },
  {
    key: 'GioiHanTinChiNoKhoaLuan',
    label: 'Tín chỉ nợ tối đa khi đăng ký khóa luận',
    constraint: 'curriculumService.getThesisEligibility dùng giá trị này để xác định đủ điều kiện đăng ký khóa luận.'
  }
];

const parseRequiredInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
};

const normalizeEnglishCourseList = (value) => String(value || 'ENG01,ENG02,ENG03')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .filter((item, index, arr) => arr.indexOf(item) === index);

const getSettings = async (req, res) => {
  try {
    const settings = await prisma.THAMSO.findFirst();
    res.json({ success: true, data: settings, impacts: SETTING_IMPACTS });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'getSettings error:');
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
      GioiHanTinChiChuaDatAnhVan,
      GioiHanTinChiNoKhoaLuan
    } = req.body;

    const toiThieu = parseRequiredInteger(SoTinChiDangKyToiThieu);
    const toiDa = parseRequiredInteger(SoTinChiDangKyToiDa);
    const toiDaVuot = parseRequiredInteger(SoTinChiDangKyToiDaKhiVuot);
    const englishCourses = normalizeEnglishCourseList(DanhSachMonAnhVanBatBuoc);
    const englishList = englishCourses.join(',');
    const namKiemTra = parseRequiredInteger(NamKiemTraAnhVan);
    const gioiHanAnhVan = parseRequiredInteger(GioiHanTinChiChuaDatAnhVan);
    const gioiHanNoKhoaLuan = GioiHanTinChiNoKhoaLuan === undefined || GioiHanTinChiNoKhoaLuan === null || GioiHanTinChiNoKhoaLuan === ''
      ? 8
      : parseRequiredInteger(GioiHanTinChiNoKhoaLuan);

    if (!Number.isInteger(toiThieu) || toiThieu < 1) return res.status(400).json({ success: false, message: 'Số tín chỉ tối thiểu phải là số nguyên >= 1' });
    if (!Number.isInteger(toiDa) || toiDa <= toiThieu) return res.status(400).json({ success: false, message: 'Số tín chỉ tối đa phải là số nguyên > tối thiểu' });
    if (!Number.isInteger(toiDaVuot) || toiDaVuot < toiDa) return res.status(400).json({ success: false, message: 'Số tín chỉ tối đa khi vượt phải là số nguyên >= tối đa' });
    if (!englishCourses.length) return res.status(400).json({ success: false, message: 'Danh sách môn Anh văn không được rỗng' });
    if (!Number.isInteger(namKiemTra) || namKiemTra < 1) return res.status(400).json({ success: false, message: 'Năm kiểm tra Anh văn phải là số nguyên >= 1' });
    if (!Number.isInteger(gioiHanAnhVan) || gioiHanAnhVan < 1 || gioiHanAnhVan > toiDa) return res.status(400).json({ success: false, message: 'Giới hạn tín chỉ khi chưa đạt Anh văn phải từ 1 đến số tín chỉ tối đa' });
    if (!Number.isInteger(gioiHanNoKhoaLuan) || gioiHanNoKhoaLuan < 0) return res.status(400).json({ success: false, message: 'Giới hạn tín chỉ nợ khóa luận phải là số nguyên không âm' });

    const existingEnglishCourses = await prisma.MONHOC.findMany({
      where: { MaMonHoc: { in: englishCourses }, DaXoa: false, TrangThai: true },
      select: { MaMonHoc: true }
    });
    const existingCodes = new Set(existingEnglishCourses.map((course) => course.MaMonHoc));
    const missingCodes = englishCourses.filter((code) => !existingCodes.has(code));
    if (missingCodes.length) {
      return res.status(400).json({ success: false, message: `Mã môn Anh văn không tồn tại hoặc đã ngừng sử dụng: ${missingCodes.join(', ')}` });
    }

    const data = {
      SoTinChiDangKyToiThieu: toiThieu,
      SoTinChiDangKyToiDa: toiDa,
      SoTinChiDangKyToiDaKhiVuot: toiDaVuot,
      DanhSachMonAnhVanBatBuoc: englishList,
      NamKiemTraAnhVan: namKiemTra,
      GioiHanTinChiChuaDatAnhVan: gioiHanAnhVan,
      GioiHanTinChiNoKhoaLuan: gioiHanNoKhoaLuan,
      NgayCapNhat: new Date()
    };

    const existing = await prisma.THAMSO.findFirst();
    const settings = existing
      ? await prisma.THAMSO.update({ where: { id: existing.id }, data })
      : await prisma.THAMSO.create({ data: { id: 1, ...data } });

    res.json({ success: true, message: 'Cập nhật tham số thành công', data: settings, impacts: SETTING_IMPACTS });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'updateSettings error:');
  }
};

module.exports = { getSettings, updateSettings, SETTING_IMPACTS };
