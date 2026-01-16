import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { registrationService, semesterService } from '../services';
import { toast } from 'react-toastify';
import { FaBook, FaCalendarAlt, FaDoorOpen, FaUserTie } from 'react-icons/fa';
import './MyCourses.css';

const MyCourses = () => {
  const { student } = useAuth();
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [summary, setSummary] = useState({ totalCourses: 0, totalCredits: 0, totalFees: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester && student) {
      loadCourses();
    }
  }, [selectedSemester, student]);

  const loadSemesters = async () => {
    try {
      const response = await semesterService.getAll();
      setSemesters(response.data);
      const activeSemester = response.data.find(s => s.is_active);
      if (activeSemester) {
        setSelectedSemester(activeSemester.id);
      }
    } catch (error) {
      console.error('Error loading semesters:', error);
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await registrationService.getStudentCourses(student.id, {
        semester_id: selectedSemester,
        status: 'registered'
      });
      setCourses(response.data.courses);
      setSummary(response.data.summary);
    } catch (error) {
      toast.error('Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="my-courses-page">
      <div className="page-header">
        <div>
          <h1>Môn học của tôi</h1>
          <p>Danh sách các môn học đã đăng ký</p>
        </div>
        <select 
          className="filter-select" 
          value={selectedSemester} 
          onChange={(e) => setSelectedSemester(e.target.value)}
        >
          {semesters.map(sem => (
            <option key={sem.id} value={sem.id}>
              {sem.name} - {sem.year} {sem.is_active ? '(Hiện tại)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <FaBook />
          <div>
            <h3>{summary.totalCourses}</h3>
            <p>Môn học</p>
          </div>
        </div>
        <div className="summary-card">
          <FaCalendarAlt />
          <div>
            <h3>{summary.totalCredits}</h3>
            <p>Tín chỉ</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="currency-icon">₫</div>
          <div>
            <h3>{formatCurrency(summary.totalFees)}</h3>
            <p>Học phí</p>
          </div>
        </div>
      </div>

      <div className="content-card">
        {courses.length === 0 ? (
          <div className="no-data-large">
            <FaBook />
            <h3>Chưa có môn học nào</h3>
            <p>Bạn chưa đăng ký môn học nào trong học kỳ này</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map(course => (
              <div key={course.id} className="course-card">
                <div className="course-card-header">
                  <span className="course-code">{course.course_code}</span>
                  <span className="credits">{course.credits} TC</span>
                </div>
                <h3>{course.course_name}</h3>
                <div className="course-card-details">
                  <div className="detail-item">
                    <FaCalendarAlt />
                    <span>{course.schedule || 'Chưa có lịch'}</span>
                  </div>
                  <div className="detail-item">
                    <FaDoorOpen />
                    <span>{course.room || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <FaUserTie />
                    <span>{course.instructor || 'N/A'}</span>
                  </div>
                </div>
                <div className="course-card-footer">
                  <span className="fee">{formatCurrency(course.credits * parseFloat(course.fee_per_credit))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
