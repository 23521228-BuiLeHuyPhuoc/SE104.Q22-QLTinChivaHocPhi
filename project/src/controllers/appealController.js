const prisma = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { sendErrorResponse } = require('../utils/errorHandler');
const { assertAppealOpen } = require('../utils/registrationWindow');
const {
  APPEAL_TYPE,
  APPEAL_STATUS,
  REGISTRATION_STATUS
} = require('../utils/businessConstants');
const {
  recalculateRegistrationTotals,
  getCreditPrice,
  determineRegistrationType,
  ensureNoScheduleConflict,
  ensureCreditLimit,
  getStudentIdFromRequest,
  ensureStudentAccess
} = require('./registrationController');

const ACTIVE_REGISTRATION_STATUS = REGISTRATION_STATUS.ACTIVE;
const CANCELLED_REGISTRATION_STATUS = REGISTRATION_STATUS.CANCELLED;

const APPEAL_TYPE_LABELS = {
  [APPEAL_TYPE.ADD]: 'Thêm học phần',
  [APPEAL_TYPE.CANCEL]: 'Hủy học phần',
  [APPEAL_TYPE.CHANGE]: 'Đổi học phần'
};

const APPEAL_STATUS_LABELS = {
  [APPEAL_STATUS.PENDING]: 'Chờ duyệt',
  [APPEAL_STATUS.APPROVED]: 'Đã duyệt',
  [APPEAL_STATUS.REJECTED]: 'Từ chối',
  [APPEAL_STATUS.CANCELLED]: 'Đã hủy'
};

const getActorId = (req) => Number(req.user?.MaTaiKhoan || req.user?.id || 0) || null;

const normalizeAppealType = (value) => {
  const type = String(value || '').trim();
  return Object.values(APPEAL_TYPE).includes(type) ? type : '';
};

const trimOrNull = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

const appealInclude = {
  SINHVIEN: { select: { MaSv: true, HoTen: true, Email: true } },
  HOCKY: { include: { NAMHOC: true } },
  PHIEUDANGKY: true,
  LOP_HUY: { include: { MONHOC: true } },
  LOP_THEM: { include: { MONHOC: true } },
  TAIKHOAN: { select: { MaTaiKhoan: true, HoTen: true, TenDangNhap: true } }
};

const toAppealDto = (row) => ({
  id: row.id,
  MaSv: row.MaSv,
  HoTen: row.SINHVIEN?.HoTen || '',
  MaHocKy: row.MaHocKy,
  TenHocKy: row.HOCKY?.TenHocKy || row.MaHocKy,
  TenNamHoc: row.HOCKY?.NAMHOC?.TenNamHoc || '',
  SoPhieu: row.SoPhieu,
  LoaiDon: row.LoaiDon,
  LoaiDonLabel: APPEAL_TYPE_LABELS[row.LoaiDon] || row.LoaiDon,
  TrangThai: row.TrangThai,
  TrangThaiLabel: APPEAL_STATUS_LABELS[row.TrangThai] || row.TrangThai,
  MaLopHuy: row.MaLopHuy,
  TenLopHuy: row.LOP_HUY?.TenLop || '',
  MonHocHuy: row.LOP_HUY?.MONHOC?.TenMonHoc || '',
  MaLopThem: row.MaLopThem,
  TenLopThem: row.LOP_THEM?.TenLop || '',
  MonHocThem: row.LOP_THEM?.MONHOC?.TenMonHoc || '',
  LyDo: row.LyDo,
  LyDoTuChoi: row.LyDoTuChoi,
  NguoiDuyet: row.NguoiDuyet,
  NguoiDuyetTen: row.TAIKHOAN ? (row.TAIKHOAN.HoTen || row.TAIKHOAN.TenDangNhap) : '',
  NgayTao: row.NgayTao,
  NgayCapNhat: row.NgayCapNhat,
  NgayDuyet: row.NgayDuyet
});

