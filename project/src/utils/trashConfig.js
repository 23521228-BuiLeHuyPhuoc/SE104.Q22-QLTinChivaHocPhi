const TRASH_ENTITIES = {
  students: {
    label: 'Sinh viên',
    model: 'SINHVIEN',
    pk: 'MaSv',
    type: 'string',
    title: ['HoTen', 'MaSv']
  },
  courses: {
    label: 'Môn học',
    model: 'MONHOC',
    pk: 'MaMonHoc',
    type: 'string',
    title: ['TenMonHoc', 'MaMonHoc']
  },
  classes: {
    label: 'Lớp học',
    model: 'LOP',
    pk: 'MaLop',
    type: 'string',
    title: ['TenLop', 'MaLop']
  },
  semesters: {
    label: 'Học kỳ',
    model: 'HOCKY',
    pk: 'MaHocKy',
    type: 'string',
    title: ['TenHocKy', 'MaHocKy']
  },
  faculties: {
    label: 'Khoa',
    model: 'KHOA',
    pk: 'MaKhoa',
    type: 'string',
    title: ['TenKhoa', 'MaKhoa']
  },
  majors: {
    label: 'Ngành học',
    model: 'NGANHHOC',
    pk: 'MaNganh',
    type: 'string',
    title: ['TenNganh', 'MaNganh']
  },
  completedCourses: {
    label: 'Môn đã học',
    model: 'MONDAHOC',
    pk: 'id',
    type: 'int',
    title: ['MaSv', 'MaMonHoc']
  },
  periods: {
    label: 'Tiết học',
    model: 'TIETHOC',
    pk: 'MaTiet',
    type: 'string',
    title: ['TenTiet', 'MaTiet']
  },
  prerequisites: {
    label: 'Ràng buộc môn học',
    model: 'DIEUKIENMONHOC',
    pk: 'id',
    type: 'int',
    title: ['MaMonHoc', 'MaMonDieuKien']
  },
  pricing: {
    label: 'Đơn giá tín chỉ',
    model: 'DONGIATINCHI',
    pk: 'id',
    type: 'int',
    title: ['LoaiMon', 'LoaiHoc']
  },
  beneficiaries: {
    label: 'Đối tượng ưu tiên',
    model: 'DOITUONG',
    pk: 'MaDoiTuong',
    type: 'string',
    title: ['TenDoiTuong', 'MaDoiTuong']
  },
  notifications: {
    label: 'Thông báo',
    model: 'THONGBAO',
    pk: 'MaThongBao',
    type: 'int',
    title: ['TieuDe', 'Loai']
  },
  functions: {
    label: 'Chức năng',
    model: 'CHUCNANG',
    pk: 'MaChucNang',
    type: 'string',
    title: ['TenChucNang', 'MaChucNang']
  },
  groups: {
    label: 'Nhóm người dùng',
    model: 'NHOMNGUOIDUNG',
    pk: 'MaNhom',
    type: 'string',
    title: ['TenNhom', 'MaNhom']
  }
};

const getTrashEntity = (name) => TRASH_ENTITIES[name] || null;

const parseTrashId = (config, value) => (
  config.type === 'int' ? parseInt(value, 10) : value
);

const getTrashTitle = (config, row) => (
  config.title
    .map((field) => row?.[field])
    .filter(Boolean)
    .join(' - ') || String(row?.[config.pk] || '')
);

module.exports = {
  TRASH_ENTITIES,
  getTrashEntity,
  parseTrashId,
  getTrashTitle
};
