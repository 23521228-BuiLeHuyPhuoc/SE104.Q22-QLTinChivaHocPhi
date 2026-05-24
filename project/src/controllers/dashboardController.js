const prisma = require('../config/database');

const active = { DaXoa: false };
const PAYMENT_SUCCESS = 'Thành công';

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const [
      totalStudents,
      pendingAccounts,
      totalCourses,
      openedClasses,
      registrations,
      tuitionRows
    ] = await Promise.all([
      prisma.SINHVIEN.count({ where: active }),
      prisma.TAIKHOAN.count({ where: { Role: 'student', TrangThaiDuyet: 'pending', TrangThai: true } }),
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
        pendingStudentApprovals: pendingAccounts,
        totalCourses,
        openedClasses,
        registrations,
        ...tuition
      }
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { getDashboardStats };