const buildAppealWhere = (query = {}) => {
  const where = {};
  if (query.MaHocKy) where.MaHocKy = query.MaHocKy;
  if (query.MaSv) where.MaSv = query.MaSv;
  if (query.LoaiDon) where.LoaiDon = query.LoaiDon;
  if (query.TrangThai) where.TrangThai = query.TrangThai;

  const search = String(query.search || '').trim();
  if (search) {
    where.OR = [
      { MaSv: { contains: search, mode: 'insensitive' } },
      { SINHVIEN: { HoTen: { contains: search, mode: 'insensitive' } } },
      { MaLopHuy: { contains: search, mode: 'insensitive' } },
      { MaLopThem: { contains: search, mode: 'insensitive' } },
      { LyDo: { contains: search, mode: 'insensitive' } }
    ];
  }
  return where;
};

const validateAppealPayload = ({ LoaiDon, MaLopHuy, MaLopThem, LyDo }) => {
  if (!LoaiDon) throw { status: 400, message: 'Loại đơn cứu xét không hợp lệ' };
  if (!LyDo) throw { status: 400, message: 'Vui lòng nhập lý do cứu xét' };
  if (LoaiDon === APPEAL_TYPE.ADD && (!MaLopThem || MaLopHuy)) {
    throw { status: 400, message: 'Đơn thêm học phần cần đúng một lớp thêm' };
  }
  if (LoaiDon === APPEAL_TYPE.CANCEL && (!MaLopHuy || MaLopThem)) {
    throw { status: 400, message: 'Đơn hủy học phần cần đúng một lớp hủy' };
  }
  if (LoaiDon === APPEAL_TYPE.CHANGE && (!MaLopHuy || !MaLopThem)) {
    throw { status: 400, message: 'Đơn đổi học phần cần có lớp hủy và lớp thêm' };
  }
};

const ensureAppealBusinessRules = async (tx, { MaSv, MaHocKy, LoaiDon, MaLopHuy, MaLopThem }) => {
  const semester = await tx.HOCKY.findFirst({ where: { MaHocKy, DaXoa: false } });
  if (!semester) throw { status: 404, message: 'Không tìm thấy học kỳ' };
  assertAppealOpen(semester);
  if (semester.NgayChotDangKy || semester.MoThuHocPhi) {
    throw { status: 400, message: 'Học kỳ đã chốt đăng ký hoặc mở thu học phí, không thể gửi đơn cứu xét' };
  }

  const student = await tx.SINHVIEN.findFirst({ where: { MaSv, DaXoa: false }, select: { MaSv: true } });
  if (!student) throw { status: 404, message: 'Không tìm thấy sinh viên' };

  const phieu = await tx.PHIEUDANGKY.findFirst({ where: { MaSv, MaHocKy } });
  if ((LoaiDon === APPEAL_TYPE.CANCEL || LoaiDon === APPEAL_TYPE.CHANGE) && !phieu) {
    throw { status: 400, message: 'Sinh viên chưa có phiếu đăng ký để hủy hoặc đổi học phần' };
  }

  if (MaLopHuy) {
    const activeDetail = await tx.CHITIETDANGKY.findFirst({
      where: {
        SoPhieu: phieu?.SoPhieu || -1,
        MaLop: MaLopHuy,
        TrangThai: ACTIVE_REGISTRATION_STATUS
      }
    });
    if (!activeDetail) throw { status: 400, message: 'Lớp cần hủy không thuộc đăng ký đang học của sinh viên' };
  }

  if (MaLopThem) {
    const openedClass = await tx.LOPMO.findFirst({
      where: { MaHocKy, MaLop: MaLopThem, TrangThai: true, LOP: { DaXoa: false, TrangThai: true } },
      include: { LOP: { include: { MONHOC: true } } }
    });
    if (!openedClass || !openedClass.LOP) throw { status: 404, message: 'Lớp thêm không tồn tại hoặc chưa mở trong học kỳ này' };
  }

  const duplicate = await tx.DONCUUXETDANGKY.findFirst({
    where: {
      MaSv,
      MaHocKy,
      LoaiDon,
      MaLopHuy,
      MaLopThem,
      TrangThai: APPEAL_STATUS.PENDING
    }
  });
  if (duplicate) throw { status: 400, message: 'Đã có đơn cứu xét trùng nội dung đang chờ duyệt' };

  return { semester, phieu };
};

