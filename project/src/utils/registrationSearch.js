const REGISTRATION_SEARCH_SCOPES = ['studentId', 'studentName', 'major', 'faculty', 'semester'];

const normalizeRegistrationSearchScope = (value) => (
  REGISTRATION_SEARCH_SCOPES.includes(value) ? value : 'studentId'
);

const getRegistrationSearchValues = (row, scope) => {
  const normalizedScope = normalizeRegistrationSearchScope(scope);
  const student = row.SINHVIEN || {};
  const major = student.NGANHHOC || {};
  const faculty = major.KHOA || {};
  const semester = row.HOCKY || {};
  const year = semester.NAMHOC || {};

  if (normalizedScope === 'studentName') return [student.HoTen, row.HoTen];
  if (normalizedScope === 'major') return [major.MaNganh, major.TenNganh];
  if (normalizedScope === 'faculty') return [faculty.MaKhoa, faculty.TenKhoa];
  if (normalizedScope === 'semester') {
    return [row.MaHocKy, semester.MaHocKy, semester.TenHocKy, year.MaNamHoc, year.TenNamHoc];
  }
  return [row.MaSv, student.MaSv];
};

module.exports = {
  REGISTRATION_SEARCH_SCOPES,
  normalizeRegistrationSearchScope,
  getRegistrationSearchValues
};
