import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaBell, FaUser, FaChevronDown, FaCog, FaSignOutAlt, FaCalendarAlt } from 'react-icons/fa';
import './Header.css';

const Header = () => {
  const { user, student, isAdmin, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // Sample notifications
  useEffect(() => {
    setNotifications([
      { id: 1, title: 'Đăng ký môn học', message: 'Đợt đăng ký môn học HK2 2025-2026 đã mở', time: '2 giờ trước', unread: true },
      { id: 2, title: 'Học phí', message: 'Hạn nộp học phí HK2 đến ngày 15/02/2026', time: '1 ngày trước', unread: true },
      { id: 3, title: 'Thông báo', message: 'Lịch thi cuối kỳ đã được cập nhật', time: '3 ngày trước', unread: false },
    ]);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  const getCurrentDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('vi-VN', options);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <div className="header-greeting">
          <h2>{getGreeting()}, {isAdmin ? user?.ho_ten || 'Admin' : student?.ho_ten || 'Sinh viên'}!</h2>
          <p className="header-date">
            <FaCalendarAlt /> {getCurrentDate()}
          </p>
        </div>
      </div>

      <div className="header-right">
        {/* Notifications */}
        <div className="header-notifications" ref={notifRef}>
          <button 
            className={`notification-btn ${unreadCount > 0 ? 'has-notifications' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <FaBell />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          
          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h4>Thông báo</h4>
                {unreadCount > 0 && <span className="mark-all-read">Đánh dấu đã đọc</span>}
              </div>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications">Không có thông báo mới</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className={`notification-item ${notif.unread ? 'unread' : ''}`}>
                      <div className="notification-content">
                        <h5>{notif.title}</h5>
                        <p>{notif.message}</p>
                        <span className="notification-time">{notif.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="notifications-footer">
                <a href="#">Xem tất cả thông báo</a>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="header-user" ref={userMenuRef}>
          <button className="user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar">
              {user?.anh_dai_dien ? (
                <img src={user.anh_dai_dien} alt="Avatar" />
              ) : (
                <FaUser />
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{isAdmin ? user?.ho_ten || 'Admin' : student?.ho_ten || 'Sinh viên'}</span>
              <span className="user-role">{isAdmin ? 'Quản trị viên' : `MSSV: ${student?.ma_sv || ''}`}</span>
            </div>
            <FaChevronDown className={`dropdown-arrow ${showUserMenu ? 'open' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-avatar">
                  {user?.anh_dai_dien ? (
                    <img src={user.anh_dai_dien} alt="Avatar" />
                  ) : (
                    <FaUser />
                  )}
                </div>
                <div className="dropdown-user-info">
                  <span className="dropdown-name">{isAdmin ? user?.ho_ten || 'Admin' : student?.ho_ten || 'Sinh viên'}</span>
                  <span className="dropdown-email">{user?.email || ''}</span>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-menu">
                <button className="dropdown-item">
                  <FaUser /> Thông tin cá nhân
                </button>
                <button className="dropdown-item">
                  <FaCog /> Cài đặt
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout" onClick={logout}>
                  <FaSignOutAlt /> Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