const getOrCreateRegistration = async (tx, MaSv, MaHocKy) => {
  let phieu = await tx.PHIEUDANGKY.findFirst({ where: { MaSv, MaHocKy } });
  if (!phieu) {
    phieu = await tx.PHIEUDANGKY.create({
      data: { MaSv, MaHocKy, TrangThai: ACTIVE_REGISTRATION_STATUS }
    });
  }
  return phieu;
};

const cancelClassInRegistration = async (tx, { phieu, MaHocKy, MaLop, reason }) => {
  const detail = await tx.CHITIETDANGKY.findFirst({
    where: { SoPhieu: phieu.SoPhieu, MaLop, TrangThai: ACTIVE_REGISTRATION_STATUS }
  });
  if (!detail) throw { status: 400, message: `Không tìm thấy đăng ký đang hoạt động của lớp ${MaLop}` };

  await tx.CHITIETDANGKY.update({
    where: { id: detail.id },
    data: { TrangThai: CANCELLED_REGISTRATION_STATUS, NgayHuy: new Date(), LyDoHuy: reason }
  });
  await tx.LOPMO.updateMany({
    where: { MaHocKy, MaLop, SoLuongDaDangKy: { gt: 0 } },
    data: { SoLuongDaDangKy: { decrement: 1 } }
  });

  return detail;
};

const addClassToRegistration = async (tx, { MaSv, MaHocKy, MaLop }) => {
  const openedClass = await tx.LOPMO.findFirst({
    where: { MaHocKy, MaLop, TrangThai: true },
    include: { LOP: { include: { MONHOC: true } } }
  });
  if (!openedClass || !openedClass.LOP) throw { status: 404, message: 'Lớp học không tồn tại hoặc chưa mở trong học kỳ này' };

  const lop = openedClass.LOP;
  const course = lop.MONHOC;
  const activeCount = await tx.CHITIETDANGKY.count({
    where: { MaLop, TrangThai: ACTIVE_REGISTRATION_STATUS, PHIEUDANGKY: { MaHocKy } }
  });
  if (Number(lop.SoLuongToiDa || 0) > 0 && activeCount >= Number(lop.SoLuongToiDa || 0)) {
    throw { status: 400, message: 'Lớp học đã hết chỗ' };
  }

  const phieu = await getOrCreateRegistration(tx, MaSv, MaHocKy);
  const existingReg = await tx.CHITIETDANGKY.findFirst({
    where: { SoPhieu: phieu.SoPhieu, MaMonHoc: course.MaMonHoc, TrangThai: ACTIVE_REGISTRATION_STATUS }
  });
  if (existingReg) throw { status: 400, message: 'Sinh viên đã đăng ký môn này' };

  const registrationType = await determineRegistrationType(tx, MaSv, course.MaMonHoc);
  const price = await getCreditPrice(tx, course.LoaiMon, registrationType, MaHocKy);
  const credits = Number(course.SoTinChi || 0);
  const amount = price * credits;

  await ensureNoScheduleConflict(tx, MaSv, MaHocKy, MaLop);
  await ensureCreditLimit(tx, MaSv, MaHocKy, phieu.SoPhieu, credits);

  const cancelledReg = await tx.CHITIETDANGKY.findFirst({
    where: { SoPhieu: phieu.SoPhieu, MaMonHoc: course.MaMonHoc, TrangThai: CANCELLED_REGISTRATION_STATUS }
  });

  const data = {
    SoPhieu: phieu.SoPhieu,
    MaLop,
    MaMonHoc: course.MaMonHoc,
    LoaiDangKy: registrationType,
    SoTinChi: credits,
    LoaiMon: course.LoaiMon,
    DonGia: price,
    ThanhTien: amount,
    TrangThai: ACTIVE_REGISTRATION_STATUS,
    NgayHuy: null,
    LyDoHuy: null
  };

  const detail = cancelledReg
    ? await tx.CHITIETDANGKY.update({ where: { id: cancelledReg.id }, data: { ...data, NgayDangKy: new Date() } })
    : await tx.CHITIETDANGKY.create({ data });

  await tx.LOPMO.updateMany({
    where: { MaHocKy, MaLop, TrangThai: true },
    data: { SoLuongDaDangKy: { increment: 1 } }
  });

  return { phieu, detail };
};

