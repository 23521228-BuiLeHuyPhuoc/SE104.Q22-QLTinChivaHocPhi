import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FaHome, 
  FaBook, 
  FaClipboardList, 
  FaMoneyBill, 
  FaCreditCard,
  FaSignOutAlt,
  FaClock,
  FaGraduationCap,
  FaUser,
  FaBell
} from 'react-icons/fa';
import './StudentSidebar.css';

const StudentSidebar = () => {
  const { user, student, logout } = useAuth();

  const menuItems = [
    { path: '/student/dashboard', icon: <FaHome />, label: 'Trang chủ' },
    { path: '/student/schedule', icon: <FaClock />, label: 'Thời khoá biểu' },
    { path: '/student/courses', icon: <FaBook />, label: 'Môn học của tôi' },
    { path: '/student/registration', icon: <FaClipboardList />, label: 'Đăng ký môn học' },
    { path: '/student/tuition', icon: <FaMoneyBill />, label: 'Học phí' },
    { path: '/student/payments', icon: <FaCreditCard />, label: 'Lịch sử thanh toán' },
  ];

  return (
    <aside className="student-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FaGraduationCap />
        </div>
        <div className="sidebar-brand">
          <h2>QLSV</h2>
          <span className="role-badge">Sinh viên</span>
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="student-profile">
        <div className="profile-avatar">
          {student?.anh_dai_dien ? (
            <img src={student.anh_dai_dien} alt="Avatar" />
          ) : (
            <span>{student?.ho_ten?.charAt(0) || 'S'}</span>
          )}
        </div>
        <div className="profile-info">
          <span className="profile-name">{student?.ho_ten || 'Sinh viên'}</span>
          <span className="profile-id">MSSV: {student?.ma_sv || 'N/A'}</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">Menu</span>
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
          <span className="nav-section-title">Tài khoản</span>
          <NavLink to="/student/profile" className="nav-item">
            <span className="nav-icon"><FaUser /></span>
            <span className="nav-label">Thông tin cá nhân</span>
          </NavLink>
          <NavLink to="/student/notifications" className="nav-item">
            <span className="nav-icon"><FaBell /></span>
            <span className="nav-label">Thông báo</span>
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          <FaSignOutAlt />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default StudentSidebar;
