const prisma = require('../config/database');
const {
  canAccessTrashEntity,
  getAllowedTrashEntities,
  getTrashEntity,
  parseTrashId,
  getTrashTitle
} = require('../utils/trashConfig');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { filterRowsByRegex, paginateRows } = require('../utils/searchRegex');
const { updateAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { recalculateRegistrationPricingForScope } = require('./registrationController');
const { getUserPermissionCodes } = require('../middleware/auth');

const decorateRows = async (config, rows) => {
  const userIds = Array.from(new Set(rows.map((row) => row.NguoiXoa).filter(Boolean)));
  const users = userIds.length
    ? await prisma.TAIKHOAN.findMany({
      where: { MaTaiKhoan: { in: userIds } },
      select: { MaTaiKhoan: true, HoTen: true, TenDangNhap: true }
    })
    : [];
  const userMap = new Map(users.map((user) => [user.MaTaiKhoan, user.HoTen || user.TenDangNhap]));

  return rows.map((row) => ({
    id: row[config.pk],
    entityLabel: config.label,
    title: getTrashTitle(config, row),
    deletedBy: row.NguoiXoa || null,
    deletedByName: userMap.get(row.NguoiXoa) || null,
    deletedAt: row.NgayXoa || null,
    raw: row
  }));
};

const buildTrashWhere = () => ({ DaXoa: true });

const getRequestPermissionCodes = async (req) => req.permissionCodes || getUserPermissionCodes(req.user);

const getAuthorizedTrashConfig = async (req, res) => {
  const config = getTrashEntity(req.params.entity);
  if (!config) {
    res.status(404).json({ success: false, message: 'Không hỗ trợ loại dữ liệu này' });
    return null;
  }

  const permissionCodes = await getRequestPermissionCodes(req);
  if (!canAccessTrashEntity(req.user, permissionCodes, config)) {
    res.status(403).json({ success: false, message: 'Bạn không có quyền xem thùng rác của loại dữ liệu này' });
    return null;
  }

  return config;
};

const getTrashSearchValues = (config, row) => [
  row[config.pk],
  ...config.title.map((field) => row[field])
];

const parseBatchIds = (config, ids = []) => ids
  .map((id) => parseTrashId(config, id))
  .filter((id) => (config.type === 'int' ? Number.isFinite(id) : Boolean(id)));

const listEntities = async (req, res) => {
  try {
    const permissionCodes = await getRequestPermissionCodes(req);
    res.json({
      success: true,
      data: getAllowedTrashEntities(req.user, permissionCodes)
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'listTrashEntities error:');
  }
};

const listTrash = async (req, res) => {
  try {
    const config = await getAuthorizedTrashConfig(req, res);
    if (!config) return;

    const { page, limit } = getPagination(req.query);
    const model = prisma[config.model];
    const where = buildTrashWhere();
    const rows = await model.findMany({
      where,
      orderBy: { NgayXoa: 'desc' }
    });
    const filtered = filterRowsByRegex(rows, req.query.search, (row) => getTrashSearchValues(config, row));
    const pageRows = paginateRows(filtered, page, limit);

    res.json({
      success: true,
      data: await decorateRows(config, pageRows),
      pagination: getPaginationMeta(filtered.length, page, limit)
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'L\u1ed7i server', 'listTrash error:');
  }
};

const restoreTrashItem = async (req, res) => {
  try {
    const config = await getAuthorizedTrashConfig(req, res);
    if (!config) return;
    const id = parseTrashId(config, req.params.id);
    if (config.type === 'int' && !Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }

    const row = await prisma.$transaction(async (tx) => {
      const restored = await tx[config.model].update({
        where: { [config.pk]: id },
        data: {
          DaXoa: false,
          NguoiXoa: null,
          NgayXoa: null,
          ...(config.restoreData || {}),
          ...updateAudit(req)
        }
      });
      if (config.model === 'DONGIATINCHI') {
        await recalculateRegistrationPricingForScope(tx, {
          LoaiMon: restored.LoaiMon,
          LoaiHoc: restored.LoaiHoc,
          MaHocKy: restored.MaHocKy
        });
      }
      return restored;
    });

    res.json({ success: true, message: 'Khôi phục thành công', data: row });
  } catch (error) {
        return sendErrorResponse(res, error, 'Không thể khôi phục dữ liệu', 'restoreTrashItem error:');
  }
};

const purgeTrashItem = async (req, res) => {
  try {
    const config = await getAuthorizedTrashConfig(req, res);
    if (!config) return;
    const id = parseTrashId(config, req.params.id);
    if (config.type === 'int' && !Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }

    await prisma[config.model].delete({ where: { [config.pk]: id } });
    res.json({ success: true, message: 'Đã xóa vĩnh viễn' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Không thể xóa vĩnh viễn do dữ liệu đang được tham chiếu', 'purgeTrashItem error:');
  }
};

const restoreTrashItems = async (req, res) => {
  try {
    const config = await getAuthorizedTrashConfig(req, res);
    if (!config) return;
    const ids = parseBatchIds(config, req.body.ids || []);
    if (!ids.length) return res.status(400).json({ success: false, message: 'Vui lòng chọn dữ liệu cần khôi phục' });

    const result = await prisma[config.model].updateMany({
      where: { [config.pk]: { in: ids }, DaXoa: true },
      data: {
        DaXoa: false,
        NguoiXoa: null,
        NgayXoa: null,
        ...(config.restoreData || {}),
        ...updateAudit(req)
      }
    });

    res.json({ success: true, message: `Đã khôi phục ${result.count} bản ghi`, data: result });
  } catch (error) {
        return sendErrorResponse(res, error, 'Không thể khôi phục dữ liệu', 'restoreTrashItems error:');
  }
};

const purgeTrashItems = async (req, res) => {
  try {
    const config = await getAuthorizedTrashConfig(req, res);
    if (!config) return;
    const ids = parseBatchIds(config, req.body.ids || []);
    if (!ids.length) return res.status(400).json({ success: false, message: 'Vui lòng chọn dữ liệu cần xóa' });

    const result = await prisma[config.model].deleteMany({
      where: { [config.pk]: { in: ids }, DaXoa: true }
    });

    res.json({ success: true, message: `Đã xóa vĩnh viễn ${result.count} bản ghi`, data: result });
  } catch (error) {
        return sendErrorResponse(res, error, 'Không thể xóa vĩnh viễn do dữ liệu đang được tham chiếu', 'purgeTrashItems error:');
  }
};

module.exports = {
  listEntities,
  listTrash,
  restoreTrashItem,
  purgeTrashItem,
  restoreTrashItems,
  purgeTrashItems
};