const getAllAppeals = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = buildAppealWhere(req.query);
    const [rows, total] = await Promise.all([
      prisma.DONCUUXETDANGKY.findMany({ where, skip, take: limit, orderBy: { NgayTao: 'desc' }, include: appealInclude }),
      prisma.DONCUUXETDANGKY.count({ where })
    ]);
    res.json({ success: true, data: rows.map(toAppealDto), pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'Get appeals error:');
  }
};

const getStudentAppeals = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    if (!(await ensureStudentAccess(req, res, studentId))) return;
    const { page, limit, skip } = getPagination(req.query);
    const where = { ...buildAppealWhere(req.query), MaSv: studentId };
    const [rows, total] = await Promise.all([
      prisma.DONCUUXETDANGKY.findMany({ where, skip, take: limit, orderBy: { NgayTao: 'desc' }, include: appealInclude }),
      prisma.DONCUUXETDANGKY.count({ where })
    ]);
    res.json({ success: true, data: rows.map(toAppealDto), pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'Get student appeals error:');
  }
};

const createAppeal = async (req, res) => {
  try {
    let MaSv = trimOrNull(req.body.MaSv);
    const MaHocKy = trimOrNull(req.body.MaHocKy);
    const LoaiDon = normalizeAppealType(req.body.LoaiDon || req.body.loaiDon);
    const MaLopHuy = trimOrNull(req.body.MaLopHuy);
    const MaLopThem = trimOrNull(req.body.MaLopThem);
    const LyDo = trimOrNull(req.body.LyDo || req.body.lyDo);

    if (req.user?.Role !== 'admin') {
      const currentStudentId = await getStudentIdFromRequest(req);
      if (!currentStudentId) return res.status(403).json({ success: false, message: 'Không xác định được sinh viên hiện tại' });
      if (MaSv && MaSv !== currentStudentId) return res.status(403).json({ success: false, message: 'Không thể gửi đơn cho sinh viên khác' });
      MaSv = currentStudentId;
    }

    if (!MaSv || !MaHocKy) return res.status(400).json({ success: false, message: 'Vui lòng chọn sinh viên và học kỳ' });
    validateAppealPayload({ LoaiDon, MaLopHuy, MaLopThem, LyDo });

    const result = await prisma.$transaction(async (tx) => {
      const { phieu } = await ensureAppealBusinessRules(tx, { MaSv, MaHocKy, LoaiDon, MaLopHuy, MaLopThem });
      return tx.DONCUUXETDANGKY.create({
        data: {
          MaSv,
          MaHocKy,
          SoPhieu: phieu?.SoPhieu || null,
          LoaiDon,
          TrangThai: APPEAL_STATUS.PENDING,
          MaLopHuy,
          MaLopThem,
          LyDo
        },
        include: appealInclude
      });
    });

    res.status(201).json({ success: true, message: 'Đã gửi đơn cứu xét đăng ký', data: toAppealDto(result) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message, code: error.code });
    return sendErrorResponse(res, error, 'Không thể gửi đơn cứu xét', 'Create appeal error:');
  }
};

