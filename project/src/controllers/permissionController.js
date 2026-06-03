const prisma = require('../config/database');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { sendErrorResponse } = require('../utils/errorHandler');
const {
  decorateGroup,
  decoratePermissionFunction,
  getPermissionPortal,
  isPermissionCompatibleWithGroup
} = require('../utils/permissionCatalog');

// ── CHUCNANG (Functions) ──

const normalizeFunctionPayload = (body = {}) => ({
  MaChucNang: String(body.MaChucNang || '').trim().toUpperCase(),
  TenChucNang: String(body.TenChucNang || '').trim(),
  TenManHinhDuocLoad: String(body.TenManHinhDuocLoad || '').trim()
});

const hasPortalMismatch = (permission) => {
  const code = String(permission.MaChucNang || '').toUpperCase();
  const screen = String(permission.TenManHinhDuocLoad || '');
  const portal = getPermissionPortal(permission).key;
  if (code.startsWith('ADMIN_') && portal !== 'admin') return true;
  if (code.startsWith('STUDENT_') && portal !== 'student') return true;
  if (screen.startsWith('/admin') && code.startsWith('STUDENT_')) return true;
  if (screen.startsWith('/student') && code.startsWith('ADMIN_')) return true;
  return false;
};

const decorateGroupForResponse = (group) => decorateGroup({
  ...group,
  _count: {
    ...(group._count || {}),
    PHANQUYEN: Array.isArray(group.PHANQUYEN)
      ? group.PHANQUYEN.length
      : group._count?.PHANQUYEN || 0
  },
  PHANQUYEN: undefined
});

