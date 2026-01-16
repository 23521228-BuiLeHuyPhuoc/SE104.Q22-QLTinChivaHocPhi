import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registrationService, tuitionService, notificationService } from '../../services';
import { FaBook, FaClipboardList, FaMoneyBill, FaCreditCard, FaClock, FaCalendarAlt, FaBell, FaArrowRight } from 'react-icons/fa';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { student } = useAuth();
  const [stats, setStats] = useState({
    courses: 0,
    credits: 0,
    totalTuition: 0,
    totalPaid: 0,
    pendingPayments: 0
  });
  const [recentCourses, setRecentCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (student) {
      loadStats();
      loadAnnouncements();
    }
  }, [student]);

  const loadAnnouncements = async () => {
    try {
      const response = await notificationService.getPublic();
      if (response.success && response.data?.length > 0) {
        setAnnouncements(response.data.slice(0, 3));
      } else {
        // Dữ liệu mẫu nếu không có thông báo từ database
        setAnnouncements([
          {
            id: 1,
            title: 'Đợt đăng ký môn học HK2 2025-2026',
            content: 'Thời gian đăng ký: 15/01/2026 - 25/01/2026',
            type: 'Quan trọng',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 2,
            title: 'Hạn nộp học phí HK2',
            content: 'Hạn cuối: 15/02/2026. Sinh viên chưa nộp sẽ bị khoá đăng ký.',
            type: 'Học phí',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 3,
            title: 'Lịch thi cuối kỳ đã được cập nhật',
            content: 'Sinh viên kiểm tra lịch thi trong mục Thời khoá biểu.',
            type: 'Lịch thi',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
      // Dữ liệu mẫu khi có lỗi
      setAnnouncements([
        {
          id: 1,
          title: 'Đợt đăng ký môn học HK2 2025-2026',
          content: 'Thời gian đăng ký: 15/01/2026 - 25/01/2026',
          type: 'Quan trọng',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          title: 'Hạn nộp học phí HK2',
          content: 'Hạn cuối: 15/02/2026. Sinh viên chưa nộp sẽ bị khoá đăng ký.',
          type: 'Học phí',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          title: 'Lịch thi cuối kỳ đã được cập nhật',
          content: 'Sinh viên kiểm tra lịch thi trong mục Thời khoá biểu.',
          type: 'Lịch thi',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    }
  };

  const loadStats = async () => {
    try {
      const [regData, tuitionData] = await Promise.all([
        registrationService.getStudentCourses(student.id),
        tuitionService.getStudentTuition(student.id)
      ]);

      const totalTuition = tuitionData.data?.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0) || 0;
      const totalPaid = tuitionData.data?.reduce((sum, t) => sum + parseFloat(t.paid_amount || 0), 0) || 0;

      setStats({
        courses: regData.data?.summary?.totalCourses || 0,
        credits: regData.data?.summary?.totalCredits || 0,
        totalTuition,
        totalPaid,
        pendingPayments: totalTuition - totalPaid
      });

      setRecentCourses(regData.data?.courses?.slice(0, 4) || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const courseColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="student-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>Chào mừng, {student?.ho_ten || 'Sinh viên'}!</h1>
          <p>Chúc bạn một ngày học tập hiệu quả</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Truy cập nhanh</h2>
        <div className="action-cards">
          <Link to="/student/schedule" className="action-card schedule">
            <div className="action-icon"><FaClock /></div>
            <div className="action-content">
              <h3>Thời khoá biểu</h3>
              <p>Xem lịch học trong tuần</p>
            </div>
            <FaArrowRight className="action-arrow" />
          </Link>
          <Link to="/student/registration" className="action-card register">
            <div className="action-icon"><FaClipboardList /></div>
            <div className="action-content">
              <h3>Đăng ký môn học</h3>
              <p>Đăng ký môn học kỳ tới</p>
            </div>
            <FaArrowRight className="action-arrow" />
          </Link>
          <Link to="/student/tuition" className="action-card tuition">
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
            <span className="stat-value">{stats.credits}</span>
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
            <Link to="/student/courses" className="view-all">Xem tất cả <FaArrowRight /></Link>
          </div>
          <div className="courses-list">
            {recentCourses.length > 0 ? (
              recentCourses.map((course, index) => (
                <div key={course.id || index} className="course-item">
                  <div className="course-color" style={{ backgroundColor: courseColors[index % 4] }}></div>
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
            <Link to="/student/notifications" className="view-all">Xem tất cả <FaArrowRight /></Link>
          </div>
          <div className="announcement-list">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="announcement-item">
                <div className={`announcement-badge ${announcement.type === 'Quan trọng' ? 'important' : ''}`}>
                  {announcement.type || 'Chung'}
                </div>
                <h4>{announcement.title}</h4>
                <p>{announcement.content}</p>
                <span className="announcement-time">{formatTimeAgo(announcement.created_at)}</span>
              </div>
            ))}
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
};

export default StudentDashboard;
