// Model: dinh dang du lieu lop hoc.
const periodLabel = (schedule) => {
  const start = schedule?.TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC?.TenTiet || schedule?.MaTietBatDau;
  const end = schedule?.TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC?.TenTiet || schedule?.MaTietKetThuc;
  if (!start && !end) return '';
  return start === end ? start : `${start}-${end}`;
};

const roomLabel = (schedule) => {
  if (schedule?.PHONGHOC) {
    return [schedule.PHONGHOC.MaPhong, schedule.PHONGHOC.TenPhong].filter(Boolean).join(' - ');
  }
  return schedule?.PhongHoc || schedule?.MaPhong || null;
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

const formatClass = (l) => {
  const openedClass = l.LopMoHienTai || null;
  const firstSchedule = (openedClass?.LICHHOCLOP || []).find((item) => item.TrangThai !== false && roomLabel(item));

  return {
    MaLop: l.MaLop,
    TenLop: l.TenLop,
    MaMonHoc: l.MaMonHoc,
    MaGiangVien: openedClass?.MaGiangVien || null,
    GiangVien: openedClass?.GIANGVIEN
      ? [openedClass.GIANGVIEN.HocHamHocVi, openedClass.GIANGVIEN.HoTen].filter(Boolean).join(' ')
      : openedClass?.GiangVien || null,
    LichHoc: scheduleLabel(openedClass),
    MaPhong: firstSchedule?.MaPhong || null,
    PhongHoc: roomLabel(firstSchedule),
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
