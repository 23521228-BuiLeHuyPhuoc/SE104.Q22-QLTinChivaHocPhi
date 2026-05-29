const prisma = require('../config/database');
const { getPagination, getPaginationMeta, notDeleted } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const semesterSelect = (hk) => ({
  MaHocKy: hk.MaHocKy,
  TenHocKy: hk.TenHocKy,
  MaNamHoc: hk.MaNamHoc,
  TenNamHoc: hk.NAMHOC?.TenNamHoc,
  LoaiHocKy: hk.LoaiHocKy,
  ThuTu: hk.ThuTu,
  NgayBatDau: hk.NgayBatDau,
  NgayKetThuc: hk.NgayKetThuc,
  NgayBatDauDangKy: hk.NgayBatDauDangKy,
  NgayKetThucDangKy: hk.NgayKetThucDangKy,
  HanDongHocPhi: hk.HanDongHocPhi,
  TrangThai: hk.TrangThai,
  NgayCapNhat: hk.NgayCapNhat,
  NguoiCapNhat: hk.NguoiCapNhat
});

const academicYearSelect = (year) => ({
  MaNamHoc: year.MaNamHoc,
  TenNamHoc: year.TenNamHoc,
  NamBatDau: year.NamBatDau,
  NamKetThuc: year.NamKetThuc,
  TrangThai: year.TrangThai
});

const parseAcademicYearCode = (value) => {
  const code = String(value || '').trim();
  const match = code.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  return {
    code: `${start}-${end}`,
    start,
    end
  };
};

const parseAcademicYearStatus = (value) => (
  value === undefined ? true : value === true || value === 'true' || value === 1 || value === '1'
);

const ensureSingleOngoingSemester = async (MaHocKy) => {
  const ongoing = await prisma.HOCKY.findFirst({
    where: {
      DaXoa: false,
      TrangThai: 'Đang diễn ra',
      MaHocKy: { not: MaHocKy }
    },
    select: { MaHocKy: true, TenHocKy: true }
  });

  if (ongoing) {
    const error = new Error(`Chỉ được có một học kỳ đang diễn ra. Học kỳ ${ongoing.MaHocKy} - ${ongoing.TenHocKy} đang diễn ra.`);
    error.status = 400;
    error.code = 'ONE_ACTIVE_SEMESTER';
    throw error;
  }
};

const getAllSemesters = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [semesters, total] = await Promise.all([
      prisma.HOCKY.findMany({
        where: notDeleted(),
        skip,
        take: limit,
        include: { NAMHOC: true },
        orderBy: [{ NAMHOC: { NamBatDau: 'desc' } }, { ThuTu: 'asc' }]
      }),
      prisma.HOCKY.count({ where: notDeleted() })
    ]);
    res.json({ success: true, data: semesters.map(semesterSelect), pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get all semesters error:');
  }
};

const getRegistrationOptions = async (req, res) => {
  try {
    // 1. Find the currently ongoing semester (only one should be active at a time)
    const ongoingSemester = await prisma.HOCKY.findFirst({
      where: {
        DaXoa: false,
        TrangThai: 'Đang diễn ra'
      },
      include: { NAMHOC: true }
    });

    if (ongoingSemester) {
      // If there is an ongoing semester, students can only register for this one!
      return res.json({ success: true, data: [semesterSelect(ongoingSemester)] });
    }

    // 2. Fallback: if no ongoing semester, return semesters that are 'Sắp diễn ra'
    const upcomingSemesters = await prisma.HOCKY.findMany({
      where: {
        DaXoa: false,
        TrangThai: 'Sắp diễn ra'
      },
      orderBy: [{ NgayBatDau: 'asc' }, { MaHocKy: 'asc' }],
      include: { NAMHOC: true }
    });

    if (upcomingSemesters.length) {
      return res.json({ success: true, data: upcomingSemesters.map(semesterSelect) });
    }

    const fallbackSemesters = await prisma.HOCKY.findMany({
      where: { DaXoa: false },
      take: 5,
      orderBy: [{ NgayBatDau: 'desc' }, { MaHocKy: 'desc' }],
      include: { NAMHOC: true }
    });
    res.json({ success: true, data: fallbackSemesters.map(semesterSelect).reverse() });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get registration options error:');
  }
};

