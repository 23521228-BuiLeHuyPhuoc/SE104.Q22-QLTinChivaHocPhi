import { useState, useEffect } from 'react';
import { studentService } from '../services';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes } from 'react-icons/fa';
import './Students.css';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    student_code: '',
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Nam',
    address: '',
    class_name: '',
    major: '',
    enrollment_year: new Date().getFullYear()
  });

  useEffect(() => {
    loadStudents();
  }, [pagination.page, search]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await studentService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search
      });
      setStudents(response.data);
      setPagination(prev => ({ ...prev, ...response.pagination }));
    } catch (error) {
      toast.error('Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        student_code: student.student_code,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone || '',
        date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
        gender: student.gender || 'Nam',
        address: student.address || '',
        class_name: student.class_name || '',
        major: student.major || '',
        enrollment_year: student.enrollment_year || new Date().getFullYear()
      });
    } else {
      setEditingStudent(null);
      setFormData({
        student_code: '',
        full_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: 'Nam',
        address: '',
        class_name: '',
        major: '',
        enrollment_year: new Date().getFullYear()
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStudent(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await studentService.update(editingStudent.id, formData);
        toast.success('Cập nhật sinh viên thành công');
      } else {
        await studentService.create(formData);
        toast.success('Thêm sinh viên thành công');
      }
      closeModal();
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sinh viên này?')) {
      try {
        await studentService.delete(id);
        toast.success('Xóa sinh viên thành công');
        loadStudents();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể xóa sinh viên');
      }
    }
  };

  return (
    <div className="students-page">
      <div className="page-header">
        <div>
          <h1>Quản lý Sinh viên</h1>
          <p>Danh sách sinh viên trong hệ thống</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <FaPlus /> Thêm sinh viên
        </button>
      </div>

      <div className="content-card">
        <form onSubmit={handleSearch} className="search-bar">
          <div className="search-input">
            <FaSearch />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã SV, họ tên, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Tìm kiếm</button>
        </form>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã SV</th>
                    <th>Họ và tên</th>
                    <th>Email</th>
                    <th>Điện thoại</th>
                    <th>Lớp</th>
                    <th>Ngành</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id}>
                        <td><strong>{student.student_code}</strong></td>
                        <td>{student.full_name}</td>
                        <td>{student.email}</td>
                        <td>{student.phone || '-'}</td>
                        <td>{student.class_name || '-'}</td>
                        <td>{student.major || '-'}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-icon edit" onClick={() => openModal(student)} title="Sửa">
                              <FaEdit />
                            </button>
                            <button className="btn-icon delete" onClick={() => handleDelete(student.id)} title="Xóa">
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
              <h2>{editingStudent ? 'Sửa sinh viên' : 'Thêm sinh viên mới'}</h2>
              <button className="btn-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Mã sinh viên *</label>
                  <input
                    type="text"
                    name="student_code"
                    value={formData.student_code}
                    onChange={handleChange}
                    required
                    disabled={!!editingStudent}
                  />
                </div>
                <div className="form-group">
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Điện thoại</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ngày sinh</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Giới tính</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lớp</label>
                  <input
                    type="text"
                    name="class_name"
                    value={formData.class_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Ngành học</label>
                  <input
                    type="text"
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Năm nhập học</label>
                  <input
                    type="number"
                    name="enrollment_year"
                    value={formData.enrollment_year}
                    onChange={handleChange}
                    min="2000"
                    max="2030"
                  />
                </div>
                <div className="form-group">
                  <label>Địa chỉ</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  {editingStudent ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
