import { useState, useEffect } from 'react';
import { tuitionService, semesterService } from '../services';
import { toast } from 'react-toastify';
import { FaSearch, FaEye, FaMoneyBill } from 'react-icons/fa';
import './Tuition.css';

const Tuition = () => {
  const [tuitionFees, setTuitionFees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [feeDetail, setFeeDetail] = useState(null);

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    loadTuitionFees();
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

  const loadTuitionFees = async () => {
    try {
      setLoading(true);
      const response = await tuitionService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search,
        semester_id: selectedSemester,
        status: selectedStatus
      });
      setTuitionFees(response.data);
      setPagination(prev => ({ ...prev, ...response.pagination }));
    } catch (error) {
      toast.error('Không thể tải danh sách học phí');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const viewDetail = async (fee) => {
    try {
      const response = await tuitionService.getById(fee.id);
      setFeeDetail(response.data);
      setSelectedFee(fee);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('Không thể tải chi tiết học phí');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      unpaid: { label: 'Chưa đóng', class: 'status-unpaid' },
      partial: { label: 'Đóng một phần', class: 'status-partial' },
      paid: { label: 'Đã đóng đủ', class: 'status-paid' }
    };
    const { label, class: className } = statusMap[status] || { label: status, class: '' };
    return <span className={`status-badge ${className}`}>{label}</span>;
  };

  return (
    <div className="tuition-page">
      <div className="page-header">
        <div>
          <h1>Quản lý Học phí</h1>
          <p>Theo dõi tình trạng học phí của sinh viên</p>
        </div>
      </div>

      <div className="content-card">
        <div className="filters">
          <form onSubmit={handleSearch} className="search-bar">
            <div className="search-input">
              <FaSearch />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã SV, tên SV..."
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
            <option value="unpaid">Chưa đóng</option>
            <option value="partial">Đóng một phần</option>
            <option value="paid">Đã đóng đủ</option>
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
                    <th>Lớp</th>
                    <th>Học kỳ</th>
                    <th>Tín chỉ</th>
                    <th>Tổng học phí</th>
                    <th>Đã đóng</th>
                    <th>Còn nợ</th>
                    <th>Trạng thái</th>
                    <th>Hạn đóng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {tuitionFees.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="no-data">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    tuitionFees.map((fee) => (
                      <tr key={fee.id}>
                        <td><strong>{fee.student_code}</strong></td>
                        <td>{fee.student_name}</td>
                        <td>{fee.class_name || '-'}</td>
                        <td>{fee.semester_name} - {fee.semester_year}</td>
                        <td className="text-center">{fee.total_credits}</td>
                        <td className="text-right">{formatCurrency(fee.total_amount)}</td>
                        <td className="text-right text-success">{formatCurrency(fee.paid_amount)}</td>
                        <td className="text-right text-danger">{formatCurrency(fee.remaining_amount)}</td>
                        <td>{getStatusBadge(fee.status)}</td>
                        <td>{formatDate(fee.due_date)}</td>
                        <td>
                          <button 
                            className="btn-icon view" 
                            onClick={() => viewDetail(fee)} 
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
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

      {showDetailModal && feeDetail && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chi tiết học phí - {selectedFee?.student_name}</h2>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Thông tin chung</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Mã sinh viên:</label>
                    <span>{selectedFee?.student_code}</span>
                  </div>
                  <div className="info-item">
                    <label>Họ và tên:</label>
                    <span>{selectedFee?.student_name}</span>
                  </div>
                  <div className="info-item">
                    <label>Học kỳ:</label>
                    <span>{selectedFee?.semester_name} - {selectedFee?.semester_year}</span>
                  </div>
                  <div className="info-item">
                    <label>Tổng tín chỉ:</label>
                    <span>{feeDetail.tuitionFee?.total_credits}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Các môn học đã đăng ký</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã môn</th>
                      <th>Tên môn học</th>
                      <th>Tín chỉ</th>
                      <th>Học phí/TC</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeDetail.courses?.map((course, index) => (
                      <tr key={index}>
                        <td>{course.course_code}</td>
                        <td>{course.course_name}</td>
                        <td className="text-center">{course.credits}</td>
                        <td className="text-right">{formatCurrency(course.fee_per_credit)}</td>
                        <td className="text-right">{formatCurrency(course.course_fee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="detail-section">
                <h3>Lịch sử thanh toán</h3>
                {feeDetail.payments?.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ngày thanh toán</th>
                        <th>Số tiền</th>
                        <th>Phương thức</th>
                        <th>Mã giao dịch</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeDetail.payments.map((payment, index) => (
                        <tr key={index}>
                          <td>{formatDate(payment.payment_date)}</td>
                          <td className="text-right text-success">{formatCurrency(payment.amount)}</td>
                          <td>{payment.payment_method}</td>
                          <td>{payment.transaction_id || '-'}</td>
                          <td>{payment.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-data">Chưa có thanh toán nào</p>
                )}
              </div>

              <div className="tuition-summary">
                <div className="summary-item">
                  <label>Tổng học phí:</label>
                  <span>{formatCurrency(feeDetail.tuitionFee?.total_amount)}</span>
                </div>
                <div className="summary-item">
                  <label>Đã thanh toán:</label>
                  <span className="text-success">{formatCurrency(feeDetail.tuitionFee?.paid_amount)}</span>
                </div>
                <div className="summary-item">
                  <label>Còn nợ:</label>
                  <span className="text-danger">{formatCurrency(feeDetail.tuitionFee?.remaining_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tuition;
