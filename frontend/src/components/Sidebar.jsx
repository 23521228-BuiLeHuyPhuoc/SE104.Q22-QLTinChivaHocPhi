import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaHome, 
  FaUsers, 
  FaBook, 
  FaClipboardList, 
  FaMoneyBill, 
  FaCreditCard,
  FaCalendarAlt,
  FaSignOutAlt,
  FaClock,
  FaGraduationCap
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const { user, student, isAdmin, logout } = useAuth();

  const adminMenuItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Tổng quan' },
    { path: '/students', icon: <FaUsers />, label: 'Sinh viên' },
    { path: '/courses', icon: <FaBook />, label: 'Môn học' },
    { path: '/registrations', icon: <FaClipboardList />, label: 'Đăng ký môn' },
    { path: '/tuition', icon: <FaMoneyBill />, label: 'Học phí' },
    { path: '/payments', icon: <FaCreditCard />, label: 'Thanh toán' },
    { path: '/semesters', icon: <FaCalendarAlt />, label: 'Học kỳ' },
  ];

  const studentMenuItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Trang chủ' },
    { path: '/my-schedule', icon: <FaClock />, label: 'Thời khoá biểu' },
    { path: '/my-courses', icon: <FaBook />, label: 'Môn học của tôi' },
    { path: '/course-registration', icon: <FaClipboardList />, label: 'Đăng ký môn' },
    { path: '/my-tuition', icon: <FaMoneyBill />, label: 'Học phí' },
    { path: '/my-payments', icon: <FaCreditCard />, label: 'Lịch sử thanh toán' },
  ];

  const menuItems = isAdmin ? adminMenuItems : studentMenuItems;

  return (
    <div className={`sidebar ${isAdmin ? 'admin-sidebar' : 'student-sidebar'}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <FaGraduationCap />
        </div>
        <h2>QLSV</h2>
        <p className="role-badge">{isAdmin ? 'Admin' : 'Sinh viên'}</p>
      </div>
      
      {!isAdmin && student && (
        <div className="sidebar-profile">
          <div className="profile-avatar">
            {student.anh_dai_dien ? (
              <img src={student.anh_dai_dien} alt="Avatar" />
            ) : (
              <span>{student.ho_ten?.charAt(0) || 'S'}</span>
            )}
          </div>
          <div className="profile-info">
            <span className="profile-name">{student.ho_ten}</span>
            <span className="profile-id">MSSV: {student.ma_sv}</span>
          </div>
        </div>
      )}
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">Menu chính</span>
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
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <span className="username">{user?.ten_dang_nhap}</span>
        </div>
        <button className="logout-btn" onClick={logout}>
          <FaSignOutAlt /> Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
