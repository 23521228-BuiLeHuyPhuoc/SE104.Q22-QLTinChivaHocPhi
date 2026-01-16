import { useState, useEffect } from 'react';
import { FaChalkboardTeacher, FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaTimes, FaClock, FaMapMarkerAlt, FaUsers, FaDoorOpen, FaBook } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { classService, courseService, semesterService } from '../services';
import './Classes.css';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [stats, setStats] = useState({});
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    ma_lop: '',
    ten_lop: '',
    ma_mon_hoc: '',
    giang_vien: '',
    lich_hoc: '',
    phong_hoc: '',
    so_luong_toi_da: 50,
    mo_ta: ''
  });

  // Open class form
  const [openForm, setOpenForm] = useState({
    ma_hoc_ky: '',
    ma_lop: '',
    ghi_chu: ''
  });

  useEffect(() => {
    fetchData();
  }, [search, filterCourse, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, coursesRes, semestersRes, statsRes] = await Promise.all([
        classService.getAll({ search, ma_mon_hoc: filterCourse, trang_thai: filterStatus }),
        courseService.getAll(),
        semesterService.getAll(),
        classService.getStats()
      ]);
      
      setClasses(classesRes.data || []);
      setCourses(coursesRes.data || []);
      setSemesters(semestersRes.data || []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenFormChange = (e) => {
    const { name, value } = e.target;
    setOpenForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      ma_lop: '',
      ten_lop: '',
      ma_mon_hoc: '',
      giang_vien: '',
      lich_hoc: '',
      phong_hoc: '',
      so_luong_toi_da: 50,
      mo_ta: ''
    });
    setEditingClass(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      ma_lop: classItem.ma_lop,
      ten_lop: classItem.ten_lop,
      ma_mon_hoc: classItem.ma_mon_hoc,
      giang_vien: classItem.giang_vien || '',
      lich_hoc: classItem.lich_hoc || '',
      phong_hoc: classItem.phong_hoc || '',
      so_luong_toi_da: classItem.so_luong_toi_da || 50,
      mo_ta: classItem.mo_ta || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.ma_lop || !formData.ten_lop || !formData.ma_mon_hoc) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      if (editingClass) {
        await classService.update(editingClass.ma_lop, formData);
        toast.success('Cập nhật lớp học thành công');
      } else {
        await classService.create(formData);
        toast.success('Thêm lớp học thành công');
      }
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (ma_lop) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lớp học này?')) return;
    
    try {
      await classService.delete(ma_lop);
      toast.success('Xóa lớp học thành công');
      fetchData();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa lớp học');
    }
  };

  const handleOpenClass = (classItem) => {
    setOpenForm({
      ma_hoc_ky: '',
      ma_lop: classItem.ma_lop,
      ghi_chu: ''
    });
    setShowOpenModal(true);
  };

  const handleSubmitOpenClass = async (e) => {
    e.preventDefault();
    
    if (!openForm.ma_hoc_ky || !openForm.ma_lop) {
      toast.error('Vui lòng chọn học kỳ');
      return;
    }

    try {
      await classService.openClass(openForm);
      toast.success('Mở lớp thành công');
      setShowOpenModal(false);
      fetchData();
    } catch (error) {
      console.error('Error opening class:', error);
      toast.error(error.response?.data?.message || 'Không thể mở lớp');
    }
  };

  const getCourseName = (ma_mon_hoc) => {
    const course = courses.find(c => c.ma_mon_hoc === ma_mon_hoc);
    return course ? course.ten_mon_hoc : ma_mon_hoc;
  };

  if (loading) {
    return (
      <div className="classes-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="classes-page">
      <div className="page-header">
        <div className="header-left">
          <h1><FaChalkboardTeacher /> Quản lý Lớp học</h1>
          <p>Quản lý các lớp học theo môn học</p>
        </div>
        <button className="btn-add" onClick={handleAdd}>
          <FaPlus /> Thêm lớp học
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FaChalkboardTeacher />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total_classes || 0}</span>
            <span className="stat-label">Tổng lớp học</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FaDoorOpen />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.active_classes || 0}</span>
            <span className="stat-label">Lớp đang hoạt động</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FaBook />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total_courses_with_classes || 0}</span>
            <span className="stat-label">Môn có lớp</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FaUsers />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total_opened_classes || 0}</span>
            <span className="stat-label">Lớp đang mở</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Tìm kiếm lớp học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <FaFilter />
          <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
            <option value="">Tất cả môn học</option>
            {courses.map(course => (
              <option key={course.ma_mon_hoc} value={course.ma_mon_hoc}>
                {course.ten_mon_hoc}
              </option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Ngừng hoạt động</option>
          </select>
        </div>
      </div>

      {/* Classes Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã lớp</th>
              <th>Tên lớp</th>
              <th>Môn học</th>
              <th>Giảng viên</th>
              <th>Lịch học</th>
              <th>Phòng</th>
              <th>Sĩ số tối đa</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-row">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              classes.map(classItem => (
                <tr key={classItem.ma_lop}>
                  <td><strong>{classItem.ma_lop}</strong></td>
                  <td>{classItem.ten_lop}</td>
                  <td>
                    <span className="course-badge">
                      {classItem.ten_mon_hoc || getCourseName(classItem.ma_mon_hoc)}
                    </span>
                  </td>
                  <td>{classItem.giang_vien || '-'}</td>
                  <td>
                    {classItem.lich_hoc && (
                      <span className="schedule-info">
                        <FaClock /> {classItem.lich_hoc}
                      </span>
                    )}
                  </td>
                  <td>
                    {classItem.phong_hoc && (
                      <span className="room-info">
                        <FaMapMarkerAlt /> {classItem.phong_hoc}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="capacity-badge">
                      <FaUsers /> {classItem.so_luong_toi_da}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${classItem.trang_thai ? 'active' : 'inactive'}`}>
                      {classItem.trang_thai ? 'Hoạt động' : 'Ngừng'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-icon open" onClick={() => handleOpenClass(classItem)} title="Mở lớp trong học kỳ">
                      <FaDoorOpen />
                    </button>
                    <button className="btn-icon edit" onClick={() => handleEdit(classItem)} title="Chỉnh sửa">
                      <FaEdit />
                    </button>
                    <button className="btn-icon delete" onClick={() => handleDelete(classItem.ma_lop)} title="Xóa">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingClass ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Mã lớp <span className="required">*</span></label>
                  <input
                    type="text"
                    name="ma_lop"
                    value={formData.ma_lop}
                    onChange={handleInputChange}
                    placeholder="VD: IT001.01"
                    disabled={!!editingClass}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tên lớp <span className="required">*</span></label>
                  <input
                    type="text"
                    name="ten_lop"
                    value={formData.ten_lop}
                    onChange={handleInputChange}
                    placeholder="VD: Lập trình cơ bản - Lớp 1"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Môn học <span className="required">*</span></label>
                  <select
                    name="ma_mon_hoc"
                    value={formData.ma_mon_hoc}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Chọn môn học --</option>
                    {courses.map(course => (
                      <option key={course.ma_mon_hoc} value={course.ma_mon_hoc}>
                        {course.ma_mon_hoc} - {course.ten_mon_hoc}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Giảng viên</label>
                  <input
                    type="text"
                    name="giang_vien"
                    value={formData.giang_vien}
                    onChange={handleInputChange}
                    placeholder="Tên giảng viên"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lịch học</label>
                  <input
                    type="text"
                    name="lich_hoc"
                    value={formData.lich_hoc}
                    onChange={handleInputChange}
                    placeholder="VD: Thứ 2, 7h30-9h30"
                  />
                </div>
                <div className="form-group">
                  <label>Phòng học</label>
                  <input
                    type="text"
                    name="phong_hoc"
                    value={formData.phong_hoc}
                    onChange={handleInputChange}
                    placeholder="VD: B1.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Sĩ số tối đa</label>
                  <input
                    type="number"
                    name="so_luong_toi_da"
                    value={formData.so_luong_toi_da}
                    onChange={handleInputChange}
                    min="1"
                    max="200"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  name="mo_ta"
                  value={formData.mo_ta}
                  onChange={handleInputChange}
                  placeholder="Mô tả về lớp học..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  {editingClass ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Class Modal */}
      {showOpenModal && (
        <div className="modal-overlay" onClick={() => setShowOpenModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mở lớp trong học kỳ</h2>
              <button className="btn-close" onClick={() => setShowOpenModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmitOpenClass} className="modal-form">
              <div className="form-group">
                <label>Lớp học</label>
                <input type="text" value={openForm.ma_lop} disabled />
              </div>
              
              <div className="form-group">
                <label>Học kỳ <span className="required">*</span></label>
                <select
                  name="ma_hoc_ky"
                  value={openForm.ma_hoc_ky}
                  onChange={handleOpenFormChange}
                  required
                >
                  <option value="">-- Chọn học kỳ --</option>
                  {semesters.map(sem => (
                    <option key={sem.ma_hoc_ky} value={sem.ma_hoc_ky}>
                      {sem.ten_hoc_ky} - {sem.ten_nam_hoc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ghi chú</label>
                <textarea
                  name="ghi_chu"
                  value={openForm.ghi_chu}
                  onChange={handleOpenFormChange}
                  placeholder="Ghi chú thêm..."
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowOpenModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  <FaDoorOpen /> Mở lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
