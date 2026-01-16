import { useState, useEffect } from 'react';
import { paymentService, tuitionService, semesterService } from '../services';
import { toast } from 'react-toastify';
import { FaSearch, FaPlus, FaTimes, FaMoneyBillWave } from 'react-icons/fa';
import './Payments.css';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [tuitionFees, setTuitionFees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    tuition_fee_id: '',
    amount: '',
    payment_method: 'cash',
    transaction_id: '',
    notes: ''
  });

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    loadPayments();
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

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search
      });
      setPayments(response.data);
      setPagination(prev => ({ ...prev, ...response.pagination }));
    } catch (error) {
      toast.error('Không thể tải danh sách thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const loadTuitionFees = async () => {
    try {
      const response = await tuitionService.getAll({
        limit: 100,
        semester_id: selectedSemester,
        status: 'unpaid'
      });
      // Also get partial payments
      const partialResponse = await tuitionService.getAll({
        limit: 100,
        semester_id: selectedSemester,
        status: 'partial'
      });
      setTuitionFees([...response.data, ...partialResponse.data]);
    } catch (error) {
      console.error('Error loading tuition fees:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openModal = async () => {
    await loadTuitionFees();
    setFormData({
      tuition_fee_id: '',
      amount: '',
      payment_method: 'cash',
      transaction_id: '',
      notes: ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-fill remaining amount when selecting tuition fee
    if (name === 'tuition_fee_id') {
      const selectedFee = tuitionFees.find(f => f.id === parseInt(value));
      if (selectedFee) {
        setFormData(prev => ({ ...prev, amount: selectedFee.remaining_amount }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await paymentService.create(formData);
      toast.success('Ghi nhận thanh toán thành công');
      closeModal();
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
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

  const getPaymentMethodLabel = (method) => {
    const methods = {
      cash: 'Tiền mặt',
      bank_transfer: 'Chuyển khoản',
      credit_card: 'Thẻ tín dụng',
      momo: 'MoMo',
      vnpay: 'VNPay'
    };
    return methods[method] || method;
  };

  return (
    <div className="payments-page">
      <div className="page-header">
        <div>
          <h1>Quản lý Thanh toán</h1>
          <p>Ghi nhận và theo dõi các khoản thanh toán học phí</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <FaPlus /> Ghi nhận thanh toán
        </button>
      </div>

      <div className="content-card">
        <div className="filters">
          <form onSubmit={handleSearch} className="search-bar">
            <div className="search-input">
              <FaSearch />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã SV, tên SV, mã giao dịch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">Tìm kiếm</button>
          </form>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ngày thanh toán</th>
                    <th>Mã SV</th>
                    <th>Tên sinh viên</th>
                    <th>Học kỳ</th>
                    <th>Số tiền</th>
                    <th>Phương thức</th>
                    <th>Mã giao dịch</th>
                    <th>Ghi chú</th>
                    <th>Người thu</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="no-data">Không có dữ liệu</td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td><strong>{payment.student_code}</strong></td>
                        <td>{payment.student_name}</td>
                        <td>{payment.semester_name} - {payment.semester_year}</td>
                        <td className="text-right text-success">
                          <strong>{formatCurrency(payment.amount)}</strong>
                        </td>
                        <td>
                          <span className={`payment-method ${payment.payment_method}`}>
                            {getPaymentMethodLabel(payment.payment_method)}
                          </span>
                        </td>
                        <td>{payment.transaction_id || '-'}</td>
                        <td>{payment.notes || '-'}</td>
                        <td>{payment.created_by_name || '-'}</td>
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
              <h2><FaMoneyBillWave /> Ghi nhận thanh toán</h2>
              <button className="btn-close" onClick={closeModal}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Chọn sinh viên cần thanh toán *</label>
                <select 
                  name="tuition_fee_id" 
                  value={formData.tuition_fee_id} 
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Chọn sinh viên --</option>
                  {tuitionFees.map(fee => (
                    <option key={fee.id} value={fee.id}>
                      {fee.student_code} - {fee.student_name} - Nợ: {formatCurrency(fee.remaining_amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Số tiền thanh toán (VNĐ) *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Phương thức thanh toán *</label>
                  <select 
                    name="payment_method" 
                    value={formData.payment_method} 
                    onChange={handleChange}
                    required
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="bank_transfer">Chuyển khoản</option>
                    <option value="credit_card">Thẻ tín dụng</option>
                    <option value="momo">MoMo</option>
                    <option value="vnpay">VNPay</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Mã giao dịch</label>
                  <input
                    type="text"
                    name="transaction_id"
                    value={formData.transaction_id}
                    onChange={handleChange}
                    placeholder="VD: TXN123456"
                  />
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <input
                    type="text"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary">Xác nhận thanh toán</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
