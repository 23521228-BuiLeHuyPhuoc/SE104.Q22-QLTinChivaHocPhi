const prisma = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { sendErrorResponse } = require('../utils/errorHandler');
const { assertRegistrationOpen, getRegistrationWindowState } = require('../utils/registrationWindow');

const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';
const CANCELLED_REGISTRATION_STATUS = 'Đã hủy';
const PAYMENT_SUCCESS_STATUS = 'Thành công';
const PAID_REGISTRATION_LOCK_MESSAGE = 'Phiếu đăng ký đã có phiếu thu thành công, không thể đăng ký thêm hoặc hủy môn. Vui lòng liên hệ phòng tài chính để xử lý.';

const REGISTRATION_TYPE_LABELS = {
  hoc_moi: 'Học mới',
  hoc_lai: 'Học lại',
  hoc_cai_thien: 'Cải thiện'
};

const getRegistrationTypeLabel = (type) => REGISTRATION_TYPE_LABELS[type] || type || 'Học mới';

const lecturerDisplayName = (lecturer) => {
  if (!lecturer) return '';
  return [lecturer.HocHamHocVi, lecturer.HoTen].filter(Boolean).join(' ').trim();
};

const openedClassLecturerName = (openedClass) =>
  lecturerDisplayName(openedClass?.GIANGVIEN) || openedClass?.GiangVien || openedClass?.MaGiangVien || '';

const priceOrder = [{ NgayApDung: 'desc' }, { id: 'desc' }];

const hasSuccessfulPayment = (registration) =>
  Boolean(registration?.PHIEUTHUHOCPHI?.some((payment) => payment.TrangThai === PAYMENT_SUCCESS_STATUS));

const weekdayLabel = (value) => {
  const day = Number(value);
  if (day === 1) return 'Chủ nhật';
  if (day >= 2 && day <= 7) return `Thứ ${day}`;
  return value ? `Thứ ${value}` : '';
};

const periodRangeLabel = (schedule) => {
  const start = schedule?.TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC?.TenTiet || schedule?.MaTietBatDau;
  const end = schedule?.TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC?.TenTiet || schedule?.MaTietKetThuc;
  if (!start && !end) return '';
  return start === end ? start : `${start}-${end}`;
};

const roomDisplayName = (room) => {
  if (!room) return '';
  return [room.MaPhong, room.TenPhong].filter(Boolean).join(' - ');
};

const openedClassScheduleLabel = (openedClass) => {
  const schedules = (openedClass?.LICHHOCLOP || []).filter((schedule) => schedule.TrangThai !== false);
  if (!schedules.length) return '';
  return schedules.map((schedule) => {
    const room = roomDisplayName(schedule.PHONGHOC) || schedule.PhongHoc || schedule.MaPhong;
    return [weekdayLabel(schedule.ThuTrongTuan), periodRangeLabel(schedule)].filter(Boolean).join(' ') + (room ? ` (${room})` : '');
  }).join('; ');
};

const openedClassRoomLabel = (openedClass) => {
  const schedule = (openedClass?.LICHHOCLOP || []).find((item) => item.TrangThai !== false && (item.PHONGHOC || item.PhongHoc || item.MaPhong));
  return roomDisplayName(schedule?.PHONGHOC) || schedule?.PhongHoc || schedule?.MaPhong || '';
};

const getStudentIdFromRequest = async (req) => {
  if (req.user?.Role === 'admin') return null;
  if (req.user?.MaSv) return req.user.MaSv;
  const student = await prisma.SINHVIEN.findFirst({
    where: { MaTaiKhoan: Number(req.user?.MaTaiKhoan || req.user?.id || 0) },
    select: { MaSv: true }
  });
  return student?.MaSv || null;
};

const ensureStudentAccess = async (req, res, studentId) => {
  if (req.user?.Role === 'admin') return true;
  const currentStudentId = await getStudentIdFromRequest(req);
  if (currentStudentId && currentStudentId === studentId) return true;
  res.status(403).json({ success: false, message: 'Không có quyền truy cập dữ liệu sinh viên này' });
  return false;
};

