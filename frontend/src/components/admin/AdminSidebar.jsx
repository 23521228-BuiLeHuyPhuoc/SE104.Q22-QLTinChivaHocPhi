import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FaHome, 
  FaUsers, 
  FaBook, 
  FaChalkboardTeacher,
  FaClipboardList, 
  FaMoneyBill, 
  FaCreditCard,
  FaCalendarAlt,
  FaSignOutAlt,
  FaGraduationCap,
  FaCog,
  FaChartBar
} from 'react-icons/fa';
import './AdminSidebar.css';

const AdminSidebar = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/admin/dashboard', icon: <FaHome />, label: 'Tổng quan' },
    { path: '/admin/students', icon: <FaUsers />, label: 'Quản lý Sinh viên' },
    { path: '/admin/courses', icon: <FaBook />, label: 'Quản lý Môn học' },
    { path: '/admin/classes', icon: <FaChalkboardTeacher />, label: 'Quản lý Lớp học' },
    { path: '/admin/semesters', icon: <FaCalendarAlt />, label: 'Quản lý Học kỳ' },
    { path: '/admin/registrations', icon: <FaClipboardList />, label: 'DS Đăng ký môn' },
    { path: '/admin/tuition', icon: <FaMoneyBill />, label: 'Quản lý Học phí' },
    { path: '/admin/payments', icon: <FaCreditCard />, label: 'Thu học phí' },
    { path: '/admin/reports', icon: <FaChartBar />, label: 'Báo cáo thống kê' },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FaGraduationCap />
        </div>
        <div className="sidebar-brand">
          <h2>QLSV</h2>
          <span className="role-badge">Admin</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">Quản lý</span>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
        
        <div className="nav-section">
          <span className="nav-section-title">Hệ thống</span>
          <NavLink to="/admin/settings" className="nav-item">
            <span className="nav-icon"><FaCog /></span>
            <span className="nav-label">Cài đặt</span>
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="admin-info">
          <div className="admin-avatar">
            <FaUsers />
          </div>
          <div className="admin-details">
            <span className="admin-name">{user?.ho_ten || 'Admin'}</span>
            <span className="admin-role">Quản trị viên</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <FaSignOutAlt />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
