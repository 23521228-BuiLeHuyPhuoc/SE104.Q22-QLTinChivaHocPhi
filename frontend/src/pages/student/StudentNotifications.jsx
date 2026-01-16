import { useState, useEffect } from 'react';
import { FaBell, FaBullhorn, FaExclamationCircle, FaInfoCircle, FaCheckCircle, FaCalendarAlt, FaEye } from 'react-icons/fa';
import { notificationService } from '../../services';
import './StudentNotifications.css';

const StudentNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, announcement, warning, info
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications();
      if (response.data) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback data for demo
      setNotifications([
        {
          ma_thong_bao: 1,
          tieu_de: 'Thông báo đăng ký môn học kỳ 2',
          noi_dung: 'Sinh viên đăng ký môn học từ ngày 01/01/2024 đến 15/01/2024. Vui lòng đăng ký đúng thời hạn.',
          loai: 'announcement',
          ngay_tao: '2024-01-01',
          da_doc: false
        },
        {
          ma_thong_bao: 2,
          tieu_de: 'Nhắc nhở đóng học phí',
          noi_dung: 'Sinh viên chưa đóng học phí vui lòng hoàn thành trước ngày 20/01/2024 để tránh bị hủy đăng ký môn.',
          loai: 'warning',
          ngay_tao: '2024-01-10',
          da_doc: false
        },
        {
          ma_thong_bao: 3,
          tieu_de: 'Lịch thi cuối kỳ',
          noi_dung: 'Lịch thi cuối kỳ đã được công bố. Sinh viên kiểm tra lịch thi tại phòng đào tạo hoặc trên hệ thống.',
          loai: 'info',
          ngay_tao: '2024-01-05',
          da_doc: true
        },
        {
          ma_thong_bao: 4,
          tieu_de: 'Cập nhật quy chế học tập',
          noi_dung: 'Nhà trường ban hành quy chế học tập mới áp dụng từ học kỳ 2 năm học 2023-2024.',
          loai: 'announcement',
          ngay_tao: '2024-01-08',
          da_doc: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.ma_thong_bao === id ? { ...n, da_doc: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Update locally anyway
      setNotifications(prev => 
        prev.map(n => n.ma_thong_bao === id ? { ...n, da_doc: true } : n)
      );
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'announcement': return <FaBullhorn />;
      case 'warning': return <FaExclamationCircle />;
      case 'success': return <FaCheckCircle />;
      default: return <FaInfoCircle />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'announcement': return 'Thông báo';
      case 'warning': return 'Cảnh báo';
      case 'success': return 'Thành công';
      default: return 'Thông tin';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.da_doc;
    return n.loai === filter;
  });

  const unreadCount = notifications.filter(n => !n.da_doc).length;

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    if (!notification.da_doc) {
      markAsRead(notification.ma_thong_bao);
    }
  };

  if (loading) {
    return (
      <div className="student-notifications">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải thông báo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-notifications">
      <div className="notifications-header">
        <div className="header-title">
          <FaBell className="header-icon" />
          <h1>Thông báo</h1>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} mới</span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tất cả ({notifications.length})
        </button>
        <button 
          className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Chưa đọc ({unreadCount})
        </button>
        <button 
          className={`filter-tab ${filter === 'announcement' ? 'active' : ''}`}
          onClick={() => setFilter('announcement')}
        >
          Thông báo
        </button>
        <button 
          className={`filter-tab ${filter === 'warning' ? 'active' : ''}`}
          onClick={() => setFilter('warning')}
        >
          Cảnh báo
        </button>
        <button 
          className={`filter-tab ${filter === 'info' ? 'active' : ''}`}
          onClick={() => setFilter('info')}
        >
          Thông tin
        </button>
      </div>

      <div className="notifications-container">
        {/* Notifications List */}
        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <FaBell />
              <p>Không có thông báo nào</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.ma_thong_bao}
                className={`notification-item ${notification.loai} ${!notification.da_doc ? 'unread' : ''} ${selectedNotification?.ma_thong_bao === notification.ma_thong_bao ? 'selected' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={`notification-icon ${notification.loai}`}>
                  {getIcon(notification.loai)}
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h3>{notification.tieu_de}</h3>
                    {!notification.da_doc && <span className="new-dot"></span>}
                  </div>
                  <p className="notification-preview">
                    {notification.noi_dung.substring(0, 100)}
                    {notification.noi_dung.length > 100 ? '...' : ''}
                  </p>
                  <div className="notification-meta">
                    <span className={`type-badge ${notification.loai}`}>
                      {getTypeLabel(notification.loai)}
                    </span>
                    <span className="notification-date">
                      <FaCalendarAlt /> {formatDate(notification.ngay_tao)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Notification Detail */}
        {selectedNotification && (
          <div className="notification-detail">
            <div className={`detail-header ${selectedNotification.loai}`}>
              <div className={`detail-icon ${selectedNotification.loai}`}>
                {getIcon(selectedNotification.loai)}
              </div>
              <div>
                <span className={`type-badge ${selectedNotification.loai}`}>
                  {getTypeLabel(selectedNotification.loai)}
                </span>
                <h2>{selectedNotification.tieu_de}</h2>
              </div>
            </div>
            <div className="detail-meta">
              <span><FaCalendarAlt /> {new Date(selectedNotification.ngay_tao).toLocaleDateString('vi-VN')}</span>
              <span><FaEye /> Đã xem</span>
            </div>
            <div className="detail-content">
              <p>{selectedNotification.noi_dung}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotifications;