const getActiveSemester = async (req, res) => {
  try {
    let hk = await prisma.HOCKY.findFirst({ where: { ...notDeleted(), OR: [{ TrangThai: 'Đang diễn ra' }, { TrangThai: 'Đang hoạt động' }] }, include: { NAMHOC: true } });
    if (!hk) hk = await prisma.HOCKY.findFirst({ where: { ...notDeleted(), OR: [{ TrangThai: 'Sắp diễn ra' }, { TrangThai: 'Sắp tới' }] }, include: { NAMHOC: true }, orderBy: { NgayBatDau: 'asc' } });
    if (!hk) return res.status(404).json({ success: false, message: 'Không có học kỳ nào đang hoạt động' });
    res.json({ success: true, data: semesterSelect(hk) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get active semester error:');
  }
};

const getSemesterById = async (req, res) => {
  try {
    const hk = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false }, include: { NAMHOC: true, LOPMO: true, PHIEUDANGKY: true } });
    if (!hk) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    res.json({ success: true, data: { ...semesterSelect(hk), stats: { openedClasses: hk.LOPMO.length, registrations: hk.PHIEUDANGKY.length } } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get semester by ID error:');
  }
};

const createSemester = async (req, res) => {
  try {
    const { MaHocKy, TenHocKy, MaNamHoc, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, NgayBatDauDangKy, NgayKetThucDangKy, HanDongHocPhi, TrangThai } = req.body;
    if (!MaHocKy || !TenHocKy || !MaNamHoc) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    const existing = await prisma.HOCKY.findUnique({ where: { MaHocKy } });
    if (existing && existing.DaXoa === false) return res.status(400).json({ success: false, message: 'Mã học kỳ đã tồn tại' });
    if (TrangThai === 'Đang diễn ra') await ensureSingleOngoingSemester(MaHocKy);
    const semester = await prisma.HOCKY.create({
      data: {
        MaHocKy,
        TenHocKy,
        MaNamHoc,
        LoaiHocKy,
        ThuTu: ThuTu ? parseInt(ThuTu, 10) : 1,
        NgayBatDau: NgayBatDau ? new Date(NgayBatDau) : null,
        NgayKetThuc: NgayKetThuc ? new Date(NgayKetThuc) : null,
        NgayBatDauDangKy: NgayBatDauDangKy ? new Date(NgayBatDauDangKy) : null,
        NgayKetThucDangKy: NgayKetThucDangKy ? new Date(NgayKetThucDangKy) : null,
        HanDongHocPhi: HanDongHocPhi ? new Date(HanDongHocPhi) : null,
        TrangThai: TrangThai || 'Sắp diễn ra',
        ...updateAudit(req)
      }
    });
    res.status(201).json({ success: true, message: 'Tạo học kỳ thành công', data: semester });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Create semester error:');
  }
};

const updateSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    const { TenHocKy, MaNamHoc, LoaiHocKy, ThuTu, NgayBatDau, NgayKetThuc, NgayBatDauDangKy, NgayKetThucDangKy, HanDongHocPhi, TrangThai } = req.body;
    const data = {};
    if (TenHocKy) data.TenHocKy = TenHocKy;
    if (MaNamHoc) data.MaNamHoc = MaNamHoc;
    if (LoaiHocKy) data.LoaiHocKy = LoaiHocKy;
    if (ThuTu !== undefined) data.ThuTu = parseInt(ThuTu, 10);
    if (TrangThai) {
      if (TrangThai === 'Đang diễn ra') await ensureSingleOngoingSemester(req.params.id);
      data.TrangThai = TrangThai;
    }
    if (NgayBatDau !== undefined) data.NgayBatDau = NgayBatDau ? new Date(NgayBatDau) : null;
    if (NgayKetThuc !== undefined) data.NgayKetThuc = NgayKetThuc ? new Date(NgayKetThuc) : null;
    if (NgayBatDauDangKy !== undefined) data.NgayBatDauDangKy = NgayBatDauDangKy ? new Date(NgayBatDauDangKy) : null;
    if (NgayKetThucDangKy !== undefined) data.NgayKetThucDangKy = NgayKetThucDangKy ? new Date(NgayKetThucDangKy) : null;
    if (HanDongHocPhi !== undefined) data.HanDongHocPhi = HanDongHocPhi ? new Date(HanDongHocPhi) : null;
    Object.assign(data, updateAudit(req));
    const updated = await prisma.HOCKY.update({ where: { MaHocKy: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật học kỳ thành công', data: updated });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Update semester error:');
  }
};

const deleteSemester = async (req, res) => {
  try {
    const existing = await prisma.HOCKY.findFirst({ where: { MaHocKy: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    await prisma.HOCKY.update({ where: { MaHocKy: req.params.id }, data: softDeleteAudit(req) });
    res.json({ success: true, message: 'Đã chuyển học kỳ vào thùng rác' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Delete semester error:');
  }
};

const getAcademicYears = async (req, res) => {
  try {
    const years = await prisma.NAMHOC.findMany({ where: { TrangThai: true }, orderBy: { TenNamHoc: 'desc' } });
    res.json({ success: true, data: years.map(academicYearSelect) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get academic years error:');
  }
};

const createAcademicYear = async (req, res) => {
  try {
    const { MaNamHoc, TenNamHoc, NamBatDau, NamKetThuc, TrangThai } = req.body;
    const parsed = parseAcademicYearCode(MaNamHoc || TenNamHoc);
    const code = parsed?.code || String(MaNamHoc || '').trim();
    const start = NamBatDau !== undefined ? parseInt(NamBatDau, 10) : parsed?.start;
    const end = NamKetThuc !== undefined ? parseInt(NamKetThuc, 10) : parsed?.end;

    if (!code || (!TenNamHoc && !parsed)) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập năm học theo định dạng 2025-2026' });
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
      return res.status(400).json({ success: false, message: 'Năm kết thúc phải lớn hơn năm bắt đầu' });
    }

    const existing = await prisma.NAMHOC.findUnique({ where: { MaNamHoc: code } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Năm học đã tồn tại', data: academicYearSelect(existing) });
    }

    const year = await prisma.NAMHOC.create({
      data: {
        MaNamHoc: code,
        TenNamHoc: String(TenNamHoc || code).trim(),
        NamBatDau: start,
        NamKetThuc: end,
        TrangThai: parseAcademicYearStatus(TrangThai)
      }
    });

    res.status(201).json({ success: true, message: 'Tạo năm học thành công', data: academicYearSelect(year) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Create academic year error:');
  }
};

const updateAcademicYear = async (req, res) => {
  try {
    const existing = await prisma.NAMHOC.findUnique({ where: { MaNamHoc: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy năm học' });

    const { TenNamHoc, NamBatDau, NamKetThuc, TrangThai } = req.body;
    const start = NamBatDau !== undefined ? parseInt(NamBatDau, 10) : existing.NamBatDau;
    const end = NamKetThuc !== undefined ? parseInt(NamKetThuc, 10) : existing.NamKetThuc;
    if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
      return res.status(400).json({ success: false, message: 'Năm kết thúc phải lớn hơn năm bắt đầu' });
    }

    const data = {
      NamBatDau: start,
      NamKetThuc: end
    };
    if (TenNamHoc !== undefined) {
      data.TenNamHoc = String(TenNamHoc || '').trim();
      if (!data.TenNamHoc) return res.status(400).json({ success: false, message: 'Tên năm học không được để trống' });
    }
    if (TrangThai !== undefined) data.TrangThai = parseAcademicYearStatus(TrangThai);

    const year = await prisma.NAMHOC.update({ where: { MaNamHoc: req.params.id }, data });
    res.json({ success: true, message: 'Cập nhật năm học thành công', data: academicYearSelect(year) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Update academic year error:');
  }
};

const deleteAcademicYear = async (req, res) => {
  try {
    const existing = await prisma.NAMHOC.findUnique({ where: { MaNamHoc: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy năm học' });

    const semesterCount = await prisma.HOCKY.count({ where: { MaNamHoc: req.params.id, DaXoa: false } });
    if (semesterCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa năm học đã có học kỳ. Hãy tạm khóa nếu không dùng nữa.'
      });
    }

    await prisma.NAMHOC.delete({ where: { MaNamHoc: req.params.id } });
    res.json({ success: true, message: 'Đã xóa năm học' });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Delete academic year error:');
  }
};

module.exports = {
  getAllSemesters,
  getRegistrationOptions,
  getActiveSemester,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear
};
