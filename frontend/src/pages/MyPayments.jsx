import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services';
import { toast } from 'react-toastify';
import { FaCreditCard, FaReceipt } from 'react-icons/fa';
import './MyPayments.css';

const MyPayments = () => {
  const { student } = useAuth();
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (student) {
      loadPayments();
    }
  }, [student]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentService.getStudentPayments(student.id);
      setPayments(response.data.payments);
      setTotalPaid(response.data.totalPaid);
    } catch (error) {
      toast.error('Không thể tải lịch sử thanh toán');
    } finally {
      setLoading(false);
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

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="my-payments-page">
      <div className="page-header">
        <div>
          <h1>Lịch sử thanh toán</h1>
          <p>Các khoản thanh toán học phí của bạn</p>
        </div>
      </div>

      <div className="total-card">
        <FaCreditCard />
        <div>
          <span>Tổng đã thanh toán</span>
          <h2>{formatCurrency(totalPaid)}</h2>
        </div>
      </div>

      <div className="content-card">
        {payments.length === 0 ? (
          <div className="no-data-large">
            <FaReceipt />
            <h3>Chưa có thanh toán nào</h3>
            <p>Bạn chưa có khoản thanh toán học phí nào</p>
          </div>
        ) : (
          <div className="payments-list">
            {payments.map((payment, index) => (
              <div key={payment.id} className="payment-item">
                <div className="payment-index">{index + 1}</div>
                <div className="payment-info">
                  <div className="payment-main">
                    <span className="payment-date">{formatDate(payment.payment_date)}</span>
                    <span className="payment-semester">
                      {payment.semester_name} - {payment.semester_year}
                    </span>
                  </div>
                  <div className="payment-details">
                    <span className={`payment-method ${payment.payment_method}`}>
                      {getPaymentMethodLabel(payment.payment_method)}
                    </span>
                    {payment.transaction_id && (
                      <span className="transaction-id">Mã GD: {payment.transaction_id}</span>
                    )}
                    {payment.notes && (
                      <span className="payment-notes">{payment.notes}</span>
                    )}
                  </div>
                </div>
                <div className="payment-amount">
                  {formatCurrency(payment.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPayments;
