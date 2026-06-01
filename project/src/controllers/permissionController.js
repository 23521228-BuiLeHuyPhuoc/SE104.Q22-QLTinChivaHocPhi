const prisma = require('../config/database');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { sendErrorResponse } = require('../utils/errorHandler');

// ── CHUCNANG (Functions) ──

const getAllFunctions = async (req, res) => {
  try {
    const where = { DaXoa: false };
    if (req.query.all === 'true') {
      const functions = await prisma.CHUCNANG.findMany({
        where,
        orderBy: { MaChucNang: 'asc' },
        include: { _count: { select: { PHANQUYEN: true } } }
      });
      return res.json({ success: true, data: functions });
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
    res.json({ success: true, data: functions, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'getAllFunctions error:');
  }
};

const createFunction = async (req, res) => {
  try {
    const { MaChucNang, TenChucNang, TenManHinhDuocLoad } = req.body;
    if (!MaChucNang || !TenChucNang || !TenManHinhDuocLoad) {
      return res.status(400).json({ success: false, message: 'Vui long nhap day du thong tin' });
    }
    const existing = await prisma.CHUCNANG.findUnique({ where: { MaChucNang } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ma chuc nang da ton tai' });
    }
    const func = await prisma.CHUCNANG.create({
      data: { MaChucNang, TenChucNang, TenManHinhDuocLoad, ...updateAudit(req) }
    });
    res.status(201).json({ success: true, message: 'Tao chuc nang thanh cong', data: func });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'createFunction error:');
  }
};

const updateFunction = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenChucNang, TenManHinhDuocLoad } = req.body;
    const func = await prisma.CHUCNANG.update({
      where: { MaChucNang: id },
      data: { TenChucNang, TenManHinhDuocLoad, ...updateAudit(req) }
    });
    res.json({ success: true, message: 'Cap nhat chuc nang thanh cong', data: func });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'updateFunction error:');
  }
};

const deleteFunction = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.CHUCNANG.update({ where: { MaChucNang: id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Xoa chuc nang thanh cong' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'deleteFunction error:');
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
          _count: { select: { TAIKHOAN: true, PHANQUYEN: true } }
        }
      });
      return res.json({ success: true, data: groups });
    }

    const { page, limit, skip } = getPagination(req.query);
    const [groups, total] = await Promise.all([
      prisma.NHOMNGUOIDUNG.findMany({
        where,
        skip,
        take: limit,
        orderBy: { MaNhom: 'asc' },
        include: {
          _count: { select: { TAIKHOAN: true, PHANQUYEN: true } }
        }
      }),
      prisma.NHOMNGUOIDUNG.count({ where })
    ]);
    res.json({ success: true, data: groups, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'getAllGroups error:');
  }
};

const createGroup = async (req, res) => {
  try {
    const { MaNhom, TenNhom } = req.body;
    if (!MaNhom || !TenNhom) {
      return res.status(400).json({ success: false, message: 'Vui long nhap day du thong tin' });
    }
    const existing = await prisma.NHOMNGUOIDUNG.findUnique({ where: { MaNhom } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ma nhom da ton tai' });
    }
    const group = await prisma.NHOMNGUOIDUNG.create({ data: { MaNhom, TenNhom, ...updateAudit(req) } });
    res.status(201).json({ success: true, message: 'Tao nhom thanh cong', data: group });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'createGroup error:');
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
    res.json({ success: true, message: 'Cap nhat nhom thanh cong', data: group });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'updateGroup error:');
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    if (['ADMIN', 'SINHVIEN'].includes(id)) {
      return res.status(400).json({ success: false, message: 'Khong the xoa nhom mac dinh' });
    }
    const count = await prisma.TAIKHOAN.count({ where: { MaNhom: id } });
    if (count > 0) {
      return res.status(400).json({ success: false, message: `Nhom dang co ${count} tai khoan, khong the xoa` });
    }
    await prisma.NHOMNGUOIDUNG.update({ where: { MaNhom: id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Xoa nhom thanh cong' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'deleteGroup error:');
  }
};

// ── PHANQUYEN (Permissions) ──

const getGroupPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const permissions = await prisma.PHANQUYEN.findMany({
      where: { MaNhom: id },
      include: { CHUCNANG: true }
    });
    res.json({ success: true, data: permissions });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'getGroupPermissions error:');
  }
};

const assignPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { MaChucNang } = req.body;
    if (!MaChucNang) {
      return res.status(400).json({ success: false, message: 'Thieu ma chuc nang' });
    }
    await prisma.PHANQUYEN.create({
      data: { MaNhom: id, MaChucNang }
    });
    res.status(201).json({ success: true, message: 'Gan quyen thanh cong' });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Quyen nay da duoc gan' });
    }
        return sendErrorResponse(res, error, 'Loi server', 'assignPermission error:');
  }
};

const removePermission = async (req, res) => {
  try {
    const { id, funcId } = req.params;
    await prisma.PHANQUYEN.delete({
      where: { MaNhom_MaChucNang: { MaNhom: id, MaChucNang: funcId } }
    });
    res.json({ success: true, message: 'Xoa quyen thanh cong' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'removePermission error:');
  }
};

const bulkUpdatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body; // array of MaChucNang strings
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Du lieu khong hop le' });
    }
    // Delete all existing permissions for this group
    await prisma.PHANQUYEN.deleteMany({ where: { MaNhom: id } });
    // Create new permissions
    if (permissions.length > 0) {
      await prisma.PHANQUYEN.createMany({
        data: permissions.map(MaChucNang => ({ MaNhom: id, MaChucNang }))
      });
    }
    res.json({ success: true, message: `Da cap nhat ${permissions.length} quyen cho nhom` });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'bulkUpdatePermissions error:');
  }
};

module.exports = {
  getAllFunctions, createFunction, updateFunction, deleteFunction,
  getAllGroups, createGroup, updateGroup, deleteGroup,
  getGroupPermissions, assignPermission, removePermission, bulkUpdatePermissions
};
