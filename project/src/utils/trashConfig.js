const TRASH_ENTITIES = {
  students: {
    label: 'Sinh vien',
    model: 'SINHVIEN',
    pk: 'MaSv',
    type: 'string',
    title: ['HoTen', 'MaSv']
  },
  courses: {
    label: 'Mon hoc',
    model: 'MONHOC',
    pk: 'MaMonHoc',
    type: 'string',
    title: ['TenMonHoc', 'MaMonHoc']
  },
  classes: {
    label: 'Lop hoc',
    model: 'LOP',
    pk: 'MaLop',
    type: 'string',
    title: ['TenLop', 'MaLop']
  },
  semesters: {
    label: 'Hoc ky',
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
    label: 'Nganh hoc',
    model: 'NGANHHOC',
    pk: 'MaNganh',
    type: 'string',
    title: ['TenNganh', 'MaNganh']
  },
  completedCourses: {
    label: 'Mon da hoc',
    model: 'MONDAHOC',
    pk: 'id',
    type: 'int',
    title: ['MaSv', 'MaMonHoc']
  },
  pricing: {
    label: 'Don gia tin chi',
    model: 'DONGIATINCHI',
    pk: 'id',
    type: 'int',
    title: ['LoaiMon', 'LoaiHoc']
  },
  beneficiaries: {
    label: 'Doi tuong uu tien',
    model: 'DOITUONG',
    pk: 'MaDoiTuong',
    type: 'string',
    title: ['TenDoiTuong', 'MaDoiTuong']
  },
  notifications: {
    label: 'Thong bao',
    model: 'THONGBAO',
    pk: 'MaThongBao',
    type: 'int',
    title: ['TieuDe', 'Loai']
  },
  functions: {
    label: 'Chuc nang',
    model: 'CHUCNANG',
    pk: 'MaChucNang',
    type: 'string',
    title: ['TenChucNang', 'MaChucNang']
  },
  groups: {
    label: 'Nhom nguoi dung',
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