const getAllFunctions = async (req, res) => {
  try {
    const where = { DaXoa: false };
    if (req.query.all === 'true') {
      const functions = await prisma.CHUCNANG.findMany({
        where,
        orderBy: { MaChucNang: 'asc' },
        include: { _count: { select: { PHANQUYEN: true } } }
      });
      return res.json({ success: true, data: functions.map(decoratePermissionFunction) });
    }

    const { page, limit, skip } = getPagination(req.query);
    const [functions, total] = await Promise.all([
      prisma.CHUCNANG.findMany({
        where,
        skip,
        take: limit,
        orderBy: { MaChucNang: 'asc' },
        include: { _count: { select: { PHANQUYEN: true } } }
      }),
      prisma.CHUCNANG.count({ where })
    ]);
    res.json({ success: true, data: functions.map(decoratePermissionFunction), pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getAllFunctions error:');
  }
};

const createFunction = async (req, res) => {
  try {
    const { MaChucNang, TenChucNang, TenManHinhDuocLoad } = normalizeFunctionPayload(req.body);
    if (!MaChucNang || !TenChucNang || !TenManHinhDuocLoad) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    if (hasPortalMismatch({ MaChucNang, TenManHinhDuocLoad })) {
      return res.status(400).json({ success: false, message: 'Mã quyền không khớp với cổng màn hình' });
    }
    const existing = await prisma.CHUCNANG.findUnique({ where: { MaChucNang } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã chức năng đã tồn tại' });
    }
    const func = await prisma.CHUCNANG.create({
      data: { MaChucNang, TenChucNang, TenManHinhDuocLoad, ...updateAudit(req) }
    });
    res.status(201).json({ success: true, message: 'Tạo chức năng thành công', data: decoratePermissionFunction(func) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'createFunction error:');
  }
};

const updateFunction = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenChucNang, TenManHinhDuocLoad } = normalizeFunctionPayload(req.body);
    if (hasPortalMismatch({ MaChucNang: id, TenManHinhDuocLoad })) {
      return res.status(400).json({ success: false, message: 'Mã quyền không khớp với cổng màn hình' });
    }
    const func = await prisma.CHUCNANG.update({
      where: { MaChucNang: id },
      data: { TenChucNang, TenManHinhDuocLoad, ...updateAudit(req) }
    });
    res.json({ success: true, message: 'Cập nhật chức năng thành công', data: decoratePermissionFunction(func) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'updateFunction error:');
  }
};

const deleteFunction = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.CHUCNANG.update({ where: { MaChucNang: id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Xóa chức năng thành công' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'deleteFunction error:');
  }
};

// ── NHOMNGUOIDUNG (Groups) ──

const getAllGroups = async (req, res) => {
  try {
    const where = { DaXoa: false };
    if (req.query.all === 'true') {
      const groups = await prisma.NHOMNGUOIDUNG.findMany({
        where,
        orderBy: { MaNhom: 'asc' },
        include: {
          _count: { select: { TAIKHOAN: true } },
          PHANQUYEN: {
            where: { CHUCNANG: { DaXoa: false } },
            select: { MaChucNang: true }
          }
        }
      });
      return res.json({ success: true, data: groups.map(decorateGroupForResponse) });
    }

    const { page, limit, skip } = getPagination(req.query);
    const [groups, total] = await Promise.all([
      prisma.NHOMNGUOIDUNG.findMany({
        where,
        skip,
        take: limit,
        orderBy: { MaNhom: 'asc' },
        include: {
          _count: { select: { TAIKHOAN: true } },
          PHANQUYEN: {
            where: { CHUCNANG: { DaXoa: false } },
            select: { MaChucNang: true }
          }
        }
      }),
      prisma.NHOMNGUOIDUNG.count({ where })
    ]);
    res.json({ success: true, data: groups.map(decorateGroupForResponse), pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getAllGroups error:');
  }
};

const createGroup = async (req, res) => {
  try {
    const MaNhom = String(req.body.MaNhom || '').trim().toUpperCase();
    const TenNhom = String(req.body.TenNhom || '').trim();
    if (!MaNhom || !TenNhom) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const existing = await prisma.NHOMNGUOIDUNG.findUnique({ where: { MaNhom } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã nhóm đã tồn tại' });
    }
    const group = await prisma.NHOMNGUOIDUNG.create({ data: { MaNhom, TenNhom, ...updateAudit(req) } });
    res.status(201).json({ success: true, message: 'Tạo nhóm thành công', data: decorateGroup(group) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'createGroup error:');
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenNhom } = req.body;
    const group = await prisma.NHOMNGUOIDUNG.update({
      where: { MaNhom: id },
      data: { TenNhom, ...updateAudit(req) }
    });
    res.json({ success: true, message: 'Cập nhật nhóm thành công', data: decorateGroup(group) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'updateGroup error:');
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    if (['ADMIN', 'SINHVIEN'].includes(id)) {
      return res.status(400).json({ success: false, message: 'Không thể xóa nhóm mặc định' });
    }
    const count = await prisma.TAIKHOAN.count({ where: { MaNhom: id } });
    if (count > 0) {
      return res.status(400).json({ success: false, message: `Nhóm đang có ${count} tài khoản, không thể xóa` });
    }
    await prisma.NHOMNGUOIDUNG.update({ where: { MaNhom: id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Xóa nhóm thành công' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'deleteGroup error:');
  }
};

// ── PHANQUYEN (Permissions) ──

const getGroupPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const permissions = await prisma.PHANQUYEN.findMany({
      where: {
        MaNhom: id,
        CHUCNANG: { DaXoa: false }
      },
      include: { CHUCNANG: true }
    });
    res.json({
      success: true,
      data: permissions.map(permission => ({
        ...permission,
        CHUCNANG: decoratePermissionFunction(permission.CHUCNANG)
      }))
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getGroupPermissions error:');
  }
};

const assignPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const MaChucNang = String(req.body.MaChucNang || '').trim().toUpperCase();
    if (!MaChucNang) {
      return res.status(400).json({ success: false, message: 'Thiếu mã chức năng' });
    }
    const func = await prisma.CHUCNANG.findFirst({ where: { MaChucNang, DaXoa: false } });
    if (!func) {
      return res.status(400).json({ success: false, message: 'Quyền không tồn tại hoặc đã bị xóa' });
    }
    if (!isPermissionCompatibleWithGroup(id, func)) {
      return res.status(400).json({ success: false, message: 'Không thể gán quyền khác cổng cho nhóm này' });
    }
    await prisma.PHANQUYEN.create({
      data: { MaNhom: id, MaChucNang }
    });
    res.status(201).json({ success: true, message: 'Gán quyền thành công' });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Quyền này đã được gán' });
    }
        return sendErrorResponse(res, error, 'Lỗi server', 'assignPermission error:');
  }
};

const removePermission = async (req, res) => {
  try {
    const { id, funcId } = req.params;
    await prisma.PHANQUYEN.delete({
      where: { MaNhom_MaChucNang: { MaNhom: id, MaChucNang: funcId } }
    });
    res.json({ success: true, message: 'Xóa quyền thành công' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'removePermission error:');
  }
};

const bulkUpdatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body; // array of MaChucNang strings
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }
    const permissionCodes = [...new Set(permissions
      .map(code => String(code || '').trim().toUpperCase())
      .filter(Boolean))];

    const funcs = permissionCodes.length > 0
      ? await prisma.CHUCNANG.findMany({
        where: { MaChucNang: { in: permissionCodes }, DaXoa: false }
      })
      : [];

    if (funcs.length !== permissionCodes.length) {
      return res.status(400).json({ success: false, message: 'Danh sách quyền có quyền không tồn tại hoặc đã bị xóa' });
    }

    const invalidFunc = funcs.find(func => !isPermissionCompatibleWithGroup(id, func));
    if (invalidFunc) {
      return res.status(400).json({ success: false, message: 'Không thể gán quyền khác cổng cho nhóm này' });
    }
    // Delete all existing permissions for this group
    await prisma.PHANQUYEN.deleteMany({ where: { MaNhom: id } });
    // Create new permissions
    if (permissionCodes.length > 0) {
      await prisma.PHANQUYEN.createMany({
        data: permissionCodes.map(MaChucNang => ({ MaNhom: id, MaChucNang })),
        skipDuplicates: true
      });
    }
    res.json({ success: true, message: `Đã cập nhật ${permissionCodes.length} quyền cho nhóm` });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'bulkUpdatePermissions error:');
  }
};

module.exports = {
  getAllFunctions, createFunction, updateFunction, deleteFunction,
  getAllGroups, createGroup, updateGroup, deleteGroup,
  getGroupPermissions, assignPermission, removePermission, bulkUpdatePermissions
};
