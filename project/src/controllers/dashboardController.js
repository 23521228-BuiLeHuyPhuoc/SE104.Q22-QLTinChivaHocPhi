const ExcelJS = require('exceljs');
const prisma = require('../config/database');
const { sendErrorResponse } = require('../utils/errorHandler');
const { filterRowsByRegex } = require('../utils/searchRegex');
const { PAYMENT_STATUS } = require('../utils/businessConstants');
const {
  emptyTotals,
  getTransactionTotalsByRegistration,
  getEffectivePaid
} = require('../utils/paymentLedger');

const active = { DaXoa: false };
const ACTIVE_REGISTRATION_STATUS = 'Đã đăng ký';
const PAYMENT_SUCCESS = PAYMENT_STATUS.SUCCESS;

const toNumber = (value) => Number(value || 0);

const getTuitionDebtRows = async (filters = {}) => {
  const studentWhere = { DaXoa: false };
  if (filters.MaNganh) studentWhere.MaNganh = filters.MaNganh;
  if (filters.MaKhoa) studentWhere.NGANHHOC = { MaKhoa: filters.MaKhoa };
  const where = {
    TrangThai: ACTIVE_REGISTRATION_STATUS,
    SINHVIEN: studentWhere,
    HOCKY: active
  };
  if (filters.MaHocKy) where.MaHocKy = filters.MaHocKy;

  const rows = await prisma.PHIEUDANGKY.findMany({
    where,
    orderBy: { NgayLap: 'desc' },
    include: {
      SINHVIEN: { include: { NGANHHOC: { include: { KHOA: true } } } },
      HOCKY: { include: { NAMHOC: true } }
    }
  });

  const totalsByRegistration = await getTransactionTotalsByRegistration(prisma, rows.map((row) => row.SoPhieu));

  const now = new Date();
  const mappedRows = rows.map((row) => {
    const totalDue = toNumber(row.TongTienPhaiDong);
    const totalPaid = getEffectivePaid(totalsByRegistration.get(Number(row.SoPhieu)) || emptyTotals());
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
  });

  return filterRowsByRegex(mappedRows, filters.search, (row) => [row.MaSv, row.MSSV, row.HoTen])
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
      prisma.PHIEUDANGKY.count({ where: { TrangThai: ACTIVE_REGISTRATION_STATUS, SINHVIEN: active, HOCKY: active } }),
      prisma.PHIEUDANGKY.findMany({
        where: { TrangThai: ACTIVE_REGISTRATION_STATUS, SINHVIEN: active, HOCKY: active },
        select: {
          SoPhieu: true,
          TongTienPhaiDong: true,
          HOCKY: { select: { HanDongHocPhi: true } }
        }
      })
    ]);

    const totalsByRegistration = await getTransactionTotalsByRegistration(prisma, tuitionRows.map((row) => row.SoPhieu));

    const tuition = tuitionRows.reduce((acc, row) => {
      const due = Number(row.TongTienPhaiDong || 0);
      const paid = getEffectivePaid(totalsByRegistration.get(Number(row.SoPhieu)) || emptyTotals());
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
        return sendErrorResponse(res, error, 'Lỗi server', 'getDashboardStats error:');
  }
};

const getRevenueMonthly = async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const rows = await prisma.$queryRaw`
      SELECT "NgayXacNhan", "NgayCapNhat", "NgayTao", "SoTienThanhToan", "TrangThai"
      FROM "GIAODICHTHANHTOANHOCPHI"
      WHERE "TrangThai" IN (${PAYMENT_SUCCESS}, ${PAYMENT_STATUS.REFUND})
        AND COALESCE("NgayXacNhan", "NgayCapNhat", "NgayTao") >= ${start}
        AND COALESCE("NgayXacNhan", "NgayCapNhat", "NgayTao") < ${end}
    `;
    const data = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, amount: 0 }));
    rows.forEach((row) => {
      const paidAt = row.NgayXacNhan || row.NgayCapNhat || row.NgayTao;
      const month = new Date(paidAt).getMonth();
      const sign = row.TrangThai === PAYMENT_STATUS.REFUND ? -1 : 1;
      data[month].amount += sign * toNumber(row.SoTienThanhToan);
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

const getIncompleteTuitionFilters = (query = {}) => {
  const status = query.TrangThai || query.status || '';
  const overdueFilter = query.overdue;
  return {
    MaHocKy: query.MaHocKy || '',
    MaKhoa: query.MaKhoa || '',
    MaNganh: query.MaNganh || '',
    search: query.search || '',
    TrangThai: status || undefined,
    overdue: overdueFilter === 'true' ? true : overdueFilter === 'false' ? false : undefined
  };
};

const getIncompleteTuitionReport = async (req, res) => {
  try {
    const rows = await getTuitionDebtRows(getIncompleteTuitionFilters(req.query));
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

const exportIncompleteTuitionReport = async (req, res) => {
  try {
    const rows = await getTuitionDebtRows(getIncompleteTuitionFilters(req.query));
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EduPay';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Chua hoan thanh hoc phi');
    worksheet.columns = [
      { header: 'MSSV', key: 'MSSV', width: 14 },
      { header: 'HoTen', key: 'HoTen', width: 26 },
      { header: 'Nganh', key: 'TenNganh', width: 30 },
      { header: 'Khoa', key: 'TenKhoa', width: 28 },
      { header: 'HocKy', key: 'HocKy', width: 26 },
      { header: 'PhaiDong', key: 'TongTienPhaiDong', width: 16 },
      { header: 'DaDong', key: 'TongTienDaDong', width: 16 },
      { header: 'ConNo', key: 'ConNo', width: 16 },
      { header: 'HanDongHocPhi', key: 'HanDongHocPhi', width: 16 },
      { header: 'SoNgayQuaHan', key: 'SoNgayQuaHan', width: 16 },
      { header: 'TrangThai', key: 'TrangThai', width: 18 }
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
    rows.forEach((row) => {
      worksheet.addRow({
        MSSV: row.MSSV || row.MaSv,
        HoTen: row.HoTen,
        TenNganh: row.TenNganh,
        TenKhoa: row.TenKhoa,
        HocKy: [row.TenHocKy, row.TenNamHoc].filter(Boolean).join(' - '),
        TongTienPhaiDong: row.TongTienPhaiDong,
        TongTienDaDong: row.TongTienDaDong,
        ConNo: row.ConNo,
        HanDongHocPhi: row.HanDongHocPhi ? new Date(row.HanDongHocPhi) : null,
        SoNgayQuaHan: row.SoNgayQuaHan || 0,
        TrangThai: row.TrangThai
      });
    });
    ['TongTienPhaiDong', 'TongTienDaDong', 'ConNo'].forEach((key) => {
      worksheet.getColumn(key).numFmt = '#,##0';
    });
    worksheet.getColumn('HanDongHocPhi').numFmt = 'yyyy-mm-dd';
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    const fileName = 'sinh-vien-chua-hoan-thanh-hoc-phi-' + Date.now() + '.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'exportIncompleteTuitionReport error:');
  }
};

const getRegistrationBySemester = async (req, res) => {
  try {
    const rows = await prisma.PHIEUDANGKY.findMany({
      where: { TrangThai: ACTIVE_REGISTRATION_STATUS, SINHVIEN: active, HOCKY: active },
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
  exportIncompleteTuitionReport,
  getRegistrationBySemester,
  getRecentActivity
};
