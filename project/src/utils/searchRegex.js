const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSearchKeyword = (value) => String(value || '').trim();

const getSearchRegexSource = (value) => {
  const keyword = normalizeSearchKeyword(value);
  if (!keyword) return '';

  try {
    // Validate the user pattern. If it is invalid, treat it as literal text so search never crashes.
    new RegExp(keyword, 'i');
    return keyword;
  } catch (_error) {
    return escapeRegex(keyword);
  }
};

const createSearchRegex = (value) => {
  const source = getSearchRegexSource(value);
  if (!source) return null;
  return new RegExp(source, 'i');
};

const matchesRegex = (value, regex) => {
  if (!regex) return true;
  regex.lastIndex = 0;
  return regex.test(String(value ?? ''));
};

const rowMatchesRegex = (row, regex, getValues) => {
  if (!regex) return true;
  const values = typeof getValues === 'function' ? getValues(row) : [];
  return values.some((value) => matchesRegex(value, regex));
};

const filterRowsByRegex = (rows, search, getValues) => {
  const regex = createSearchRegex(search);
  if (!regex) return rows;
  return rows.filter((row) => rowMatchesRegex(row, regex, getValues));
};

const paginateRows = (rows, page, limit) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, parseInt(limit, 10) || rows.length || 1);
  const start = (safePage - 1) * safeLimit;
  return rows.slice(start, start + safeLimit);
};

module.exports = {
  createSearchRegex,
  escapeRegex,
  filterRowsByRegex,
  getSearchRegexSource,
  matchesRegex,
  paginateRows,
  rowMatchesRegex
};
