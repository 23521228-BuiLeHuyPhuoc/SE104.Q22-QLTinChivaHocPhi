const prisma = require('../config/database');
const { sendErrorResponse } = require('../utils/errorHandler');

const active = { DaXoa: false };
const PAYMENT_SUCCESS = 'Thành công';

const toNumber = (value) => Number(value || 0);

const getTuitionDebtRows = async (filters = {}) => {
  const studentWhere = { DaXoa: false };
  if (filters.MaNganh) studentWhere.MaNganh = filters.MaNganh;
  if (filters.MaKhoa) studentWhere.NGANHHOC = { MaKhoa: filters.MaKhoa };
  if (filters.search) {
    studentWhere.OR = [
      { MaSv: { contains: filters.search, mode: 'insensitive' } },
      { HoTen: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const where = {
    SINHVIEN: studentWhere,
    HOCKY: active
  };
  if (filters.MaHocKy) where.MaHocKy = filters.MaHocKy;

  const rows = await prisma.PHIEUDANGKY.findMany({
    where,
    orderBy: { NgayLap: 'desc' },
    include: {
      SINHVIEN: { include: { NGANHHOC: { include: { KHOA: true } } } },
      HOCKY: { include: { NAMHOC: true } },
      PHIEUTHUHOCPHI: { where: { TrangThai: PAYMENT_SUCCESS }, select: { SoTienThu: true } }
    }
  });

  const now = new Date();
  return rows.map((row) => {
    const totalDue = toNumber(row.TongTienPhaiDong);
    const totalPaid = row.PHIEUTHUHOCPHI.reduce((sum, receipt) => sum + toNumber(receipt.SoTienThu), 0);
    const debt = Math.max(totalDue - totalPaid, 0);
    const dueDate = row.HOCKY?.HanDongHocPhi || null;
    const overdue = debt > 0 && dueDate && new Date(dueDate) < now;
    const daysOverdue = overdue ? Math.max(0, Math.ceil((now - new Date(dueDate)) / 86400000)) : 0;
    let status = totalPaid > 0 ? 'Đóng một phần' : 'Chưa đóng';
    if (overdue) status = 'Quá hạn';

    return {
      SoPhieu: row.SoPhieu,
      MSSV: row.MaSv,
      MaSv: row.MaSv,
      HoTen: row.SINHVIEN?.HoTen || '',
      MaHocKy: row.MaHocKy,
      TenHocKy: row.HOCKY?.TenHocKy || row.MaHocKy,
      TenNamHoc: row.HOCKY?.NAMHOC?.TenNamHoc || '',
      MaNganh: row.SINHVIEN?.MaNganh || '',
      TenNganh: row.SINHVIEN?.NGANHHOC?.TenNganh || '',
      MaKhoa: row.SINHVIEN?.NGANHHOC?.MaKhoa || '',
      TenKhoa: row.SINHVIEN?.NGANHHOC?.KHOA?.TenKhoa || '',
      TongTienPhaiDong: totalDue,
      TongTienDaDong: totalPaid,
      ConNo: debt,
      HanDongHocPhi: dueDate,
      SoNgayQuaHan: daysOverdue,
      QuaHan: overdue,
      TrangThai: status
    };
  })
    .filter((row) => row.ConNo > 0)
    .filter((row) => !filters.TrangThai || row.TrangThai === filters.TrangThai)
    .filter((row) => filters.overdue === undefined || row.QuaHan === filters.overdue)
    .sort((a, b) => b.ConNo - a.ConNo);
};

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const [
      totalStudents,
      totalCourses,
      openedClasses,
      registrations,
      tuitionRows
    ] = await Promise.all([
      prisma.SINHVIEN.count({ where: active }),
      prisma.MONHOC.count({ where: active }),
      prisma.LOPMO.count({ where: { TrangThai: true, LOP: active, HOCKY: active } }),
      prisma.PHIEUDANGKY.count({ where: { TrangThai: 'Đã đăng ký', SINHVIEN: active, HOCKY: active } }),
      prisma.PHIEUDANGKY.findMany({
        where: { SINHVIEN: active, HOCKY: active },
        select: {
          TongTienPhaiDong: true,
          HOCKY: { select: { HanDongHocPhi: true } },
          PHIEUTHUHOCPHI: {
            where: { TrangThai: PAYMENT_SUCCESS },
            select: { SoTienThu: true }
          }
        }
      })
    ]);

    const tuition = tuitionRows.reduce((acc, row) => {
      const due = Number(row.TongTienPhaiDong || 0);
      const paid = row.PHIEUTHUHOCPHI.reduce((sum, receipt) => sum + Number(receipt.SoTienThu || 0), 0);
      const remaining = Math.max(due - paid, 0);
      acc.totalAmount += due;
      acc.paidAmount += paid;
      acc.remainingAmount += remaining;
      if (remaining > 0 && row.HOCKY?.HanDongHocPhi && new Date(row.HOCKY.HanDongHocPhi) < now) {
        acc.overdueCount += 1;
        acc.overdueAmount += remaining;
      }
      return acc;
    }, { totalAmount: 0, paidAmount: 0, remainingAmount: 0, overdueCount: 0, overdueAmount: 0 });

    res.json({
      success: true,
      data: {
        totalStudents,
        totalCourses,
        openedClasses,
        registrations,
        ...tuition
      }
    });
  } catch (error) {
        return sendErrorResponse(res, error, 'Loi server', 'getDashboardStats error:');
  }
};

const getRevenueMonthly = async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const rows = await prisma.PHIEUTHUHOCPHI.findMany({
      where: { TrangThai: PAYMENT_SUCCESS, NgayLap: { gte: start, lt: end } },
      select: { NgayLap: true, SoTienThu: true }
    });
    const data = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, amount: 0 }));
    rows.forEach((row) => {
      const month = new Date(row.NgayLap).getMonth();
      data[month].amount += toNumber(row.SoTienThu);
    });
    res.json({ success: true, data });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getRevenueMonthly error:');
  }
};

