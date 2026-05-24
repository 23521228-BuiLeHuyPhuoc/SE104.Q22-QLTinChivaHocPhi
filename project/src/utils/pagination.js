const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 15;

const toPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPagination = (query = {}) => {
  const page = toPositiveInt(query.page, 1);
  const limit = DEFAULT_PAGE_SIZE;
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

const getPaginationMeta = (total, page, limit = DEFAULT_PAGE_SIZE) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit)
});

const notDeleted = (where = {}) => ({
  ...where,
  DaXoa: false
});

module.exports = {
  DEFAULT_PAGE_SIZE,
  getPagination,
  getPaginationMeta,
  notDeleted
};
