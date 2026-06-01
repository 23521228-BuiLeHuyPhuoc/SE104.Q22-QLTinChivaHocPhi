const REGISTRATION_SEARCH_SCOPES = ['studentId', 'studentName', 'major', 'faculty', 'semester'];

const normalizeRegistrationSearchScope = (value) => (
  REGISTRATION_SEARCH_SCOPES.includes(value) ? value : 'studentId'
);

const containsInsensitive = (value) => ({ contains: value, mode: 'insensitive' });

const appendAndCondition = (where, condition) => {
  if (!condition) return;
  where.AND = [...(where.AND || []), condition];
};

const buildRegistrationSearchCondition = (scope, search) => {
  const keyword = String(search || '').trim();
  if (!keyword) return null;

  const normalizedScope = normalizeRegistrationSearchScope(scope);

  if (normalizedScope === 'studentName') {
    return { SINHVIEN: { HoTen: containsInsensitive(keyword) } };
  }

  if (normalizedScope === 'major') {
    return {
      SINHVIEN: {
        NGANHHOC: {
          OR: [
            { MaNganh: containsInsensitive(keyword) },
            { TenNganh: containsInsensitive(keyword) }
          ]
        }
      }
    };
  }

  if (normalizedScope === 'faculty') {
    return {
      SINHVIEN: {
        NGANHHOC: {
          KHOA: {
            OR: [
              { MaKhoa: containsInsensitive(keyword) },
              { TenKhoa: containsInsensitive(keyword) }
            ]
          }
        }
      }
    };
  }

  if (normalizedScope === 'semester') {
    return {
      OR: [
        { MaHocKy: containsInsensitive(keyword) },
        { HOCKY: { TenHocKy: containsInsensitive(keyword) } },
        { HOCKY: { NAMHOC: { MaNamHoc: containsInsensitive(keyword) } } },
        { HOCKY: { NAMHOC: { TenNamHoc: containsInsensitive(keyword) } } }
      ]
    };
  }

  return { MaSv: containsInsensitive(keyword) };
};

const applyRegistrationSearch = (where, scope, search) => {
  appendAndCondition(where, buildRegistrationSearchCondition(scope, search));
};

module.exports = {
  REGISTRATION_SEARCH_SCOPES,
  normalizeRegistrationSearchScope,
  applyRegistrationSearch
};
