// Model: dinh dang du lieu lop hoc.
const periodLabel = (schedule) => {
  const start = schedule?.TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC?.TenTiet ||
    schedule?.TIETHOC_LOP_MaTietBatDauToTIETHOC?.TenTiet ||
    schedule?.MaTietBatDau;
  const end = schedule?.TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC?.TenTiet ||
    schedule?.TIETHOC_LOP_MaTietKetThucToTIETHOC?.TenTiet ||
    schedule?.MaTietKetThuc;
  if (!start && !end) return '';
  return start === end ? start : `${start}-${end}`;
};

const normalizeRoomText = (value, fallbackCode = '') => {
  const text = String(value || '').trim();
  const code = String(fallbackCode || '').trim();
  if (!text) return code || null;

  const parts = text.split(/\s+-\s+/);
  if (parts.length >= 2) {
    const first = parts[0].trim();
    const rest = parts.slice(1).join(' - ').trim();
    if (first && rest.toLowerCase().includes(first.toLowerCase())) return rest;
  }

  return text;
};

const roomLabel = (schedule) => {
  if (schedule?.PHONGHOC) {
    const code = String(schedule.PHONGHOC.MaPhong || '').trim();
    const name = String(schedule.PHONGHOC.TenPhong || '').trim();
    if (!code) return name;
    if (!name) return code;
    if (name.toLowerCase().includes(code.toLowerCase())) return name;
    return `${code} - ${name}`;
  }
  return normalizeRoomText(schedule?.PhongHoc, schedule?.MaPhong);
};

const scheduleLabel = (openedClass) => {
  const schedules = (openedClass?.LICHHOCLOP || []).filter((item) => item.TrangThai !== false);
  if (!schedules.length) return null;
  return schedules.map((schedule) => {
    const day = Number(schedule.ThuTrongTuan) === 1 ? 'Chu nhat' : `Thu ${schedule.ThuTrongTuan}`;
    const room = roomLabel(schedule);
    return [day, periodLabel(schedule)].filter(Boolean).join(' ') + (room ? ` (${room})` : '');
  }).join('; ');
};

const catalogScheduleLabel = (l) => {
  if (!l?.ThuTrongTuan || !l?.MaTietBatDau || !l?.MaTietKetThuc) return l?.LichHoc || null;
  const day = Number(l.ThuTrongTuan) === 1 ? 'Chu nhat' : `Thu ${l.ThuTrongTuan}`;
  const room = roomLabel(l);
  return [day, periodLabel(l)].filter(Boolean).join(' ') + (room ? ` (${room})` : '');
};

const formatClass = (l) => {
  const openedClass = l.LopMoHienTai || null;
  const firstSchedule = (openedClass?.LICHHOCLOP || []).find((item) => item.TrangThai !== false && roomLabel(item));

  return {
    MaLop: l.MaLop,
    TenLop: l.TenLop,
    MaMonHoc: l.MaMonHoc,
    MaGiangVien: openedClass?.MaGiangVien || l.MaGiangVien || null,
    GiangVien: openedClass?.GIANGVIEN
      ? [openedClass.GIANGVIEN.HocHamHocVi, openedClass.GIANGVIEN.HoTen].filter(Boolean).join(' ')
      : openedClass?.GiangVien || (l.GIANGVIEN ? [l.GIANGVIEN.HocHamHocVi, l.GIANGVIEN.HoTen].filter(Boolean).join(' ') : l.GiangVien || null),
    LichHoc: scheduleLabel(openedClass) || catalogScheduleLabel(l),
    MaPhong: firstSchedule?.MaPhong || l.MaPhong || null,
    PhongHoc: roomLabel(firstSchedule) || roomLabel(l),
    SoLuongToiDa: l.SoLuongToiDa,
    MoTa: l.MoTa,
    TrangThai: l.TrangThai,
    SoLuongDaDangKy: l.SoLuongDaDangKy || l.CHITIETDANGKY?.length || 0,
    NguoiCapNhat: l.NguoiCapNhat,
    NgayCapNhat: l.NgayCapNhat,
    TenMonHoc: l.MONHOC?.TenMonHoc || null,
    SoTinChi: l.MONHOC?.SoTinChi || null,
    TenKhoa: l.MONHOC?.KHOA?.TenKhoa || null,
  };
};

const formatClassList = (rows) => rows.map(formatClass);

module.exports = { formatClass, formatClassList };