const getApplicablePriceType = async (tx, loaiHoc, maHocKy) => {
  if (loaiHoc !== 'hoc_moi' || !maHocKy) return loaiHoc || 'hoc_moi';
  const semester = await tx.HOCKY.findUnique({
    where: { MaHocKy: maHocKy },
    select: { LoaiHocKy: true }
  });
  return semester?.LoaiHocKy === 'Hè' ? 'hoc_he' : loaiHoc;
};

const findCreditPrice = (tx, loaiMon, loaiHoc, maHocKy) => tx.DONGIATINCHI.findFirst({
  where: {
    LoaiMon: loaiMon,
    LoaiHoc: loaiHoc,
    MaHocKy: maHocKy,
    DaXoa: false,
    TrangThai: true
  },
  orderBy: priceOrder
});

const getCreditPrice = async (tx, loaiMon, loaiHoc, maHocKy) => {
  const priceType = await getApplicablePriceType(tx, loaiHoc, maHocKy);
  const semesterPrice = maHocKy ? await findCreditPrice(tx, loaiMon, priceType, maHocKy) : null;
  if (semesterPrice) return Number(semesterPrice.DonGia);

  const defaultPrice = await findCreditPrice(tx, loaiMon, priceType, null);
  if (defaultPrice) return Number(defaultPrice.DonGia);

  return loaiMon === 'TH' ? 37000 : 27000;
};

const determineRegistrationType = async (tx, maSv, maMonHoc) => {
  if (!maSv || !maMonHoc) return 'hoc_moi';
  const history = await tx.MONDAHOC.findMany({
    where: { MaSv: maSv, MaMonHoc: maMonHoc, DaXoa: false },
    select: { KetQua: true }
  });
  if (history.some((item) => item.KetQua === 'qua_mon')) return 'hoc_cai_thien';
  if (history.some((item) => item.KetQua === 'rot')) return 'hoc_lai';
  return 'hoc_moi';
};

const getStudentDiscountRate = async (tx, maSv) => {
  const rows = await tx.DOITUONGSINHVIEN.findMany({
    where: { MaSv: maSv },
    include: { DOITUONG: true }
  });
  const activeRows = rows
    .filter((row) => row.DOITUONG && row.DOITUONG.TrangThai !== false)
    .sort((a, b) => Number(a.DOITUONG.DoUuTien || 9999) - Number(b.DOITUONG.DoUuTien || 9999));
  return activeRows.length ? Number(activeRows[0].DOITUONG.TiLeGiamHocPhi || 0) : 0;
};

const getEnglishLimitInfo = async (tx, maSv, maHocKy) => {
  const [settings, student, semester] = await Promise.all([
    tx.THAMSO.findFirst(),
    tx.SINHVIEN.findFirst({ where: { MaSv: maSv, DaXoa: false }, select: { NgayNhapHoc: true } }),
    tx.HOCKY.findFirst({ where: { MaHocKy: maHocKy, DaXoa: false }, select: { NgayBatDau: true } })
  ]);

  const englishCourses = String(settings?.DanhSachMonAnhVanBatBuoc || 'ENG01,ENG02,ENG03')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const normalMax = Number(settings?.SoTinChiDangKyToiDa || 24);
  const limitedMax = Number(settings?.GioiHanTinChiChuaDatAnhVan || 14);
  const checkYears = Number(settings?.NamKiemTraAnhVan || 2);
  if (!student?.NgayNhapHoc || !englishCourses.length) return { maxCredits: normalMax, limited: false, missingCourses: [] };

  const cutoff = new Date(student.NgayNhapHoc);
  cutoff.setFullYear(cutoff.getFullYear() + checkYears);
  const semesterStart = semester?.NgayBatDau ? new Date(semester.NgayBatDau) : new Date();
  if (semesterStart <= cutoff) return { maxCredits: normalMax, limited: false, missingCourses: [] };

  const passed = await tx.MONDAHOC.findMany({
    where: { MaSv: maSv, MaMonHoc: { in: englishCourses }, KetQua: 'qua_mon', DaXoa: false },
    select: { MaMonHoc: true }
  });
  const passedSet = new Set(passed.map((item) => item.MaMonHoc));
  const missingCourses = englishCourses.filter((course) => !passedSet.has(course));
  if (!missingCourses.length) return { maxCredits: normalMax, limited: false, missingCourses: [] };
  return { maxCredits: Math.min(normalMax, limitedMax), limited: true, missingCourses };
};

