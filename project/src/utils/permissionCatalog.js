const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const DEFAULT_USER_GROUPS = [
  { MaNhom: 'ADMIN', TenNhom: 'Admin hệ thống' },
  { MaNhom: 'ADMIN_DAOTAO', TenNhom: 'Quản trị viên đào tạo' },
  { MaNhom: 'ADMIN_TAICHINH', TenNhom: 'Quản trị viên tài chính' },
  { MaNhom: 'SINHVIEN', TenNhom: 'Sinh viên' }
];

const PERMISSION_PORTALS = {
  admin: { key: 'admin', label: 'Cổng quản trị', badgeClass: 'badge-info' },
  student: { key: 'student', label: 'Cổng sinh viên', badgeClass: 'badge-success' },
  shared: { key: 'shared', label: 'Dùng chung', badgeClass: 'badge-secondary' }
};

const PERMISSION_CATALOG = [
  { code: 'ADMIN_DASHBOARD', name: 'Bảng điều khiển quản trị', screen: '/admin/dashboard', paths: ['/admin/dashboard', '/api/dashboard'] },
  { code: 'ADMIN_STUDENTS', name: 'Quản lý sinh viên', screen: '/admin/students', paths: ['/admin/students', '/api/students'] },
  { code: 'ADMIN_LOCATIONS', name: 'Quản lý địa danh', screen: '/admin/locations', paths: ['/admin/locations', '/api/locations'] },
  { code: 'ADMIN_COURSES', name: 'Quản lý môn học', screen: '/admin/courses', paths: ['/admin/courses', '/api/courses'] },
  { code: 'ADMIN_OPEN_COURSES', name: 'Quản lý môn học mở', screen: '/admin/open-courses', paths: ['/admin/open-courses', '/api/open-courses'] },
  { code: 'ADMIN_CLASSES', name: 'Quản lý lớp học', screen: '/admin/classes', paths: ['/admin/classes', '/api/classes'] },
  { code: 'ADMIN_ROOMS', name: 'Quản lý phòng học', screen: '/admin/rooms', paths: ['/admin/rooms', '/api/rooms'] },
  { code: 'ADMIN_LECTURERS', name: 'Quản lý giảng viên', screen: '/admin/lecturers', paths: ['/admin/lecturers', '/api/lecturers'] },
  { code: 'ADMIN_SEMESTERS', name: 'Quản lý học kỳ', screen: '/admin/semesters', paths: ['/admin/semesters', '/api/semesters'] },
  { code: 'ADMIN_ACAD_YEARS', name: 'Quản lý năm học', screen: '/admin/academic-years', paths: ['/admin/academic-years', '/api/semesters/years'] },
  { code: 'ADMIN_PERIODS', name: 'Quản lý tiết học', screen: '/admin/periods', paths: ['/admin/periods', '/api/periods'] },
  { code: 'ADMIN_PREREQ', name: 'Quản lý ràng buộc môn học', screen: '/admin/prerequisites', paths: ['/admin/prerequisites', '/api/prerequisites'] },
  { code: 'ADMIN_REGS', name: 'Quản lý đăng ký môn học', screen: '/admin/registrations', paths: ['/admin/registrations', '/api/registrations'] },
  { code: 'ADMIN_APPEALS', name: 'Duyệt đơn cứu xét đăng ký', screen: '/admin/appeals', paths: ['/admin/appeals', '/api/appeals'] },
  { code: 'ADMIN_TUITION', name: 'Quản lý học phí', screen: '/admin/tuition', paths: ['/admin/tuition', '/api/tuition'] },
  { code: 'ADMIN_PAYMENTS', name: 'Quản lý phiếu thu', screen: '/admin/payments', paths: ['/admin/payments', '/api/payments'] },
  { code: 'ADMIN_REPORTS', name: 'Báo cáo thống kê', screen: '/admin/reports', paths: ['/admin/reports'] },
  { code: 'ADMIN_USERS', name: 'Quản lý người dùng', screen: '/admin/users', paths: ['/admin/users', '/api/roles'] },
  { code: 'ADMIN_FACULTIES', name: 'Quản lý khoa', screen: '/admin/faculties', paths: ['/admin/faculties', '/api/faculties'] },
  { code: 'ADMIN_MAJORS', name: 'Quản lý ngành học', screen: '/admin/majors', paths: ['/admin/majors', '/api/majors'] },
  { code: 'ADMIN_CURRICULUM', name: 'Quản lý chương trình học', screen: '/admin/curriculum-programs', paths: ['/admin/curriculum-programs'] },
  { code: 'ADMIN_COMPLETED', name: 'Quản lý môn đã học', screen: '/admin/completed-courses', paths: ['/admin/completed-courses', '/api/completed-courses'] },
  { code: 'ADMIN_PRICING', name: 'Quản lý đơn giá tín chỉ', screen: '/admin/pricing', paths: ['/admin/pricing', '/api/pricing'] },
  { code: 'ADMIN_BENEFICIARIES', name: 'Quản lý đối tượng ưu tiên', screen: '/admin/beneficiaries', paths: ['/admin/beneficiaries', '/api/beneficiaries'] },
  { code: 'ADMIN_PERMISSIONS', name: 'Phân quyền hệ thống', screen: '/admin/permissions', paths: ['/admin/permissions', '/api/permissions'] },
  { code: 'ADMIN_NOTIFICATIONS', name: 'Quản lý thông báo', screen: '/admin/notifications', paths: ['/admin/notifications', '/api/notifications'] },
  { code: 'ADMIN_SETTINGS', name: 'Tham số hệ thống', screen: '/admin/settings', paths: ['/admin/settings', '/api/settings'] },
  { code: 'ADMIN_TRASH', name: 'Thùng rác dữ liệu', screen: '/admin/trash', paths: ['/admin/trash', '/api/trash'] },
  { code: 'ADMIN_PROFILE', name: 'Hồ sơ quản trị viên', screen: '/admin/profile', paths: ['/admin/profile'] },

  { code: 'STUDENT_DASHBOARD', name: 'Bảng điều khiển sinh viên', screen: '/student/dashboard', paths: ['/student/dashboard'] },
  { code: 'STUDENT_REGISTRATION', name: 'Đăng ký học phần', screen: '/student/course-registration', paths: ['/student/course-registration'] },
  { code: 'STUDENT_MY_COURSES', name: 'Phiếu đăng ký học phần', screen: '/student/my-courses', paths: ['/student/my-courses'] },
  { code: 'STUDENT_COMPLETED', name: 'Môn đã học của sinh viên', screen: '/student/completed-courses', paths: ['/student/completed-courses'] },
  { code: 'STUDENT_TUITION', name: 'Học phí của sinh viên', screen: '/student/my-tuition', paths: ['/student/my-tuition'] },
  { code: 'STUDENT_PAYMENTS', name: 'Lịch sử thanh toán', screen: '/student/my-payments', paths: ['/student/my-payments'] },
  { code: 'STUDENT_SCHEDULE', name: 'Thời khóa biểu', screen: '/student/my-schedule', paths: ['/student/my-schedule'] },
  { code: 'STUDENT_PROFILE', name: 'Hồ sơ sinh viên', screen: '/student/profile', paths: ['/student/profile'] },
  { code: 'STUDENT_NOTIFICATIONS', name: 'Thông báo sinh viên', screen: '/student/notifications', paths: ['/student/notifications'] },
  { code: 'STUDENT_CURRICULUM', name: 'Chương trình đào tạo', screen: '/student/curriculum', paths: ['/student/curriculum'] }
];

