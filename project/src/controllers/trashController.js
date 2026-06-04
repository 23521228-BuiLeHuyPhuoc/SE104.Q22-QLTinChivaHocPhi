const prisma = require('../config/database');
const { TRASH_ENTITIES, getTrashEntity, parseTrashId, getTrashTitle } = require('../utils/trashConfig');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { filterRowsByRegex, paginateRows } = require('../utils/searchRegex');
const { updateAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { recalculateRegistrationPricingForScope } = require('./registrationController');

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

const getTrashSearchValues = (config, row) => [
  row[config.pk],
  ...config.title.map((field) => row[field])
];

const parseBatchIds = (config, ids = []) => ids
  .map((id) => parseTrashId(config, id))
  .filter((id) => (config.type === 'int' ? Number.isFinite(id) : Boolean(id)));

const listEntities = (req, res) => {
  res.json({
    success: true,
    data: Object.entries(TRASH_ENTITIES).map(([key, config]) => ({
      key,
      label: config.label
    }))
  });
};

const listTrash = async (req, res) => {
  try {
    const config = getTrashEntity(req.params.entity);
    if (!config) return res.status(404).json({ success: false, message: 'Kh\u00f4ng h\u1ed7 tr\u1ee3 lo\u1ea1i d\u1eef li\u1ec7u n\u00e0y' });

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
    const config = getTrashEntity(req.params.entity);
    if (!config) return res.status(404).json({ success: false, message: 'Không hỗ trợ loại dữ liệu này' });
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
    const config = getTrashEntity(req.params.entity);
    if (!config) return res.status(404).json({ success: false, message: 'Không hỗ trợ loại dữ liệu này' });
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
    const config = getTrashEntity(req.params.entity);
    if (!config) return res.status(404).json({ success: false, message: 'Không hỗ trợ loại dữ liệu này' });
    const ids = parseBatchIds(config, req.body.ids || []);
    if (!ids.length) return res.status(400).json({ success: false, message: 'Vui lòng chọn dữ liệu cần khôi phục' });

    const result = await prisma[config.model].updateMany({
      where: { [config.pk]: { in: ids }, DaXoa: true },
      data: {
        DaXoa: false,
        NguoiXoa: null,
        NgayXoa: null,
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
    const config = getTrashEntity(req.params.entity);
    if (!config) return res.status(404).json({ success: false, message: 'Không hỗ trợ loại dữ liệu này' });
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
