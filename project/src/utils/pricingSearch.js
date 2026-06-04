const PRICING_SEARCH_SCOPES = ['all', 'loai_mon', 'loai_hoc', 'hoc_ky'];

const normalizePricingSearchScope = (value) => (
  PRICING_SEARCH_SCOPES.includes(value) ? value : 'all'
);

const COURSE_TYPE_LABELS = {
  LT: ['LT', 'L\u00fd thuy\u1ebft', 'Ly thuyet'],
  TH: ['TH', 'Th\u1ef1c h\u00e0nh', 'Thuc hanh']
};

const STUDY_TYPE_LABELS = {
  hoc_moi: ['hoc_moi', 'H\u1ecdc m\u1edbi', 'Hoc moi'],
  hoc_lai: ['hoc_lai', 'H\u1ecdc l\u1ea1i', 'Hoc lai'],
  hoc_cai_thien: ['hoc_cai_thien', 'C\u1ea3i thi\u1ec7n', 'Cai thien', 'H\u1ecdc c\u1ea3i thi\u1ec7n', 'Hoc cai thien'],
  hoc_he: ['hoc_he', 'H\u1ecdc h\u00e8', 'Hoc he']
};

const getSemesterValues = (row) => {
  const semester = row.HOCKY || {};
  const year = semester.NAMHOC || {};
  return [
    row.MaHocKy,
    row.MaHocKy ? '' : 'T\u1ea5t c\u1ea3 h\u1ecdc k\u1ef3',
    semester.MaHocKy,
    semester.TenHocKy,
    year.MaNamHoc,
    year.TenNamHoc
  ];
};

const getPricingSearchValues = (row, scope) => {
  const normalizedScope = normalizePricingSearchScope(scope);
  const courseValues = COURSE_TYPE_LABELS[row.LoaiMon] || [row.LoaiMon];
  const studyValues = STUDY_TYPE_LABELS[row.LoaiHoc] || [row.LoaiHoc];
  const semesterValues = getSemesterValues(row);

  if (normalizedScope === 'loai_mon') return courseValues;
  if (normalizedScope === 'loai_hoc') return studyValues;
  if (normalizedScope === 'hoc_ky') return semesterValues;
  return [...courseValues, ...studyValues, ...semesterValues];
};

module.exports = { getPricingSearchValues, normalizePricingSearchScope };
