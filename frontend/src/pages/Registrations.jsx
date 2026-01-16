import { useState, useEffect } from 'react';
import { registrationService, semesterService, studentService } from '../services';
import { toast } from 'react-toastify';
import { FaSearch, FaTimes, FaCheck, FaBan } from 'react-icons/fa';
import './Registrations.css';

const Registrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    loadRegistrations();
  }, [pagination.page, search, selectedSemester, selectedStatus]);

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

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await registrationService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search,
        semester_id: selectedSemester,
        status: selectedStatus
      });
      setRegistrations(response.data);
      setPagination(prev => ({ ...prev, ...response.pagination }));
    } catch (error) {
      toast.error('Không thể tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCancelRegistration = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đăng ký này?')) {
      try {
        await registrationService.cancel(id);
        toast.success('Hủy đăng ký thành công');
        loadRegistrations();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể hủy đăng ký');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      registered: { label: 'Đã đăng ký', class: 'status-registered' },
      cancelled: { label: 'Đã hủy', class: 'status-cancelled' },
      completed: { label: 'Hoàn thành', class: 'status-completed' }
    };
    const { label, class: className } = statusMap[status] || { label: status, class: '' };
    return <span className={`status-badge ${className}`}>{label}</span>;
  };

  return (
    <div className="registrations-page">
      <div className="page-header">
        <div>
          <h1>Quản lý Đăng ký môn học</h1>
          <p>Danh sách đăng ký môn học của sinh viên</p>
        </div>
      </div>

      <div className="content-card">
        <div className="filters">
          <form onSubmit={handleSearch} className="search-bar">
            <div className="search-input">
              <FaSearch />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã SV, tên SV, mã môn..."
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
          <select 
            className="filter-select" 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="registered">Đã đăng ký</option>
            <option value="cancelled">Đã hủy</option>
            <option value="completed">Hoàn thành</option>
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
                    <th>Mã SV</th>
                    <th>Tên sinh viên</th>
                    <th>Mã môn</th>
                    <th>Tên môn học</th>
                    <th>Tín chỉ</th>
                    <th>Học phí</th>
                    <th>Ngày đăng ký</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="no-data">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    registrations.map((reg) => (
                      <tr key={reg.id}>
                        <td><strong>{reg.student_code}</strong></td>
                        <td>{reg.student_name}</td>
                        <td><strong>{reg.course_code}</strong></td>
                        <td>{reg.course_name}</td>
                        <td className="text-center">{reg.credits}</td>
                        <td>{formatCurrency(reg.credits * reg.fee_per_credit)}</td>
                        <td>{formatDate(reg.registration_date)}</td>
                        <td>{getStatusBadge(reg.status)}</td>
                        <td>
                          {reg.status === 'registered' && (
                            <button 
                              className="btn-icon delete" 
                              onClick={() => handleCancelRegistration(reg.id)} 
                              title="Hủy đăng ký"
                            >
                              <FaBan />
                            </button>
                          )}
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
    </div>
  );
};

export default Registrations;