const approveAppeal = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Mã đơn không hợp lệ' });

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL app.appeal_approval = '1'");
      const appeal = await tx.DONCUUXETDANGKY.findUnique({ where: { id }, include: appealInclude });
      if (!appeal) throw { status: 404, message: 'Không tìm thấy đơn cứu xét' };
      if (appeal.TrangThai !== APPEAL_STATUS.PENDING) throw { status: 400, message: 'Chỉ có thể duyệt đơn đang chờ duyệt' };

      const semester = await tx.HOCKY.findFirst({ where: { MaHocKy: appeal.MaHocKy, DaXoa: false } });
      if (!semester) throw { status: 404, message: 'Không tìm thấy học kỳ' };
      if (semester.NgayChotDangKy || semester.MoThuHocPhi) {
        throw { status: 400, message: 'Học kỳ đã chốt đăng ký hoặc mở thu học phí, không thể duyệt đơn cứu xét' };
      }

      let phieu = appeal.SoPhieu
        ? await tx.PHIEUDANGKY.findUnique({ where: { SoPhieu: appeal.SoPhieu } })
        : await tx.PHIEUDANGKY.findFirst({ where: { MaSv: appeal.MaSv, MaHocKy: appeal.MaHocKy } });

      if (appeal.LoaiDon === APPEAL_TYPE.ADD) {
        const added = await addClassToRegistration(tx, { MaSv: appeal.MaSv, MaHocKy: appeal.MaHocKy, MaLop: appeal.MaLopThem });
        phieu = added.phieu;
      } else if (appeal.LoaiDon === APPEAL_TYPE.CANCEL) {
        if (!phieu) throw { status: 400, message: 'Không tìm thấy phiếu đăng ký để hủy học phần' };
        await cancelClassInRegistration(tx, { phieu, MaHocKy: appeal.MaHocKy, MaLop: appeal.MaLopHuy, reason: 'Cứu xét hủy đăng ký' });
      } else if (appeal.LoaiDon === APPEAL_TYPE.CHANGE) {
        if (!phieu) throw { status: 400, message: 'Không tìm thấy phiếu đăng ký để đổi học phần' };
        await cancelClassInRegistration(tx, { phieu, MaHocKy: appeal.MaHocKy, MaLop: appeal.MaLopHuy, reason: 'Cứu xét đổi lớp' });
        const added = await addClassToRegistration(tx, { MaSv: appeal.MaSv, MaHocKy: appeal.MaHocKy, MaLop: appeal.MaLopThem });
        phieu = added.phieu;
      }

      await recalculateRegistrationTotals(tx, phieu.SoPhieu);
      const updated = await tx.DONCUUXETDANGKY.update({
        where: { id },
        data: {
          SoPhieu: phieu.SoPhieu,
          TrangThai: APPEAL_STATUS.APPROVED,
          NguoiDuyet: getActorId(req),
          NgayDuyet: new Date(),
          NgayCapNhat: new Date()
        },
        include: appealInclude
      });
      return updated;
    }, { isolationLevel: 'Serializable' });

    res.json({ success: true, message: 'Đã duyệt đơn cứu xét', data: toAppealDto(result) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message, code: error.code });
    return sendErrorResponse(res, error, 'Không thể duyệt đơn cứu xét', 'Approve appeal error:');
  }
};

const rejectAppeal = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const LyDoTuChoi = trimOrNull(req.body.LyDoTuChoi || req.body.reason || req.body.lyDoTuChoi);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Mã đơn không hợp lệ' });
    if (!LyDoTuChoi) return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối' });

    const existing = await prisma.DONCUUXETDANGKY.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn cứu xét' });
    if (existing.TrangThai !== APPEAL_STATUS.PENDING) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể từ chối đơn đang chờ duyệt' });
    }

    const updated = await prisma.DONCUUXETDANGKY.update({
      where: { id },
      data: {
        TrangThai: APPEAL_STATUS.REJECTED,
        LyDoTuChoi,
        NguoiDuyet: getActorId(req),
        NgayDuyet: new Date(),
        NgayCapNhat: new Date()
      },
      include: appealInclude
    });
    res.json({ success: true, message: 'Đã từ chối đơn cứu xét', data: toAppealDto(updated) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Không thể từ chối đơn cứu xét', 'Reject appeal error:');
  }
};

const cancelAppeal = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Mã đơn không hợp lệ' });

    const existing = await prisma.DONCUUXETDANGKY.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn cứu xét' });
    if (!(await ensureStudentAccess(req, res, existing.MaSv))) return;
    if (existing.TrangThai !== APPEAL_STATUS.PENDING) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn đang chờ duyệt' });
    }

    const updated = await prisma.DONCUUXETDANGKY.update({
      where: { id },
      data: { TrangThai: APPEAL_STATUS.CANCELLED, NgayCapNhat: new Date() },
      include: appealInclude
    });
    res.json({ success: true, message: 'Đã hủy đơn cứu xét', data: toAppealDto(updated) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Không thể hủy đơn cứu xét', 'Cancel appeal error:');
  }
};

module.exports = {
  getAllAppeals,
  getStudentAppeals,
  createAppeal,
  approveAppeal,
  rejectAppeal,
  cancelAppeal
};
