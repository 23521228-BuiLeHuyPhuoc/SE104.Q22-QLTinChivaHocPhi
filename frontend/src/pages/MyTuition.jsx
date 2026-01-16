import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tuitionService, semesterService } from '../services';
import { toast } from 'react-toastify';
import { FaMoneyBillWave, FaCheckCircle, FaClock, FaExclamationCircle } from 'react-icons/fa';
import './MyTuition.css';

const MyTuition = () => {
  const { student } = useAuth();
  const [tuitionFees, setTuitionFees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    if (student) {
      loadTuitionFees();
    }
  }, [student, selectedSemester]);

  const loadSemesters = async () => {
    try {
      const response = await semesterService.getAll();
      setSemesters(response.data);
    } catch (error) {
      console.error('Error loading semesters:', error);
    }
  };

  const loadTuitionFees = async () => {
    try {
      setLoading(true);
      const response = await tuitionService.getStudentTuition(student.id, {
        semester_id: selectedSemester || undefined
      });
      setTuitionFees(response.data);
    } catch (error) {
      toast.error('Không thể tải thông tin học phí');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'paid':
        return { icon: <FaCheckCircle />, label: 'Đã đóng đủ', class: 'status-paid' };
      case 'partial':
        return { icon: <FaClock />, label: 'Đóng một phần', class: 'status-partial' };
      default:
        return { icon: <FaExclamationCircle />, label: 'Chưa đóng', class: 'status-unpaid' };
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="my-tuition-page">
      <div className="page-header">
        <div>
          <h1>Học phí của tôi</h1>
          <p>Theo dõi tình trạng học phí qua các học kỳ</p>
        </div>
        <select 
          className="filter-select" 
          value={selectedSemester} 
          onChange={(e) => setSelectedSemester(e.target.value)}
        >
          <option value="">Tất cả học kỳ</option>
          {semesters.map(sem => (
            <option key={sem.id} value={sem.id}>
              {sem.name} - {sem.year}
            </option>
          ))}
        </select>
      </div>

      <div className="tuition-list">
        {tuitionFees.length === 0 ? (
          <div className="content-card">
            <div className="no-data-large">
              <FaMoneyBillWave />
              <h3>Chưa có thông tin học phí</h3>
              <p>Bạn chưa có khoản học phí nào cần thanh toán</p>
            </div>
          </div>
        ) : (
          tuitionFees.map(fee => {
            const statusInfo = getStatusInfo(fee.status);
            const progress = fee.total_amount > 0 
              ? (parseFloat(fee.paid_amount) / parseFloat(fee.total_amount)) * 100 
              : 0;

            return (
              <div key={fee.id} className={`tuition-card ${statusInfo.class}`}>
                <div className="tuition-header">
                  <div className="semester-info">
                    <h3>{fee.semester_name} - {fee.semester_year}</h3>
                    <span className={`status-badge ${statusInfo.class}`}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>
                  <div className="credits-info">
                    <span>{fee.total_credits} tín chỉ</span>
                  </div>
                </div>

                <div className="tuition-body">
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{Math.round(progress)}% đã thanh toán</span>
                  </div>

                  <div className="amount-grid">
                    <div className="amount-item">
                      <label>Tổng học phí</label>
                      <span className="amount">{formatCurrency(fee.total_amount)}</span>
                    </div>
                    <div className="amount-item">
                      <label>Đã đóng</label>
                      <span className="amount paid">{formatCurrency(fee.paid_amount)}</span>
                    </div>
                    <div className="amount-item">
                      <label>Còn nợ</label>
                      <span className="amount remaining">{formatCurrency(fee.remaining_amount)}</span>
                    </div>
                  </div>
                </div>

                <div className="tuition-footer">
                  <span>Hạn đóng: <strong>{formatDate(fee.due_date)}</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyTuition;
