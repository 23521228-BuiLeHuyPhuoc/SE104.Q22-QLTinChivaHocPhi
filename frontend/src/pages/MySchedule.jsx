import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { registrationService, semesterService } from '../services';
import { toast } from 'react-toastify';
import { FaCalendarAlt, FaClock, FaDoorOpen, FaUserTie, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './MySchedule.css';

const MySchedule = () => {
  const { student } = useAuth();
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'list'
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const timeSlots = [
    { id: 1, label: 'Tiết 1-2', time: '07:00 - 08:30' },
    { id: 2, label: 'Tiết 3-4', time: '08:45 - 10:15' },
    { id: 3, label: 'Tiết 5-6', time: '10:30 - 12:00' },
    { id: 4, label: 'Tiết 7-8', time: '13:00 - 14:30' },
    { id: 5, label: 'Tiết 9-10', time: '14:45 - 16:15' },
    { id: 6, label: 'Tiết 11-12', time: '16:30 - 18:00' },
    { id: 7, label: 'Tiết 13-14', time: '18:15 - 19:45' },
    { id: 8, label: 'Tiết 15-16', time: '20:00 - 21:30' },
  ];

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
      setCourses(response.data.courses || []);
    } catch (error) {
      toast.error('Không thể tải thời khoá biểu');
    } finally {
      setLoading(false);
    }
  };

  // Parse schedule string to get day and time slot
  const parseSchedule = (scheduleStr) => {
    if (!scheduleStr) return [];
    
    const schedules = [];
    // Format expected: "Thứ 2 (Tiết 1-2)", "Thứ 3 (Tiết 3-4)"
    const parts = scheduleStr.split(',').map(s => s.trim());
    
    parts.forEach(part => {
      const dayMatch = part.match(/Thứ (\d+)|Chủ nhật/i);
      const slotMatch = part.match(/Tiết (\d+)-(\d+)/i);
      
      if (dayMatch) {
        let dayIndex;
        if (part.includes('Chủ nhật')) {
          dayIndex = 6;
        } else {
          dayIndex = parseInt(dayMatch[1]) - 2; // Convert "Thứ 2" to index 0
        }
        
        if (slotMatch) {
          const startSlot = Math.floor((parseInt(slotMatch[1]) - 1) / 2);
          schedules.push({ day: dayIndex, slot: startSlot });
        }
      }
    });
    
    return schedules;
  };

  // Get courses for a specific day and slot
  const getCoursesForSlot = (dayIndex, slotIndex) => {
    return courses.filter(course => {
      const schedules = parseSchedule(course.schedule);
      return schedules.some(s => s.day === dayIndex && s.slot === slotIndex);
    });
  };

  // Get week dates
  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentWeek);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeek(newDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Color palette for courses
  const courseColors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', 
    '#06b6d4', '#f59e0b', '#6366f1', '#14b8a6', '#ef4444'
  ];

  const getCourseColor = (courseId) => {
    const index = courses.findIndex(c => c.id === courseId);
    return courseColors[index % courseColors.length];
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="my-schedule-page">
      <div className="page-header">
        <div>
          <h1>Thời khoá biểu</h1>
          <p>Lịch học trong tuần</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={viewMode === 'week' ? 'active' : ''}
              onClick={() => setViewMode('week')}
            >
              Theo tuần
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              Danh sách
            </button>
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
      </div>

      {viewMode === 'week' ? (
        <>
          {/* Week Navigation */}
          <div className="week-navigation">
            <button className="nav-btn" onClick={() => navigateWeek(-1)}>
              <FaChevronLeft />
            </button>
            <span className="week-label">
              {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </span>
            <button className="nav-btn" onClick={() => navigateWeek(1)}>
              <FaChevronRight />
            </button>
            <button className="today-btn" onClick={() => setCurrentWeek(new Date())}>
              Hôm nay
            </button>
          </div>

          {/* Schedule Grid */}
          <div className="schedule-container">
            <div className="schedule-grid">
              {/* Header Row */}
              <div className="grid-header">
                <div className="time-header">
                  <FaClock />
                </div>
                {daysOfWeek.map((day, index) => (
                  <div 
                    key={day} 
                    className={`day-header ${isToday(weekDates[index]) ? 'today' : ''}`}
                  >
                    <span className="day-name">{day}</span>
                    <span className="day-date">{formatDate(weekDates[index])}</span>
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              {timeSlots.map((slot, slotIndex) => (
                <div key={slot.id} className="grid-row">
                  <div className="time-cell">
                    <span className="slot-label">{slot.label}</span>
                    <span className="slot-time">{slot.time}</span>
                  </div>
                  {daysOfWeek.map((day, dayIndex) => {
                    const slotCourses = getCoursesForSlot(dayIndex, slotIndex);
                    return (
                      <div 
                        key={`${day}-${slot.id}`} 
                        className={`grid-cell ${isToday(weekDates[dayIndex]) ? 'today' : ''}`}
                      >
                        {slotCourses.map(course => (
                          <div 
                            key={course.id}
                            className="course-block"
                            style={{ backgroundColor: getCourseColor(course.id) }}
                          >
                            <span className="course-name">{course.course_name}</span>
                            <span className="course-code">{course.course_code}</span>
                            <span className="course-room">
                              <FaDoorOpen /> {course.room || 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* List View */
        <div className="schedule-list">
          {courses.length === 0 ? (
            <div className="no-data-large">
              <FaCalendarAlt />
              <h3>Chưa có lịch học</h3>
              <p>Bạn chưa đăng ký môn học nào trong học kỳ này</p>
            </div>
          ) : (
            <div className="courses-list">
              {courses.map(course => (
                <div key={course.id} className="course-list-item">
                  <div 
                    className="course-color-bar"
                    style={{ backgroundColor: getCourseColor(course.id) }}
                  ></div>
                  <div className="course-list-content">
                    <div className="course-list-header">
                      <span className="course-code">{course.course_code}</span>
                      <span className="course-credits">{course.credits} tín chỉ</span>
                    </div>
                    <h3 className="course-name">{course.course_name}</h3>
                    <div className="course-list-details">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Course Legend */}
      {courses.length > 0 && viewMode === 'week' && (
        <div className="course-legend">
          <h4>Chú thích môn học</h4>
          <div className="legend-items">
            {courses.map(course => (
              <div key={course.id} className="legend-item">
                <span 
                  className="legend-color"
                  style={{ backgroundColor: getCourseColor(course.id) }}
                ></span>
                <span className="legend-text">{course.course_code} - {course.course_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MySchedule;