const ADMIN_PERMISSION_CODES = PERMISSION_CATALOG
  .filter(permission => permission.code.startsWith('ADMIN_'))
  .map(permission => permission.code);

const STUDENT_PERMISSION_CODES = PERMISSION_CATALOG
  .filter(permission => permission.code.startsWith('STUDENT_'))
  .map(permission => permission.code);

const TRAINING_ADMIN_PERMISSIONS = [
  'ADMIN_DASHBOARD',
  'ADMIN_LOCATIONS',
  'ADMIN_STUDENTS',
  'ADMIN_COURSES',
  'ADMIN_OPEN_COURSES',
  'ADMIN_CLASSES',
  'ADMIN_ROOMS',
  'ADMIN_LECTURERS',
  'ADMIN_SEMESTERS',
  'ADMIN_ACAD_YEARS',
  'ADMIN_PERIODS',
  'ADMIN_PREREQ',
  'ADMIN_REGS',
  'ADMIN_APPEALS',
  'ADMIN_FACULTIES',
  'ADMIN_MAJORS',
  'ADMIN_CURRICULUM',
  'ADMIN_COMPLETED',
  'ADMIN_PROFILE'
];

const FINANCE_ADMIN_PERMISSIONS = [
  'ADMIN_DASHBOARD',
  'ADMIN_TUITION',
  'ADMIN_PAYMENTS',
  'ADMIN_REPORTS',
  'ADMIN_PRICING',
  'ADMIN_BENEFICIARIES',
  'ADMIN_PROFILE'
];

