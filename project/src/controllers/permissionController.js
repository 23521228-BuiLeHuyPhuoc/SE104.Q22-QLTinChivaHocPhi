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
        return sendErrorResponse(res, error, 'Lỗi server', 'getAllFunctions error:');
  }
};

const createFunction = async (req, res) => {
  try {
    const { MaChucNang, TenChucNang, TenManHinhDuocLoad } = req.body;
    if (!MaChucNang || !TenChucNang || !TenManHinhDuocLoad) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const existing = await prisma.CHUCNANG.findUnique({ where: { MaChucNang } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã chức năng đã tồn tại' });
    }
    const func = await prisma.CHUCNANG.create({
      data: { MaChucNang, TenChucNang, TenManHinhDuocLoad, ...updateAudit(req) }
    });
    res.status(201).json({ success: true, message: 'Tạo chức năng thành công', data: func });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'createFunction error:');
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
    res.json({ success: true, message: 'Cập nhật chức năng thành công', data: func });
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
        return sendErrorResponse(res, error, 'Lỗi server', 'getAllGroups error:');
  }
};

const createGroup = async (req, res) => {
  try {
    const { MaNhom, TenNhom } = req.body;
    if (!MaNhom || !TenNhom) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const existing = await prisma.NHOMNGUOIDUNG.findUnique({ where: { MaNhom } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã nhóm đã tồn tại' });
    }
    const group = await prisma.NHOMNGUOIDUNG.create({ data: { MaNhom, TenNhom, ...updateAudit(req) } });
    res.status(201).json({ success: true, message: 'Tạo nhóm thành công', data: group });
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
    res.json({ success: true, message: 'Cập nhật nhóm thành công', data: group });
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
      where: { MaNhom: id },
      include: { CHUCNANG: true }
    });
    res.json({ success: true, data: permissions });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getGroupPermissions error:');
  }
};

const assignPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { MaChucNang } = req.body;
    if (!MaChucNang) {
      return res.status(400).json({ success: false, message: 'Thiếu mã chức năng' });
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
    // Delete all existing permissions for this group
    await prisma.PHANQUYEN.deleteMany({ where: { MaNhom: id } });
    // Create new permissions
    if (permissions.length > 0) {
      await prisma.PHANQUYEN.createMany({
        data: permissions.map(MaChucNang => ({ MaNhom: id, MaChucNang }))
      });
    }
    res.json({ success: true, message: `Đã cập nhật ${permissions.length} quyền cho nhóm` });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'bulkUpdatePermissions error:');
  }
};

module.exports = {
  getAllFunctions, createFunction, updateFunction, deleteFunction,
  getAllGroups, createGroup, updateGroup, deleteGroup,
  getGroupPermissions, assignPermission, removePermission, bulkUpdatePermissions
};
