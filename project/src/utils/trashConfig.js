const { isSystemAdminUser } = require('./permissionCatalog');

const TRASH_ENTITIES = {
  students: {
    label: 'Sinh viên',
    permissionCode: 'ADMIN_STUDENTS',
    model: 'SINHVIEN',
    pk: 'MaSv',
    type: 'string',
    title: ['HoTen', 'MaSv']
  },
  courses: {
    label: 'Môn học',
    permissionCode: 'ADMIN_COURSES',
    model: 'MONHOC',
    pk: 'MaMonHoc',
    type: 'string',
    title: ['TenMonHoc', 'MaMonHoc']
  },
  openCourses: {
    label: 'Môn học mở',
    permissionCode: 'ADMIN_OPEN_COURSES',
    model: 'MONHOCMO',
    pk: 'id',
    type: 'int',
    title: ['MaHocKy', 'MaMonHoc'],
    restoreData: { TrangThai: true }
  },
  classes: {
    label: 'Lớp học',
    permissionCode: 'ADMIN_CLASSES',
    model: 'LOP',
    pk: 'MaLop',
    type: 'string',
    title: ['TenLop', 'MaLop']
  },
  rooms: {
    label: 'Phòng học',
    permissionCode: 'ADMIN_ROOMS',
    model: 'PHONGHOC',
    pk: 'MaPhong',
    type: 'string',
    title: ['TenPhong', 'MaPhong']
  },
  lecturers: {
    label: 'Giảng viên',
    permissionCode: 'ADMIN_LECTURERS',
    model: 'GIANGVIEN',
    pk: 'MaGiangVien',
    type: 'string',
    title: ['HoTen', 'MaGiangVien']
  },
  semesters: {
    label: 'Học kỳ',
    permissionCode: 'ADMIN_SEMESTERS',
    model: 'HOCKY',
    pk: 'MaHocKy',
    type: 'string',
    title: ['TenHocKy', 'MaHocKy']
  },
  faculties: {
    label: 'Khoa',
    permissionCode: 'ADMIN_FACULTIES',
    model: 'KHOA',
    pk: 'MaKhoa',
    type: 'string',
    title: ['TenKhoa', 'MaKhoa']
  },
  majors: {
    label: 'Ngành học',
    permissionCode: 'ADMIN_MAJORS',
    model: 'NGANHHOC',
    pk: 'MaNganh',
    type: 'string',
    title: ['TenNganh', 'MaNganh']
  },
  provinces: {
    label: 'Tỉnh/Thành phố',
    permissionCode: 'ADMIN_LOCATION_PROVINCES',
    model: 'TINH',
    pk: 'MaTinh',
    type: 'string',
    title: ['TenTinh', 'MaTinh']
  },
  wards: {
    label: 'Phường/Xã',
    permissionCode: 'ADMIN_LOCATION_WARDS',
    model: 'PHUONGXA',
    pk: 'MaPhuongXa',
    type: 'string',
    title: ['TenPhuongXa', 'MaPhuongXa']
  },
  completedCourses: {
    label: 'Môn đã học',
    permissionCode: 'ADMIN_COMPLETED',
    model: 'MONDAHOC',
    pk: 'id',
    type: 'int',
    title: ['MaSv', 'MaMonHoc']
  },
  periods: {
    label: 'Tiết học',
    permissionCode: 'ADMIN_PERIODS',
    model: 'TIETHOC',
    pk: 'MaTiet',
    type: 'string',
    title: ['TenTiet', 'MaTiet']
  },
  prerequisites: {
    label: 'Ràng buộc môn học',
    permissionCode: 'ADMIN_PREREQ',
    model: 'DIEUKIENMONHOC',
    pk: 'id',
    type: 'int',
    title: ['MaMonHoc', 'MaMonDieuKien']
  },
  pricing: {
    label: 'Đơn giá tín chỉ',
    permissionCode: 'ADMIN_PRICING',
    model: 'DONGIATINCHI',
    pk: 'id',
    type: 'int',
    title: ['LoaiMon', 'LoaiHoc']
  },
  beneficiaries: {
    label: 'Đối tượng ưu tiên',
    permissionCode: 'ADMIN_BENEFICIARIES',
    model: 'DOITUONG',
    pk: 'MaDoiTuong',
    type: 'string',
    title: ['TenDoiTuong', 'MaDoiTuong']
  },
  notifications: {
    label: 'Thông báo',
    permissionCode: 'ADMIN_NOTIFICATIONS',
    model: 'THONGBAO',
    pk: 'MaThongBao',
    type: 'int',
    title: ['TieuDe', 'Loai']
  },
  functions: {
    label: 'Chức năng',
    permissionCode: 'ADMIN_PERMISSIONS',
    model: 'CHUCNANG',
    pk: 'MaChucNang',
    type: 'string',
    title: ['TenChucNang', 'MaChucNang']
  },
  groups: {
    label: 'Nhóm người dùng',
    permissionCode: 'ADMIN_PERMISSIONS',
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

const canAccessTrashEntity = (user, permissionCodes = [], config) => {
  if (!config) return false;
  if (isSystemAdminUser(user)) return true;
  if (!config.permissionCode) return true;
  return new Set(permissionCodes || []).has(config.permissionCode);
};

const getAllowedTrashEntities = (user, permissionCodes = []) => (
  Object.entries(TRASH_ENTITIES)
    .filter(([, config]) => canAccessTrashEntity(user, permissionCodes, config))
    .map(([key, config]) => ({
      key,
      label: config.label,
      permissionCode: config.permissionCode || null
    }))
);

module.exports = {
  TRASH_ENTITIES,
  canAccessTrashEntity,
  getAllowedTrashEntities,
  getTrashEntity,
  parseTrashId,
  getTrashTitle
};