const DEFAULT_GROUP_PERMISSIONS = {
  ADMIN: ADMIN_PERMISSION_CODES,
  ADMIN_DAOTAO: TRAINING_ADMIN_PERMISSIONS,
  ADMIN_TAICHINH: FINANCE_ADMIN_PERMISSIONS,
  SINHVIEN: STUDENT_PERMISSION_CODES
};

const LEGACY_PERMISSION_CODES = [
  'DASHBOARD',
  'SINHVIEN',
  'MONHOC',
  'DANGKY',
  'HOCPHI',
  'THONGBAO',
  'NGUOIDUNG',
  'PHANQUYEN',
  'BAOCAO',
  'THAMSO',
  'CUU_XET'
];

const normalizePath = (path) => {
  const value = String(path || '/').split('?')[0].replace(/\/+$/, '');
  return value || '/';
};

const pathStartsWithSegment = (path, prefix) => {
  const normalizedPath = normalizePath(path);
  const normalizedPrefix = normalizePath(prefix);
  return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
};

const getPermissionPortal = (permission = {}) => {
  const code = String(permission.MaChucNang || permission.code || '').toUpperCase();
  const screen = String(permission.TenManHinhDuocLoad || permission.screen || '');
  if (code.startsWith('STUDENT_') || screen.startsWith('/student')) return PERMISSION_PORTALS.student;
  if (code.startsWith('ADMIN_') || screen.startsWith('/admin') || screen.startsWith('/api')) return PERMISSION_PORTALS.admin;
  return PERMISSION_PORTALS.shared;
};

const getGroupType = (group = {}) => {
  const code = String(group.MaNhom || group).toUpperCase();
  if (code === 'SINHVIEN') return { key: 'student', label: 'Nhóm sinh viên', role: 'student', badgeClass: 'badge-success' };
  if (code === 'ADMIN') return { key: 'system-admin', label: 'Admin hệ thống', role: 'admin', badgeClass: 'badge-primary' };
  return { key: 'admin', label: 'Nhóm quản trị', role: 'admin', badgeClass: 'badge-info' };
};

const decoratePermissionFunction = (permission) => {
  const portal = getPermissionPortal(permission);
  return {
    ...permission,
    LoaiQuyen: portal.key,
    LoaiQuyenLabel: portal.label,
    LoaiQuyenBadgeClass: portal.badgeClass
  };
};

const decorateGroup = (group) => {
  const groupType = getGroupType(group);
  return {
    ...group,
    LoaiNhom: groupType.key,
    LoaiNhomLabel: groupType.label,
    Role: groupType.role,
    LoaiNhomBadgeClass: groupType.badgeClass
  };
};

const routePermissions = PERMISSION_CATALOG
  .flatMap(permission => permission.paths.map(path => ({ permission, path: normalizePath(path) })))
  .sort((a, b) => b.path.length - a.path.length);

const getPermissionForPath = (path) => {
  const normalizedPath = normalizePath(path);
  return routePermissions.find(entry => pathStartsWithSegment(normalizedPath, entry.path))?.permission || null;
};

const isSystemAdminUser = (user) => {
  if (!user || (user.Role !== 'admin' && user.role !== 'admin')) return false;
  const groupCode = normalizeText(user.MaNhom || user.maNhom).replace(/-/g, '_');
  if (['admin', 'admin_he_thong', 'system_admin'].includes(groupCode)) return true;

  const position = normalizeText(user.ChucVu || user.chucVu);
  if (position === 'admin' ||
    position.includes('he thong') ||
    position.includes('system')) return true;

  return !groupCode && !position;
};

const canAccessPathWithPermissionCodes = (user, permissionCodes, path) => {
  if (isSystemAdminUser(user)) return true;
  const permission = getPermissionForPath(path);
  if (!permission) return true;
  return new Set(permissionCodes || []).has(permission.code);
};

const isPermissionCompatibleWithGroup = (groupId, permission) => {
  const groupType = getGroupType(groupId);
  const portal = getPermissionPortal(permission);
  if (portal.key === 'shared') return true;
  if (groupType.role === 'student') return portal.key === 'student';
  return portal.key === 'admin';
};

module.exports = {
  DEFAULT_USER_GROUPS,
  PERMISSION_CATALOG,
  PERMISSION_PORTALS,
  DEFAULT_GROUP_PERMISSIONS,
  LEGACY_PERMISSION_CODES,
  decoratePermissionFunction,
  decorateGroup,
  getGroupType,
  getPermissionForPath,
  getPermissionPortal,
  isPermissionCompatibleWithGroup,
  isSystemAdminUser,
  canAccessPathWithPermissionCodes,
  normalizePath
};