const ensureCreditLimit = async (tx, maSv, maHocKy, soPhieu, creditsToAdd) => {
  const phieu = await tx.PHIEUDANGKY.findUnique({
    where: { SoPhieu: soPhieu },
    include: { CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS }, select: { SoTinChi: true } } }
  });
  const currentCredits = phieu?.CHITIETDANGKY.reduce((sum, item) => sum + Number(item.SoTinChi || 0), 0) || 0;
  const limitInfo = await getEnglishLimitInfo(tx, maSv, maHocKy);
  const nextCredits = currentCredits + Number(creditsToAdd || 0);
  if (nextCredits > limitInfo.maxCredits) {
    const reason = limitInfo.limited
      ? `Sinh viên chưa hoàn tất ${limitInfo.missingCourses.join(', ')} sau cuối năm ${Number((await tx.THAMSO.findFirst())?.NamKiemTraAnhVan || 2)}, tối đa ${limitInfo.maxCredits} tín chỉ`
      : `Vượt quá số tín chỉ tối đa ${limitInfo.maxCredits}`;
    throw { status: 400, message: reason };
  }
};

const ensureNoScheduleConflict = async (tx, maSv, maHocKy, maLop) => {
  const conflicts = await tx.$queryRaw`
    SELECT c_old.id, c_old."MaLop", mh."TenMonHoc", lh_old."ThuTrongTuan"
    FROM "LOPMO" lm_new
    JOIN "LICHHOCLOP" lh_new ON lh_new."LopMoId" = lm_new.id AND COALESCE(lh_new."TrangThai", TRUE) = TRUE
    JOIN "TIETHOC" tbn ON tbn."MaTiet" = lh_new."MaTietBatDau"
    JOIN "TIETHOC" ten ON ten."MaTiet" = lh_new."MaTietKetThuc"
    JOIN "PHIEUDANGKY" p_old ON p_old."MaSv" = ${maSv} AND p_old."MaHocKy" = ${maHocKy}
    JOIN "CHITIETDANGKY" c_old ON c_old."SoPhieu" = p_old."SoPhieu" AND c_old."TrangThai" = ${ACTIVE_REGISTRATION_STATUS}
    JOIN "LOPMO" lm_old ON lm_old."MaHocKy" = p_old."MaHocKy" AND lm_old."MaLop" = c_old."MaLop" AND COALESCE(lm_old."TrangThai", TRUE) = TRUE
    JOIN "LICHHOCLOP" lh_old ON lh_old."LopMoId" = lm_old.id AND COALESCE(lh_old."TrangThai", TRUE) = TRUE
    JOIN "TIETHOC" tbo ON tbo."MaTiet" = lh_old."MaTietBatDau"
    JOIN "TIETHOC" teo ON teo."MaTiet" = lh_old."MaTietKetThuc"
    LEFT JOIN "MONHOC" mh ON mh."MaMonHoc" = c_old."MaMonHoc"
    WHERE lm_new."MaHocKy" = ${maHocKy}
      AND lm_new."MaLop" = ${maLop}
      AND COALESCE(lm_new."TrangThai", TRUE) = TRUE
      AND lh_new."ThuTrongTuan" = lh_old."ThuTrongTuan"
      AND tbn."ThuTu" <= teo."ThuTu"
      AND tbo."ThuTu" <= ten."ThuTu"
    LIMIT 1
  `;
  if (conflicts.length) {
    throw { status: 400, message: `Trùng lịch học với lớp ${conflicts[0].MaLop}${conflicts[0].TenMonHoc ? ` - ${conflicts[0].TenMonHoc}` : ''}` };
  }
};

