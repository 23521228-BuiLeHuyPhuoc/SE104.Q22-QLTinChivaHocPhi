import { useState, useEffect } from 'react';
import { studentService, courseService, registrationService, tuitionService, paymentService } from '../../services';
import { FaUsers, FaBook, FaClipboardList, FaMoneyBill, FaCreditCard, FaChartLine } from 'react-icons/fa';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    registrations: 0,
    totalTuition: 0,
    totalPaid: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentStats, courseStats, regStats, tuitionStats, paymentStats] = await Promise.all([
        studentService.getStats(),
        courseService.getStats(),
        registrationService.getStats(),
        tuitionService.getStats(),
        paymentService.getStats()
      ]);

      setStats({
        students: studentStats.data?.total || 0,
        courses: courseStats.data?.total || 0,
        registrations: regStats.data?.total || 0,
        totalTuition: tuitionStats.data?.summary?.total_amount || 0,
        totalPaid: tuitionStats.data?.summary?.total_paid || 0,
        pendingPayments: tuitionStats.data?.summary?.total_remaining || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const statCards = [
    { icon: <FaUsers />, title: 'Sinh viên', value: stats.students, color: '#1a237e' },
    { icon: <FaBook />, title: 'Môn học', value: stats.courses, color: '#00796b' },
    { icon: <FaClipboardList />, title: 'Đăng ký', value: stats.registrations, color: '#f57c00' },
    { icon: <FaMoneyBill />, title: 'Tổng học phí', value: formatCurrency(stats.totalTuition), color: '#c62828' },
    { icon: <FaCreditCard />, title: 'Đã thu', value: formatCurrency(stats.totalPaid), color: '#2e7d32' },
    { icon: <FaChartLine />, title: 'Còn nợ', value: formatCurrency(stats.pendingPayments), color: '#7b1fa2' },
  ];

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1>Tổng quan hệ thống</h1>
        <p>Quản lý đăng ký môn học và thu học phí</p>
      </div>

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card" style={{ borderLeft: `4px solid ${card.color}` }}>
            <div className="stat-icon" style={{ backgroundColor: card.color }}>
              {card.icon}
            </div>
            <div className="stat-info">
              <h3>{card.title}</h3>
              <p className="stat-value">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <h2>Hướng dẫn sử dụng</h2>
        <div className="guide-cards">
          <div className="guide-card">
            <h4><FaUsers /> Quản lý sinh viên</h4>
            <p>Thêm, sửa, xóa thông tin sinh viên. Mỗi sinh viên sẽ có tài khoản đăng nhập riêng.</p>
          </div>
          <div className="guide-card">
            <h4><FaBook /> Quản lý môn học</h4>
            <p>Tạo và quản lý các môn học theo học kỳ, thiết lập lịch học và học phí.</p>
          </div>
          <div className="guide-card">
            <h4><FaClipboardList /> Đăng ký môn học</h4>
            <p>Xem và quản lý việc đăng ký môn học của sinh viên trong từng học kỳ.</p>
          </div>
          <div className="guide-card">
            <h4><FaCreditCard /> Thu học phí</h4>
            <p>Ghi nhận thanh toán học phí và theo dõi công nợ của sinh viên.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