const getStudentsOwing = async (req, res) => {
  try {
    const rows = await getTuitionDebtRows(req.query);
    res.json({ success: true, data: rows });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getStudentsOwing error:');
  }
};

const getIncompleteTuitionReport = async (req, res) => {
  try {
    const status = req.query.TrangThai || req.query.status || '';
    const overdueFilter = req.query.overdue;
    const filters = {
      MaHocKy: req.query.MaHocKy || '',
      MaKhoa: req.query.MaKhoa || '',
      MaNganh: req.query.MaNganh || '',
      search: req.query.search || '',
      TrangThai: status || undefined,
      overdue: overdueFilter === 'true' ? true : overdueFilter === 'false' ? false : undefined
    };
    const rows = await getTuitionDebtRows(filters);
    const summary = rows.reduce((acc, row) => {
      acc.totalStudents += 1;
      acc.totalDebt += row.ConNo;
      if (row.QuaHan) acc.overdueStudents += 1;
      if (row.TrangThai === 'Đóng một phần') acc.partialStudents += 1;
      return acc;
    }, { totalStudents: 0, totalDebt: 0, overdueStudents: 0, partialStudents: 0 });

    res.json({ success: true, data: { summary, rows } });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getIncompleteTuitionReport error:');
  }
};

const getRegistrationBySemester = async (req, res) => {
  try {
    const rows = await prisma.PHIEUDANGKY.findMany({
      where: { SINHVIEN: active, HOCKY: active },
      select: { MaHocKy: true, HOCKY: { select: { TenHocKy: true, NAMHOC: { select: { TenNamHoc: true } } } } }
    });
    const map = rows.reduce((acc, row) => {
      const label = [row.HOCKY?.TenHocKy || row.MaHocKy, row.HOCKY?.NAMHOC?.TenNamHoc].filter(Boolean).join(' - ');
      if (!acc[row.MaHocKy]) acc[row.MaHocKy] = { MaHocKy: row.MaHocKy, label, count: 0 };
      acc[row.MaHocKy].count += 1;
      return acc;
    }, {});
    res.json({ success: true, data: Object.values(map) });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getRegistrationBySemester error:');
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const [payments, registrations, students] = await Promise.all([
      prisma.PHIEUTHUHOCPHI.findMany({
        take: 5,
        orderBy: { NgayLap: 'desc' },
        include: { SINHVIEN: true }
      }),
      prisma.PHIEUDANGKY.findMany({
        take: 5,
        orderBy: { NgayLap: 'desc' },
        include: { SINHVIEN: true, HOCKY: true }
      }),
      prisma.SINHVIEN.findMany({
        take: 5,
        where: active,
        orderBy: { NgayTao: 'desc' }
      })
    ]);

    const data = [
      ...payments.map((p) => ({
        type: 'payment',
        title: `Thanh toán ${p.MaSv}`,
        description: `${p.SINHVIEN?.HoTen || ''} - ${toNumber(p.SoTienThu).toLocaleString('vi-VN')} đ`,
        date: p.NgayLap
      })),
      ...registrations.map((r) => ({
        type: 'registration',
        title: `Đăng ký ${r.MaSv}`,
        description: `${r.SINHVIEN?.HoTen || ''} - ${r.HOCKY?.TenHocKy || r.MaHocKy}`,
        date: r.NgayLap
      })),
      ...students.map((s) => ({
        type: 'student',
        title: `Sinh viên mới ${s.MaSv}`,
        description: s.HoTen,
        date: s.NgayTao
      }))
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);

    res.json({ success: true, data });
  } catch (error) {
        return sendErrorResponse(res, error, 'Lỗi server', 'getRecentActivity error:');
  }
};

module.exports = {
  getDashboardStats,
  getRevenueMonthly,
  getStudentsOwing,
  getIncompleteTuitionReport,
  getRegistrationBySemester,
  getRecentActivity
};