const recalculateRegistrationTotals = async (tx, soPhieu) => {
  const phieu = await tx.PHIEUDANGKY.findUnique({
    where: { SoPhieu: soPhieu },
    include: { CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS } } }
  });
  if (!phieu) return null;

  const summary = {
    TongTinChi: 0,
    TongTienDangKy: 0,
    SoMonHocMoi: 0,
    SoTinChiHocMoi: 0,
    TienHocMoi: 0,
    SoMonHocLai: 0,
    SoTinChiHocLai: 0,
    TienHocLai: 0,
    SoMonHocCaiThien: 0,
    SoTinChiHocCaiThien: 0,
    TienHocCaiThien: 0
  };

  phieu.CHITIETDANGKY.forEach((item) => {
    const credits = Number(item.SoTinChi || 0);
    const amount = Number(item.ThanhTien || 0);
    summary.TongTinChi += credits;
    summary.TongTienDangKy += amount;

    if (item.LoaiDangKy === 'hoc_lai') {
      summary.SoMonHocLai += 1;
      summary.SoTinChiHocLai += credits;
      summary.TienHocLai += amount;
    } else if (item.LoaiDangKy === 'hoc_cai_thien') {
      summary.SoMonHocCaiThien += 1;
      summary.SoTinChiHocCaiThien += credits;
      summary.TienHocCaiThien += amount;
    } else {
      summary.SoMonHocMoi += 1;
      summary.SoTinChiHocMoi += credits;
      summary.TienHocMoi += amount;
    }
  });

  const discountRate = await getStudentDiscountRate(tx, phieu.MaSv);
  const discountAmount = Math.round(summary.TongTienDangKy * discountRate / 100);
  const amountDue = Math.max(summary.TongTienDangKy - discountAmount, 0);

  return tx.PHIEUDANGKY.update({
    where: { SoPhieu: soPhieu },
    data: {
      ...summary,
      TiLeGiam: discountRate,
      TienMienGiam: discountAmount,
      TongTienPhaiDong: amountDue,
      TrangThai: phieu.CHITIETDANGKY.length ? ACTIVE_REGISTRATION_STATUS : CANCELLED_REGISTRATION_STATUS,
      NgayCapNhat: new Date()
    }
  });
};

