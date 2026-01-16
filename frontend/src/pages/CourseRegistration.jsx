import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { registrationService, semesterService } from '../services';
import { toast } from 'react-toastify';
import { FaPlus, FaCheck, FaSearch } from 'react-icons/fa';
import './CourseRegistration.css';

const CourseRegistration = () => {
  const { student } = useAuth();
  const [availableCourses, setAvailableCourses] = useState([]);
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
      const [availableRes, registeredRes] = await Promise.all([
        registrationService.getAvailableCourses({
          student_id: student.id,
          semester_id: selectedSemester
        }),
        registrationService.getStudentCourses(student.id, {
          semester_id: selectedSemester,
          status: 'registered'
        })
      ]);
      setAvailableCourses(availableRes.data);
      setRegisteredCourses(registeredRes.data.courses);
    } catch (error) {
      toast.error('Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (courseId) => {
    try {
      await registrationService.register({
        student_id: student.id,
        course_id: courseId,
        semester_id: selectedSemester
      });
      toast.success('Đăng ký môn học thành công');
      loadCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể đăng ký môn học');
    }
  };

  const handleCancelRegistration = async (regId) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đăng ký môn học này?')) {
      try {
        await registrationService.cancel(regId);
        toast.success('Hủy đăng ký thành công');
        loadCourses();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể hủy đăng ký');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const filteredCourses = availableCourses.filter(course =>
    course.course_code.toLowerCase().includes(search.toLowerCase()) ||
    course.course_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalCredits = registeredCourses.reduce((sum, c) => sum + c.credits, 0);
  const totalFees = registeredCourses.reduce((sum, c) => sum + (c.credits * parseFloat(c.fee_per_credit)), 0);

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="course-registration-page">
      <div className="page-header">
        <div>
          <h1>Đăng ký Môn học</h1>
          <p>Chọn các môn học bạn muốn đăng ký trong học kỳ</p>
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

      <div className="registration-container">
        <div className="available-courses">
          <div className="section-header">
            <h2>Môn học có thể đăng ký</h2>
            <div className="search-mini">
              <FaSearch />
              <input
                type="text"
                placeholder="Tìm môn học..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="courses-list">
            {filteredCourses.length === 0 ? (
              <div className="no-courses">Không có môn học nào có thể đăng ký</div>
            ) : (
              filteredCourses.map(course => (
                <div key={course.id} className="course-item">
                  <div className="course-info">
                    <div className="course-header">
                      <strong>{course.course_code}</strong>
                      <span className="credits-badge">{course.credits} TC</span>
                    </div>
                    <h4>{course.course_name}</h4>
                    <div className="course-details">
                      <span>📅 {course.schedule || 'Chưa có lịch'}</span>
                      <span>🏫 {course.room || 'N/A'}</span>
                      <span>👨‍🏫 {course.instructor || 'N/A'}</span>
                    </div>
                    <div className="course-meta">
                      <span>Sĩ số: {course.registered_count || 0}/{course.max_students}</span>
                      <span className="fee">{formatCurrency(course.credits * course.fee_per_credit)}</span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleRegister(course.id)}
                    disabled={course.registered_count >= course.max_students}
                  >
                    <FaPlus /> Đăng ký
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="registered-courses">
          <div className="section-header">
            <h2>Môn đã đăng ký</h2>
          </div>
          <div className="courses-list">
            {registeredCourses.length === 0 ? (
              <div className="no-courses">Bạn chưa đăng ký môn học nào</div>
            ) : (
              registeredCourses.map(course => (
                <div key={course.id} className="course-item registered">
                  <div className="course-info">
                    <div className="course-header">
                      <strong>{course.course_code}</strong>
                      <span className="credits-badge">{course.credits} TC</span>
                    </div>
                    <h4>{course.course_name}</h4>
                    <div className="course-details">
                      <span>📅 {course.schedule || 'N/A'}</span>
                      <span>💰 {formatCurrency(course.credits * parseFloat(course.fee_per_credit))}</span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCancelRegistration(course.id)}
                  >
                    Hủy
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="summary-card">
            <div className="summary-item">
              <label>Tổng tín chỉ:</label>
              <span>{totalCredits} TC</span>
            </div>
            <div className="summary-item">
              <label>Tổng học phí:</label>
              <span className="total-fee">{formatCurrency(totalFees)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseRegistration;
