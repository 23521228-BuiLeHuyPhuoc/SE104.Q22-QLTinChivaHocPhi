import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { studentService, courseService, registrationService, tuitionService, paymentService } from '../services';
import { FaUsers, FaBook, FaClipboardList, FaMoneyBill, FaCreditCard, FaChartLine, FaClock, FaCalendarAlt, FaBell, FaArrowRight } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard = () => {
  const { isAdmin, student } = useAuth();
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    registrations: 0,
    totalTuition: 0,
    totalPaid: 0,
    pendingPayments: 0
  });
  const [recentCourses, setRecentCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      if (isAdmin) {
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
      } else if (student) {
        const [regData, tuitionData] = await Promise.all([
          registrationService.getStudentCourses(student.id),
          tuitionService.getStudentTuition(student.id)
        ]);

        const totalTuition = tuitionData.data?.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0) || 0;
        const totalPaid = tuitionData.data?.reduce((sum, t) => sum + parseFloat(t.paid_amount || 0), 0) || 0;

        setStats({
          students: 0,
          courses: regData.data?.summary?.totalCourses || 0,
          registrations: regData.data?.summary?.totalCredits || 0,
          totalTuition,
          totalPaid,
          pendingPayments: totalTuition - totalPaid
        });

        // Get recent courses for student
        setRecentCourses(regData.data?.courses?.slice(0, 4) || []);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const adminCards = [
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

  // Student Dashboard - More friendly UI
  if (!isAdmin) {
    return (
      <div className="student-dashboard">
        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Truy cập nhanh</h2>
          <div className="action-cards">
            <Link to="/my-schedule" className="action-card schedule">
              <div className="action-icon"><FaClock /></div>
              <div className="action-content">
                <h3>Thời khoá biểu</h3>
                <p>Xem lịch học trong tuần</p>
              </div>
              <FaArrowRight className="action-arrow" />
            </Link>
            <Link to="/course-registration" className="action-card register">
              <div className="action-icon"><FaClipboardList /></div>
              <div className="action-content">
                <h3>Đăng ký môn học</h3>
                <p>Đăng ký môn học kỳ tới</p>
              </div>
              <FaArrowRight className="action-arrow" />
            </Link>
            <Link to="/my-tuition" className="action-card tuition">
              <div className="action-icon"><FaMoneyBill /></div>
              <div className="action-content">
                <h3>Học phí</h3>
                <p>Xem và thanh toán học phí</p>
              </div>
              <FaArrowRight className="action-arrow" />
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="student-stats">
          <div className="stat-card courses">
            <div className="stat-icon"><FaBook /></div>
            <div className="stat-details">
              <span className="stat-value">{stats.courses}</span>
              <span className="stat-label">Môn đang học</span>
            </div>
          </div>
          <div className="stat-card credits">
            <div className="stat-icon"><FaCalendarAlt /></div>
            <div className="stat-details">
              <span className="stat-value">{stats.registrations}</span>
              <span className="stat-label">Tín chỉ</span>
            </div>
          </div>
          <div className="stat-card tuition">
            <div className="stat-icon"><FaMoneyBill /></div>
            <div className="stat-details">
              <span className="stat-value">{formatCurrency(stats.totalTuition)}</span>
              <span className="stat-label">Tổng học phí</span>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon"><FaCreditCard /></div>
            <div className="stat-details">
              <span className="stat-value">{formatCurrency(stats.pendingPayments)}</span>
              <span className="stat-label">Còn nợ</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Recent Courses */}
          <div className="dashboard-section recent-courses">
            <div className="section-header">
              <h3><FaBook /> Môn học hiện tại</h3>
              <Link to="/my-courses" className="view-all">Xem tất cả <FaArrowRight /></Link>
            </div>
            <div className="courses-list">
              {recentCourses.length > 0 ? (
                recentCourses.map((course, index) => (
                  <div key={course.id || index} className="course-item">
                    <div className="course-color" style={{ backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316'][index % 4] }}></div>
                    <div className="course-info">
                      <span className="course-code">{course.course_code}</span>
                      <span className="course-name">{course.course_name}</span>
                      <span className="course-schedule">{course.schedule || 'Chưa có lịch'}</span>
                    </div>
                    <div className="course-credits">{course.credits} TC</div>
                  </div>
                ))
              ) : (
                <div className="no-data">
                  <p>Chưa có môn học nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Announcements */}
          <div className="dashboard-section announcements">
            <div className="section-header">
              <h3><FaBell /> Thông báo mới</h3>
              <a href="#" className="view-all">Xem tất cả <FaArrowRight /></a>
            </div>
            <div className="announcement-list">
              <div className="announcement-item">
                <div className="announcement-badge important">Quan trọng</div>
                <h4>Đợt đăng ký môn học HK2 2025-2026</h4>
                <p>Thời gian đăng ký: 15/01/2026 - 25/01/2026</p>
                <span className="announcement-time">2 giờ trước</span>
              </div>
              <div className="announcement-item">
                <div className="announcement-badge">Học phí</div>
                <h4>Hạn nộp học phí HK2</h4>
                <p>Hạn cuối: 15/02/2026. Sinh viên chưa nộp sẽ bị khoá đăng ký.</p>
                <span className="announcement-time">1 ngày trước</span>
              </div>
              <div className="announcement-item">
                <div className="announcement-badge">Lịch thi</div>
                <h4>Lịch thi cuối kỳ đã được cập nhật</h4>
                <p>Sinh viên kiểm tra lịch thi trong mục Thời khoá biểu.</p>
                <span className="announcement-time">3 ngày trước</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tuition Progress */}
        {stats.totalTuition > 0 && (
          <div className="tuition-progress-section">
            <div className="section-header">
              <h3><FaCreditCard /> Tiến độ thanh toán học phí</h3>
            </div>
            <div className="progress-content">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${(stats.totalPaid / stats.totalTuition) * 100}%` }}
                ></div>
              </div>
              <div className="progress-info">
                <div className="progress-item">
                  <span className="progress-label">Đã thanh toán</span>
                  <span className="progress-value paid">{formatCurrency(stats.totalPaid)}</span>
                </div>
                <div className="progress-item">
                  <span className="progress-label">Còn lại</span>
                  <span className="progress-value remaining">{formatCurrency(stats.pendingPayments)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Tổng quan</h1>
        <p>Quản lý hệ thống đăng ký môn học và học phí</p>
      </div>

      <div className="stats-grid">
        {adminCards.map((card, index) => (
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

export default Dashboard;