const getAllRegistrations = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search = '', MaHocKy, TrangThai } = req.query;
    const where = {};
    if (MaHocKy) where.MaHocKy = MaHocKy;
    if (TrangThai) where.TrangThai = TrangThai;
    if (search) {
      where.SINHVIEN = {
        OR: [
          { MaSv: { contains: search, mode: 'insensitive' } },
          { HoTen: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [rows, total] = await Promise.all([
      prisma.PHIEUDANGKY.findMany({
        where,
        skip,
        take: limit,
        orderBy: { NgayLap: 'desc' },
        include: { SINHVIEN: true, HOCKY: { include: { NAMHOC: true } }, CHITIETDANGKY: true }
      }),
      prisma.PHIEUDANGKY.count({ where })
    ]);

    const data = rows.map((r) => ({
      SoPhieu: r.SoPhieu,
      MaSv: r.MaSv,
      HoTen: r.SINHVIEN.HoTen,
      MaHocKy: r.MaHocKy,
      TenHocKy: r.HOCKY.TenHocKy,
      TenNamHoc: r.HOCKY.NAMHOC.TenNamHoc,
      soMon: r.CHITIETDANGKY.filter((c) => c.TrangThai === ACTIVE_REGISTRATION_STATUS).length,
      TongTinChi: r.TongTinChi,
      TongTienPhaiDong: r.TongTienPhaiDong,
      NgayLap: r.NgayLap,
      TrangThai: r.TrangThai
    }));

    res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get all registrations error:');
  }
};

const getRegistrationById = async (req, res) => {
  try {
    const soPhieu = parseInt(req.params.soPhieu, 10);
    if (!Number.isFinite(soPhieu)) return res.status(400).json({ success: false, message: 'Số phiếu không hợp lệ' });

    const registration = await prisma.PHIEUDANGKY.findUnique({
      where: { SoPhieu: soPhieu },
      include: {
        SINHVIEN: true,
        HOCKY: { include: { NAMHOC: true } },
        CHITIETDANGKY: {
          orderBy: { NgayDangKy: 'desc' },
          include: { LOP: { include: { MONHOC: { include: { KHOA: true } } } }, MONHOC: true }
        },
        PHIEUTHUHOCPHI: true
      }
    });
    if (!registration) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu đăng ký' });
    res.json({ success: true, data: registration });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get registration by id error:');
  }
};

const getStudentCourses = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    if (!(await ensureStudentAccess(req, res, studentId))) return;
    const { page, limit, skip } = getPagination(req.query);
    const semesterId = req.query.MaHocKy || null;
    const where = {
      PHIEUDANGKY: {
        MaSv: studentId,
        ...(semesterId ? { MaHocKy: semesterId } : {})
      }
    };

    const [rows, total, totals] = await Promise.all([
      prisma.CHITIETDANGKY.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ NgayDangKy: 'desc' }, { id: 'desc' }],
        include: {
          LOP: {
            include: {
              MONHOC: true,
              LOPMO: {
                include: {
                  GIANGVIEN: true,
                  LICHHOCLOP: {
                    where: { TrangThai: true },
                    include: {
                      PHONGHOC: true,
                      TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC: true,
                      TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC: true
                    },
                    orderBy: [{ ThuTrongTuan: 'asc' }, { MaTietBatDau: 'asc' }]
                  }
                }
              }
            }
          },
          MONHOC: true,
          PHIEUDANGKY: {
            include: {
              HOCKY: { include: { NAMHOC: true } },
              PHIEUTHUHOCPHI: {
                where: { TrangThai: PAYMENT_SUCCESS_STATUS },
                select: { SoPhieuThu: true, SoTienThu: true, TrangThai: true }
              }
            }
          }
        }
      }),
      prisma.CHITIETDANGKY.count({ where }),
      prisma.CHITIETDANGKY.aggregate({
        where,
        _sum: { SoTinChi: true }
      })
    ]);

    const courses = rows.map((row) => {
      const monHoc = row.MONHOC || row.LOP?.MONHOC || {};
      const openedClasses = (row.LOP?.LOPMO || []).filter((item) => item.MaHocKy === row.PHIEUDANGKY?.MaHocKy);
      const currentOpened = openedClasses[0] || null;
      const lockedByPayment = hasSuccessfulPayment(row.PHIEUDANGKY);
      const isActive = row.TrangThai === ACTIVE_REGISTRATION_STATUS;
      return {
        id: row.id,
        SoPhieu: row.SoPhieu,
        MaLop: row.MaLop,
        MaMonHoc: row.MaMonHoc || monHoc.MaMonHoc,
        LoaiDangKy: row.LoaiDangKy,
        LoaiDangKyLabel: getRegistrationTypeLabel(row.LoaiDangKy),
        DonGia: row.DonGia,
        ThanhTien: row.ThanhTien,
        TrangThai: row.TrangThai,
        NgayDangKy: row.NgayDangKy,
        NgayHuy: row.NgayHuy,
        CanHuy: isActive && !lockedByPayment,
        KhoaHuyDangKy: lockedByPayment,
        LyDoKhongTheHuy: lockedByPayment ? PAID_REGISTRATION_LOCK_MESSAGE : '',
        SoTinChi: row.SoTinChi || monHoc.SoTinChi || 0,
        LOP: {
          MaLop: row.MaLop,
          TenLop: row.LOP?.TenLop,
          GiangVien: openedClassLecturerName(currentOpened),
          LichHoc: openedClassScheduleLabel(currentOpened),
          PhongHoc: openedClassRoomLabel(currentOpened),
          LOPMO: openedClasses.map((item) => ({
            id: item.id,
            MaHocKy: item.MaHocKy,
            MaLop: item.MaLop,
            MaGiangVien: item.MaGiangVien,
            GiangVien: openedClassLecturerName(item),
            LICHHOCLOP: item.LICHHOCLOP
          })),
          MONHOC: {
            MaMonHoc: row.MaMonHoc || monHoc.MaMonHoc,
            TenMonHoc: monHoc.TenMonHoc,
            SoTinChi: row.SoTinChi || monHoc.SoTinChi || 0,
            LoaiMon: monHoc.LoaiMon
          }
        },
        PHIEUDANGKY: {
          MaHocKy: row.PHIEUDANGKY?.MaHocKy,
          DaCoPhieuThuThanhCong: lockedByPayment,
          HOCKY: {
            TenHocKy: row.PHIEUDANGKY?.HOCKY?.TenHocKy,
            NAMHOC: { TenNamHoc: row.PHIEUDANGKY?.HOCKY?.NAMHOC?.TenNamHoc }
          }
        }
      };
    });

    res.json({
      success: true,
      data: {
        courses,
        summary: {
          totalCourses: total,
          totalCredits: Number(totals._sum.SoTinChi || 0)
        }
      },
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get student courses error:');
  }
};

