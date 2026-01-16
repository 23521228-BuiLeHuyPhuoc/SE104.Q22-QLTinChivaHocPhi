import { useState, useEffect } from 'react';
import { 
  FaChartBar, 
  FaUsers, 
  FaBook, 
  FaMoneyBill, 
  FaClipboardList,
  FaDownload,
  FaCalendarAlt
} from 'react-icons/fa';
import { studentService, courseService, registrationService, tuitionService, paymentService, semesterService } from '../services';
import './Reports.css';

const Reports = () => {
  const [selectedSemester, setSelectedSemester] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [stats, setStats] = useState({
    students: { total: 0, byStatus: [], byMajor: [] },
    courses: { total: 0, byType: [], totalCredits: 0 },
    registrations: { totalRegistrations: 0, totalCourses: 0, totalCredits: 0 },
    tuition: { totalAmount: 0, paidAmount: 0, remainingAmount: 0, paidStudents: 0, owingStudents: 0 },
    payments: { totalReceipts: 0, totalAmount: 0, byMethod: [] }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSemesters();
    loadAllStats();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      loadSemesterStats();
    }
  }, [selectedSemester]);

  const loadSemesters = async () => {
    try {
      const response = await semesterService.getAll();
      if (response.success) {
        setSemesters(response.data || []);
        // Chọn học kỳ đang diễn ra
        const active = response.data?.find(s => s.trang_thai === 'Đang diễn ra' || s.is_active);
        if (active) {
          setSelectedSemester(active.ma_hoc_ky || active.id);
        }
      }
    } catch (error) {
      console.error('Error loading semesters:', error);
    }
  };

  const loadAllStats = async () => {
    try {
      const [studentStats, courseStats] = await Promise.all([
        studentService.getStats(),
        courseService.getStats()
      ]);

      setStats(prev => ({
        ...prev,
        students: studentStats.data || prev.students,
        courses: courseStats.data || prev.courses
      }));
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSemesterStats = async () => {
    try {
      const [regStats, tuitionStats, paymentStats] = await Promise.all([
        registrationService.getStats({ ma_hoc_ky: selectedSemester }),
        tuitionService.getStats({ ma_hoc_ky: selectedSemester }),
        paymentService.getStats({ ma_hoc_ky: selectedSemester })
      ]);

      setStats(prev => ({
        ...prev,
        registrations: regStats.data || prev.registrations,
        tuition: tuitionStats.data || prev.tuition,
        payments: paymentStats.data || prev.payments
      }));
    } catch (error) {
      console.error('Error loading semester stats:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatPercent = (value, total) => {
    if (!total) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return <div className="loading">Đang tải báo cáo...</div>;
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <div className="header-info">
          <h1><FaChartBar /> Báo cáo thống kê</h1>
          <p>Tổng hợp thông tin và số liệu của hệ thống</p>
        </div>
        <div className="header-actions">
          <select 
            value={selectedSemester} 
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="semester-select"
          >
            <option value="">-- Chọn học kỳ --</option>
            {semesters.map(sem => (
              <option key={sem.ma_hoc_ky || sem.id} value={sem.ma_hoc_ky || sem.id}>
                {sem.ten_hoc_ky} - {sem.ten_nam_hoc || sem.year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-overview">
        <div className="stat-card students">
          <div className="stat-icon"><FaUsers /></div>
          <div className="stat-content">
            <h3>Tổng sinh viên</h3>
            <span className="stat-number">{stats.students.total}</span>
          </div>
        </div>
        <div className="stat-card courses">
          <div className="stat-icon"><FaBook /></div>
          <div className="stat-content">
            <h3>Tổng môn học</h3>
            <span className="stat-number">{stats.courses.total}</span>
            <span className="stat-sub">{stats.courses.totalCredits} tín chỉ</span>
          </div>
        </div>
        <div className="stat-card registrations">
          <div className="stat-icon"><FaClipboardList /></div>
          <div className="stat-content">
            <h3>Lượt đăng ký</h3>
            <span className="stat-number">{stats.registrations.totalCourses}</span>
            <span className="stat-sub">{stats.registrations.totalCredits} tín chỉ</span>
          </div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-icon"><FaMoneyBill /></div>
          <div className="stat-content">
            <h3>Đã thu</h3>
            <span className="stat-number">{formatCurrency(stats.payments.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Detailed Reports */}
      <div className="reports-grid">
        {/* Tuition Report */}
        <div className="report-section">
          <h2><FaMoneyBill /> Báo cáo học phí</h2>
          <div className="report-content">
            <div className="report-item">
              <span className="label">Tổng học phí phải thu:</span>
              <span className="value">{formatCurrency(stats.tuition.totalAmount)}</span>
            </div>
            <div className="report-item">
              <span className="label">Đã thu:</span>
              <span className="value success">{formatCurrency(stats.tuition.paidAmount)}</span>
            </div>
            <div className="report-item">
              <span className="label">Còn phải thu:</span>
              <span className="value warning">{formatCurrency(stats.tuition.remainingAmount)}</span>
            </div>
            <div className="report-item">
              <span className="label">Tỷ lệ thu:</span>
              <span className="value">{formatPercent(stats.tuition.paidAmount, stats.tuition.totalAmount)}</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: formatPercent(stats.tuition.paidAmount, stats.tuition.totalAmount) }}
              ></div>
            </div>
            <div className="report-summary">
              <div className="summary-item">
                <span className="count success">{stats.tuition.paidStudents}</span>
                <span className="label">SV đã đóng đủ</span>
              </div>
              <div className="summary-item">
                <span className="count warning">{stats.tuition.owingStudents}</span>
                <span className="label">SV còn nợ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods Report */}
        <div className="report-section">
          <h2><FaMoneyBill /> Phương thức thanh toán</h2>
          <div className="report-content">
            {stats.payments.byMethod && stats.payments.byMethod.length > 0 ? (
              <div className="payment-methods">
                {stats.payments.byMethod.map((method, index) => (
                  <div key={index} className="method-item">
                    <span className="method-name">{method.phuong_thuc_thanh_toan || 'Khác'}</span>
                    <span className="method-count">{method.count} phiếu</span>
                    <span className="method-amount">{formatCurrency(parseFloat(method.total) || 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">Chưa có dữ liệu thanh toán</p>
            )}
            <div className="report-total">
              <span className="label">Tổng số phiếu thu:</span>
              <span className="value">{stats.payments.totalReceipts}</span>
            </div>
          </div>
        </div>

        {/* Students by Status */}
        <div className="report-section">
          <h2><FaUsers /> Sinh viên theo trạng thái</h2>
          <div className="report-content">
            {stats.students.byStatus && stats.students.byStatus.length > 0 ? (
              <div className="status-list">
                {stats.students.byStatus.map((status, index) => (
                  <div key={index} className="status-item">
                    <span className={`status-badge ${status.trang_thai?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {status.trang_thai || 'Không xác định'}
                    </span>
                    <span className="status-count">{status.count} sinh viên</span>
                    <span className="status-percent">{formatPercent(status.count, stats.students.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">Chưa có dữ liệu sinh viên</p>
            )}
          </div>
        </div>

        {/* Courses by Type */}
        <div className="report-section">
          <h2><FaBook /> Môn học theo loại</h2>
          <div className="report-content">
            {stats.courses.byType && stats.courses.byType.length > 0 ? (
              <div className="type-list">
                {stats.courses.byType.map((type, index) => (
                  <div key={index} className="type-item">
                    <span className="type-name">{type.loai_mon === 'LT' ? 'Lý thuyết' : type.loai_mon === 'TH' ? 'Thực hành' : type.loai_mon}</span>
                    <span className="type-count">{type.count} môn</span>
                    <span className="type-percent">{formatPercent(type.count, stats.courses.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">Chưa có dữ liệu môn học</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
