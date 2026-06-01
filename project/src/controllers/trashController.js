const prisma = require('../config/database');
const { TRASH_ENTITIES, getTrashEntity, parseTrashId, getTrashTitle } = require('../utils/trashConfig');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
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
    if (!config) return res.status(404).json({ success: false, message: 'Khong ho tro loai du lieu nay' });

    const { page, limit, skip } = getPagination(req.query);
    const model = prisma[config.model];
    const [rows, total] = await Promise.all([
      model.findMany({
        where: { DaXoa: true },
        skip,
        take: limit,
        orderBy: { NgayXoa: 'desc' }
      }),
      model.count({ where: { DaXoa: true } })
    ]);

    res.json({
      success: true,
      data: await decorateRows(config, rows),
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'listTrash error:');
  }
};

const restoreTrashItem = async (req, res) => {
  try {
    const config = getTrashEntity(req.params.entity);
    if (!config) return res.status(404).json({ success: false, message: 'Khong ho tro loai du lieu nay' });
    const id = parseTrashId(config, req.params.id);
    if (config.type === 'int' && !Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'ID khong hop le' });
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

    res.json({ success: true, message: 'Khoi phuc thanh cong', data: row });
  } catch (error) {
        return sendErrorResponse(res, error, 'Khong the khoi phuc du lieu', 'restoreTrashItem error:');
  }
};

const purgeTrashItem = async (req, res) => {
  try {
    const config = getTrashEntity(req.params.entity);
    if (!config) return res.status(404).json({ success: false, message: 'Khong ho tro loai du lieu nay' });
    const id = parseTrashId(config, req.params.id);
    if (config.type === 'int' && !Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'ID khong hop le' });
    }

    await prisma[config.model].delete({ where: { [config.pk]: id } });
    res.json({ success: true, message: 'Da xoa vinh vien' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Khong the xoa vinh vien do du lieu dang duoc tham chieu', 'purgeTrashItem error:');
  }
};

module.exports = {
  listEntities,
  listTrash,
  restoreTrashItem,
  purgeTrashItem
};
