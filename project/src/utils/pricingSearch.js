const PRICING_SEARCH_SCOPES = ['loai_mon', 'loai_hoc', 'hoc_ky'];

const normalizeText = (value) => String(value || '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase();

const normalizePricingSearchScope = (value) => (
  PRICING_SEARCH_SCOPES.includes(value) ? value : 'loai_mon'
);

const courseTypeOptions = [
  { value: 'LT', keywords: ['lt', 'ly thuyet'] },
  { value: 'TH', keywords: ['th', 'thuc hanh'] }
];

const studyTypeOptions = [
  { value: 'hoc_moi', keywords: ['hoc moi', 'moi', 'hoc_moi'] },
  { value: 'hoc_he', keywords: ['hoc he', 'he', 'hoc_he'] },
  { value: 'hoc_cai_thien', keywords: ['cai thien', 'hoc cai thien', 'hoc_cai_thien'] },
  { value: 'hoc_lai', keywords: ['hoc lai', 'lai', 'hoc_lai'] }
];

const getOptionMatches = (options, search) => {
  const term = normalizeText(search);
  if (!term) return [];

  return options
    .filter((option) => {
      const value = normalizeText(option.value);
      if (term === value) return true;
      return option.keywords.some((keyword) => {
        if (term === keyword) return true;
        return term.length >= 3 && (keyword.includes(term) || (keyword.length >= 3 && term.includes(keyword)));
      });
    })
    .map((option) => option.value);
};

const addAndCondition = (where, condition) => {
  if (!condition) return;
  where.AND = [...(where.AND || []), condition];
};

const isAllSemesterSearch = (search) => {
  const term = normalizeText(search);
  return term === 'all' || term === 'tat ca' || term.includes('tat ca');
};

const applyPricingSearch = (where, scope, search) => {
  const keyword = String(search || '').trim();
  if (!keyword) return;

  const normalizedScope = normalizePricingSearchScope(scope);

  if (normalizedScope === 'loai_mon') {
    const matches = getOptionMatches(courseTypeOptions, keyword);
    addAndCondition(where, matches.length
      ? { LoaiMon: { in: matches } }
      : { LoaiMon: { contains: keyword, mode: 'insensitive' } });
    return;
  }

  if (normalizedScope === 'loai_hoc') {
    const matches = getOptionMatches(studyTypeOptions, keyword);
    addAndCondition(where, matches.length
      ? { LoaiHoc: { in: matches } }
      : { LoaiHoc: { contains: normalizeText(keyword).replace(/\s+/g, '_'), mode: 'insensitive' } });
    return;
  }

  const semesterConditions = [
    { MaHocKy: { contains: keyword, mode: 'insensitive' } },
    { HOCKY: { is: { TenHocKy: { contains: keyword, mode: 'insensitive' } } } },
    { HOCKY: { is: { MaHocKy: { contains: keyword, mode: 'insensitive' } } } },
    { HOCKY: { is: { NAMHOC: { TenNamHoc: { contains: keyword, mode: 'insensitive' } } } } }
  ];

  if (isAllSemesterSearch(keyword)) semesterConditions.unshift({ MaHocKy: null });
  addAndCondition(where, { OR: semesterConditions });
};

module.exports = { applyPricingSearch, normalizePricingSearchScope };