const getAvailableCourses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { MaHocKy, search = '', MaKhoa } = req.query;
    if (!MaHocKy) return res.status(400).json({ success: false, message: 'Vui lòng chọn học kỳ' });

    const semester = await prisma.HOCKY.findFirst({
      where: { MaHocKy, DaXoa: false },
      select: {
        MaHocKy: true,
        NgayBatDauDangKy: true,
        NgayKetThucDangKy: true,
        TrangThai: true
      }
    });
    if (!semester) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    const windowState = getRegistrationWindowState(semester);
    if (!windowState.isOpen) {
      return res.status(400).json({
        success: false,
        code: 'REGISTRATION_WINDOW_CLOSED',
        message: windowState.message || 'Đợt đăng ký học phần chưa mở',
        registrationWindow: windowState
      });
    }

    let studentId = req.query.MaSv || null;
    if (!studentId && req.user?.Role !== 'admin') studentId = await getStudentIdFromRequest(req);

    const where = {
      MaHocKy,
      TrangThai: true,
      HOCKY: { DaXoa: false },
      LOP: {
        DaXoa: false,
        TrangThai: true,
        MONHOC: { DaXoa: false, TrangThai: true }
      }
    };
    if (search) {
      where.LOP.MONHOC.OR = [
        { MaMonHoc: { contains: search, mode: 'insensitive' } },
        { TenMonHoc: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (MaKhoa) where.LOP.MONHOC.MaKhoa = MaKhoa;

    const [rows, total, currentRegistration] = await Promise.all([
      prisma.LOPMO.findMany({
      where,
      skip,
      take: limit,
      include: {
        LOP: {
          include: {
            MONHOC: { include: { KHOA: true } },
            CHITIETDANGKY: { where: { TrangThai: ACTIVE_REGISTRATION_STATUS, PHIEUDANGKY: { MaHocKy } } }
          }
        },
        GIANGVIEN: true,
        LICHHOCLOP: {
          where: { TrangThai: true },
          include: {
            PHONGHOC: true,
            TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC: true,
            TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC: true
          },
          orderBy: [{ ThuTrongTuan: 'asc' }, { MaTietBatDau: 'asc' }]
        },
        HOCKY: true
      }
    }),
      prisma.LOPMO.count({ where }),
      studentId ? prisma.PHIEUDANGKY.findFirst({
        where: { MaSv: studentId, MaHocKy },
        include: {
          PHIEUTHUHOCPHI: {
            where: { TrangThai: PAYMENT_SUCCESS_STATUS },
            select: { SoPhieuThu: true, TrangThai: true }
          }
        }
      }) : null
    ]);
    const lockedByPayment = hasSuccessfulPayment(currentRegistration);

    const data = await Promise.all(rows.map(async (r) => {
      const course = r.LOP.MONHOC;
      const registrationType = studentId
        ? await determineRegistrationType(prisma, studentId, course.MaMonHoc)
        : 'hoc_moi';
      const price = await getCreditPrice(prisma, course.LoaiMon, registrationType, MaHocKy);
      const credits = Number(course.SoTinChi || 0);

      return {
        id: r.id,
        MaLop: r.MaLop,
        MaHocKy: r.MaHocKy,
        MaMonHoc: course.MaMonHoc,
        TenMonHoc: course.TenMonHoc,
        SoTinChi: credits,
        LoaiMon: course.LoaiMon,
        TenKhoa: course.KHOA?.TenKhoa,
        SoLuongToiDa: r.LOP.SoLuongToiDa,
        SoLuongDaDangKy: r.LOP.CHITIETDANGKY.length,
        GiangVien: openedClassLecturerName(r),
        PhongHoc: openedClassRoomLabel(r),
        LichHoc: openedClassScheduleLabel(r),
        LoaiDangKy: registrationType,
        LoaiDangKyLabel: getRegistrationTypeLabel(registrationType),
        DonGiaDuKien: price,
        ThanhTienDuKien: price * credits,
        CanDangKy: !lockedByPayment,
        LyDoKhongTheDangKy: lockedByPayment ? PAID_REGISTRATION_LOCK_MESSAGE : ''
      };
    }));

    res.json({ success: true, data, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get available courses error:');
  }
};

const registerCourse = async (req, res) => {
  try {
    let { MaSv, MaHocKy, MaLop } = req.body;
    if (req.user?.Role !== 'admin') {
      const currentStudentId = await getStudentIdFromRequest(req);
      if (!currentStudentId) return res.status(403).json({ success: false, message: 'Không xác định được sinh viên hiện tại' });
      if (MaSv && MaSv !== currentStudentId) {
        return res.status(403).json({ success: false, message: 'Không thể đăng ký cho sinh viên khác' });
      }
      MaSv = currentStudentId;
    }
    if (!MaSv || !MaHocKy || !MaLop) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });

    const result = await prisma.$transaction(async (tx) => {
      const openedClass = await tx.LOPMO.findFirst({
        where: { MaHocKy, MaLop, TrangThai: true },
        include: { HOCKY: true, LOP: { include: { MONHOC: true } } }
      });
      if (!openedClass || !openedClass.LOP) throw { status: 404, message: 'Lớp học không tồn tại hoặc chưa mở trong học kỳ này' };
      assertRegistrationOpen(openedClass.HOCKY);

      const lop = openedClass.LOP;
      const course = lop.MONHOC;
      if (Number(lop.SoLuongToiDa || 0) > 0 && Number(openedClass.SoLuongDaDangKy || 0) >= Number(lop.SoLuongToiDa || 0)) {
        throw { status: 400, message: 'Lớp học đã hết chỗ' };
      }

      let phieu = await tx.PHIEUDANGKY.findFirst({
        where: { MaSv, MaHocKy },
        include: {
          PHIEUTHUHOCPHI: {
            where: { TrangThai: PAYMENT_SUCCESS_STATUS },
            select: { SoPhieuThu: true, TrangThai: true }
          }
        }
      });
      if (hasSuccessfulPayment(phieu)) {
        throw { status: 400, message: PAID_REGISTRATION_LOCK_MESSAGE };
      }
      if (!phieu) {
        phieu = await tx.PHIEUDANGKY.create({ data: { MaSv, MaHocKy, TrangThai: ACTIVE_REGISTRATION_STATUS } });
      }

      const existingReg = await tx.CHITIETDANGKY.findFirst({
        where: { SoPhieu: phieu.SoPhieu, MaMonHoc: course.MaMonHoc, TrangThai: ACTIVE_REGISTRATION_STATUS }
      });
      if (existingReg) throw { status: 400, message: 'Đã đăng ký môn này rồi' };

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
        NgayHuy: null
      };

      const registration = cancelledReg
        ? await tx.CHITIETDANGKY.update({
          where: { id: cancelledReg.id },
          data: { ...data, NgayDangKy: new Date() }
        })
        : await tx.CHITIETDANGKY.create({ data });
      await tx.LOPMO.updateMany({
        where: { MaHocKy, MaLop, TrangThai: true },
        data: { SoLuongDaDangKy: { increment: 1 } }
      });
      const tuitionSummary = await recalculateRegistrationTotals(tx, phieu.SoPhieu);
      return { registration, tuitionSummary };
    });

    res.status(201).json({ success: true, message: 'Đăng ký thành công', data: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return sendErrorResponse(res, error, 'Lỗi server', 'Register course error:');
  }
};

const cancelRegistration = async (req, res) => {
  try {
    const reg = await prisma.CHITIETDANGKY.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        PHIEUDANGKY: {
          select: {
            MaSv: true,
            MaHocKy: true,
            SoPhieu: true,
            HOCKY: true,
            PHIEUTHUHOCPHI: {
              where: { TrangThai: PAYMENT_SUCCESS_STATUS },
              select: { SoPhieuThu: true, TrangThai: true }
            }
          }
        }
      }
    });
    if (!reg) return res.status(404).json({ success: false, message: 'Không tìm thấy đăng ký' });
    if (!(await ensureStudentAccess(req, res, reg.PHIEUDANGKY.MaSv))) return;
    assertRegistrationOpen(reg.PHIEUDANGKY.HOCKY);
    if (hasSuccessfulPayment(reg.PHIEUDANGKY)) {
      return res.status(400).json({ success: false, message: PAID_REGISTRATION_LOCK_MESSAGE });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.CHITIETDANGKY.update({
        where: { id: parseInt(req.params.id, 10) },
        data: { TrangThai: CANCELLED_REGISTRATION_STATUS, NgayHuy: new Date(), LyDoHuy: 'Sinh viên hủy đăng ký' }
      });
      if (reg.TrangThai === ACTIVE_REGISTRATION_STATUS) {
        await tx.LOPMO.updateMany({
          where: {
            MaHocKy: reg.PHIEUDANGKY.MaHocKy,
            MaLop: reg.MaLop,
            SoLuongDaDangKy: { gt: 0 }
          },
          data: { SoLuongDaDangKy: { decrement: 1 } }
        });
      }
      return recalculateRegistrationTotals(tx, reg.PHIEUDANGKY.SoPhieu);
    });
    res.json({ success: true, message: 'Hủy đăng ký thành công', data: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        return sendErrorResponse(res, error, 'Lỗi server', 'Cancel registration error:');
  }
};

const getRegistrationStats = async (req, res) => {
  try {
    const where = {};
    if (req.query.MaHocKy) where.MaHocKy = req.query.MaHocKy;
    const [totalReg, totalDetails] = await Promise.all([
      prisma.PHIEUDANGKY.count({ where }),
      prisma.CHITIETDANGKY.count({ where: { TrangThai: ACTIVE_REGISTRATION_STATUS, PHIEUDANGKY: where } })
    ]);
    res.json({ success: true, data: { totalRegistrations: totalReg, totalCourses: totalDetails } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'Get registration stats error:');
  }
};

module.exports = {
  getAllRegistrations,
  getRegistrationById,
  getStudentCourses,
  getAvailableCourses,
  registerCourse,
  cancelRegistration,
  getRegistrationStats,
  recalculateRegistrationTotals,
  getRegistrationTypeLabel
};
