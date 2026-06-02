const getRegistrationStudentAcademicInfo = (student) => {
  const major = student?.NGANHHOC || null;
  const faculty = major?.KHOA || null;
  return {
    majorCode: major?.MaNganh || student?.MaNganh || 'unknown',
    majorName: major?.TenNganh || student?.MaNganh || 'Chưa rõ ngành',
    facultyCode: faculty?.MaKhoa || major?.MaKhoa || 'unknown',
    facultyName: faculty?.TenKhoa || major?.MaKhoa || 'Chưa rõ khoa'
  };
};

const getSemesterKindLabel = (semester) => {
  if (!semester) return '';
  const order = Number(semester.ThuTu || 1);
  const type = String(semester.LoaiHocKy || '').toLowerCase();
  if (order === 3 || type.startsWith('h')) return 'Học kỳ Hè';
  if (order === 2) return 'Học kỳ II';
  return 'Học kỳ I';
};

const getRegistrationSemesterName = (registration) => {
  if (!registration) return '';
  if (!registration.HOCKY) return registration.MaHocKy || '';
  return `${getSemesterKindLabel(registration.HOCKY)}${registration.HOCKY.NAMHOC ? ' - ' + registration.HOCKY.NAMHOC.TenNamHoc : ''}`;
};

const buildRegistrationStudentRows = (registrations = []) => Array.from(registrations.reduce((map, registration) => {
  const key = registration.MaSv;
  if (!map.has(key)) {
    map.set(key, {
      MaSv: registration.MaSv,
      SINHVIEN: registration.SINHVIEN,
      latestRegistration: registration,
      soPhieu: 0,
      soMon: 0,
      TongTinChi: 0,
      statuses: new Set(),
      semesters: new Set()
    });
  }

  const row = map.get(key);
  const activeDetails = registration.CHITIETDANGKY || [];
  const activeCredits = activeDetails.reduce((sum, item) => sum + Number(item.SoTinChi || 0), 0);
  row.soPhieu += 1;
  row.soMon += activeDetails.length;
  row.TongTinChi += activeCredits;
  if (registration.TrangThai) row.statuses.add(registration.TrangThai);
  const semesterName = getRegistrationSemesterName(registration);
  if (semesterName) row.semesters.add(semesterName);
  return map;
}, new Map()).values()).map((row) => ({
  ...row,
  TrangThaiTongHop: Array.from(row.statuses).join(', ') || 'Đã đăng ký',
  HocKyGanNhat: getRegistrationSemesterName(row.latestRegistration),
  HocKyHienThi: Array.from(row.semesters).join(', '),
  DanhSachHocKy: Array.from(row.semesters).join(', ')
}));

const buildRegistrationDistribution = (rows, dimension) => {
  const groups = new Map();

  rows.forEach((row) => {
    const info = getRegistrationStudentAcademicInfo(row.SINHVIEN);
    const code = dimension === 'faculty' ? info.facultyCode : info.majorCode;
    const name = dimension === 'faculty' ? info.facultyName : info.majorName;
    const parentName = dimension === 'major' ? info.facultyName : '';

    if (!groups.has(code)) {
      groups.set(code, {
        code,
        name,
        parentName,
        studentIds: new Set(),
        studentCount: 0,
        registrationCount: 0,
        courseCount: 0,
        creditCount: 0
      });
    }

    const group = groups.get(code);
    if (!group.studentIds.has(row.MaSv)) {
      group.studentIds.add(row.MaSv);
      group.studentCount += 1;
    }
    group.registrationCount += Number(row.soPhieu || 0);
    group.courseCount += Number(row.soMon || 0);
    group.creditCount += Number(row.TongTinChi || 0);
  });

  const maxStudents = Math.max(0, ...Array.from(groups.values()).map((group) => group.studentCount));
  return Array.from(groups.values())
    .sort((a, b) => b.studentCount - a.studentCount || a.name.localeCompare(b.name, 'vi'))
    .map(({ studentIds, ...group }) => ({
      ...group,
      percent: maxStudents ? Math.max(6, Math.round((group.studentCount / maxStudents) * 100)) : 0
    }));
};

module.exports = {
  buildRegistrationStudentRows,
  buildRegistrationDistribution,
  getRegistrationStudentAcademicInfo,
  getRegistrationSemesterName
};
