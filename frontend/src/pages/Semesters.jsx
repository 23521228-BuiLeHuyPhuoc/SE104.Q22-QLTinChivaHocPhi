import { useState, useEffect } from 'react';
import { semesterService } from '../services';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaCheck } from 'react-icons/fa';
import './Semesters.css';

const Semesters = () => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    registration_start: '',
    registration_end: '',
    is_active: false
  });

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const response = await semesterService.getAll();
      setSemesters(response.data);
    } catch (error) {
      toast.error('Không thể tải danh sách học kỳ');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (semester = null) => {
    if (semester) {
      setEditingSemester(semester);
      setFormData({
        name: semester.name,
        year: semester.year,
        start_date: semester.start_date?.split('T')[0] || '',
        end_date: semester.end_date?.split('T')[0] || '',
        registration_start: semester.registration_start?.split('T')[0] || '',
        registration_end: semester.registration_end?.split('T')[0] || '',
        is_active: semester.is_active
      });
    } else {
      setEditingSemester(null);
      setFormData({
        name: '',
        year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        registration_start: '',
        registration_end: '',
        is_active: false
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSemester(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSemester) {
        await semesterService.update(editingSemester.id, formData);
        toast.success('Cập nhật học kỳ thành công');
      } else {
        await semesterService.create(formData);
        toast.success('Thêm học kỳ thành công');
      }
      closeModal();
      loadSemesters();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học kỳ này?')) {
      try {
        await semesterService.delete(id);
        toast.success('Xóa học kỳ thành công');
        loadSemesters();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể xóa học kỳ');
      }
    }
  };

  const handleSetActive = async (semester) => {
    try {
      await semesterService.update(semester.id, { is_active: true });
      toast.success('Đã thiết lập học kỳ hoạt động');
      loadSemesters();
    } catch (error) {
      toast.error('Không thể thiết lập học kỳ');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="semesters-page">
      <div className="page-header">
        <div>
          <h1>Quản lý Học kỳ</h1>
          <p>Thiết lập các học kỳ trong năm học</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <FaPlus /> Thêm học kỳ
        </button>
      </div>

      <div className="content-card">
        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <div className="semesters-grid">
            {semesters.map((semester) => (
              <div 
                key={semester.id} 
                className={`semester-card ${semester.is_active ? 'active' : ''}`}
              >
                <div className="semester-header">
                  <h3>{semester.name} - {semester.year}</h3>
                  {semester.is_active && (
                    <span className="active-badge">
                      <FaCheck /> Đang hoạt động
                    </span>
                  )}
                </div>
                <div className="semester-body">
                  <div className="semester-info">
                    <label>Thời gian học:</label>
                    <span>{formatDate(semester.start_date)} - {formatDate(semester.end_date)}</span>
                  </div>
                  <div className="semester-info">
                    <label>Đăng ký môn học:</label>
                    <span>{formatDate(semester.registration_start)} - {formatDate(semester.registration_end)}</span>
                  </div>
                </div>
                <div className="semester-actions">
                  {!semester.is_active && (
                    <button 
                      className="btn btn-success btn-sm" 
                      onClick={() => handleSetActive(semester)}
                    >
                      <FaCheck /> Kích hoạt
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => openModal(semester)}
                  >
                    <FaEdit /> Sửa
                  </button>
                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => handleDelete(semester.id)}
                  >
                    <FaTrash /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSemester ? 'Sửa học kỳ' : 'Thêm học kỳ mới'}</h2>
              <button className="btn-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Tên học kỳ *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="VD: Học kỳ 1"
                  />
                </div>
                <div className="form-group">
                  <label>Năm học *</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    required
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ngày bắt đầu *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc *</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Bắt đầu đăng ký</label>
                  <input
                    type="date"
                    name="registration_start"
                    value={formData.registration_start}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Kết thúc đăng ký</label>
                  <input
                    type="date"
                    name="registration_end"
                    value={formData.registration_end}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                  Đặt làm học kỳ đang hoạt động
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  {editingSemester ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Semesters;
