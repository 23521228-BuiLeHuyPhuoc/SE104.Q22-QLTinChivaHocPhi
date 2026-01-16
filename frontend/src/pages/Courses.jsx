import { useState, useEffect } from 'react';
import { courseService, semesterService } from '../services';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaUsers } from 'react-icons/fa';
import './Courses.css';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    credits: 3,
    description: '',
    fee_per_credit: 500000,
    max_students: 50,
    semester_id: '',
    schedule: '',
    room: '',
    instructor: ''
  });

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    loadCourses();
  }, [pagination.page, search, selectedSemester]);

  const loadSemesters = async () => {
    try {
      const response = await semesterService.getAll();
      setSemesters(response.data);
      if (response.data.length > 0) {
        const activeSemester = response.data.find(s => s.is_active);
        setSelectedSemester(activeSemester?.id || response.data[0].id);
      }
    } catch (error) {
      console.error('Error loading semesters:', error);
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await courseService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search,
        semester_id: selectedSemester
      });
      setCourses(response.data);
      setPagination(prev => ({ ...prev, ...response.pagination }));
    } catch (error) {
      toast.error('Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        course_code: course.course_code,
        course_name: course.course_name,
        credits: course.credits,
        description: course.description || '',
        fee_per_credit: course.fee_per_credit || 500000,
        max_students: course.max_students || 50,
        semester_id: course.semester_id || '',
        schedule: course.schedule || '',
        room: course.room || '',
        instructor: course.instructor || ''
      });
    } else {
      setEditingCourse(null);
      setFormData({
        course_code: '',
        course_name: '',
        credits: 3,
        description: '',
        fee_per_credit: 500000,
        max_students: 50,
        semester_id: selectedSemester,
        schedule: '',
        room: '',
        instructor: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await courseService.update(editingCourse.id, formData);
        toast.success('Cập nhật môn học thành công');
      } else {
        await courseService.create(formData);
        toast.success('Thêm môn học thành công');
      }
      closeModal();
      loadCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
      try {
        await courseService.delete(id);
        toast.success('Xóa môn học thành công');
        loadCourses();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể xóa môn học');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  return (
    <div className="courses-page">
      <div className="page-header">
        <div>
          <h1>Quản lý Môn học</h1>
          <p>Danh sách môn học trong hệ thống</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <FaPlus /> Thêm môn học
        </button>
      </div>

      <div className="content-card">
        <div className="filters">
          <form onSubmit={handleSearch} className="search-bar">
            <div className="search-input">
              <FaSearch />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã môn, tên môn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">Tìm kiếm</button>
          </form>
          <select 
            className="filter-select" 
            value={selectedSemester} 
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="">Tất cả học kỳ</option>
            {semesters.map(sem => (
              <option key={sem.id} value={sem.id}>
                {sem.name} - {sem.year} {sem.is_active ? '(Hiện tại)' : ''}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã môn</th>
                    <th>Tên môn học</th>
                    <th>Tín chỉ</th>
                    <th>Học phí/TC</th>
                    <th>Sĩ số</th>
                    <th>Lịch học</th>
                    <th>Giảng viên</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="no-data">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    courses.map((course) => (
                      <tr key={course.id}>
                        <td><strong>{course.course_code}</strong></td>
                        <td>{course.course_name}</td>
                        <td className="text-center">{course.credits}</td>
                        <td>{formatCurrency(course.fee_per_credit)}</td>
                        <td>
                          <span className={`capacity ${course.registered_count >= course.max_students ? 'full' : ''}`}>
                            <FaUsers /> {course.registered_count || 0}/{course.max_students}
                          </span>
                        </td>
                        <td>{course.schedule || '-'}</td>
                        <td>{course.instructor || '-'}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-icon edit" onClick={() => openModal(course)} title="Sửa">
                              <FaEdit />
                            </button>
                            <button className="btn-icon delete" onClick={() => handleDelete(course.id)} title="Xóa">
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="btn btn-sm" 
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Trước
                </button>
                <span>Trang {pagination.page} / {pagination.totalPages}</span>
                <button 
                  className="btn btn-sm" 
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCourse ? 'Sửa môn học' : 'Thêm môn học mới'}</h2>
              <button className="btn-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Mã môn học *</label>
                  <input
                    type="text"
                    name="course_code"
                    value={formData.course_code}
                    onChange={handleChange}
                    required
                    disabled={!!editingCourse}
                  />
                </div>
                <div className="form-group">
                  <label>Tên môn học *</label>
                  <input
                    type="text"
                    name="course_name"
                    value={formData.course_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Số tín chỉ *</label>
                  <input
                    type="number"
                    name="credits"
                    value={formData.credits}
                    onChange={handleChange}
                    required
                    min="1"
                    max="10"
                  />
                </div>
                <div className="form-group">
                  <label>Học phí / tín chỉ (VNĐ)</label>
                  <input
                    type="number"
                    name="fee_per_credit"
                    value={formData.fee_per_credit}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Sĩ số tối đa</label>
                  <input
                    type="number"
                    name="max_students"
                    value={formData.max_students}
                    onChange={handleChange}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Học kỳ</label>
                  <select name="semester_id" value={formData.semester_id} onChange={handleChange}>
                    <option value="">Chọn học kỳ</option>
                    {semesters.map(sem => (
                      <option key={sem.id} value={sem.id}>
                        {sem.name} - {sem.year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lịch học</label>
                  <input
                    type="text"
                    name="schedule"
                    value={formData.schedule}
                    onChange={handleChange}
                    placeholder="VD: Thứ 2, Thứ 4 (7:00-9:00)"
                  />
                </div>
                <div className="form-group">
                  <label>Phòng học</label>
                  <input
                    type="text"
                    name="room"
                    value={formData.room}
                    onChange={handleChange}
                    placeholder="VD: A101"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Giảng viên</label>
                  <input
                    type="text"
                    name="instructor"
                    value={formData.instructor}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Mô tả</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  {editingCourse ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
