import { FaShieldAlt, FaUserShield, FaUserGraduate, FaCheck, FaTimes } from 'react-icons/fa';
import './RoleManagement.css';

const RoleManagement = () => {
  return (
    <div className="role-management">
      <div className="page-header">
        <div className="header-left">
          <FaShieldAlt className="header-icon" />
          <div>
            <h1>Phân quyền hệ thống</h1>
            <p>Hệ thống phân quyền theo 2 vai trò: Quản trị viên (Admin) và Sinh viên</p>
          </div>
        </div>
      </div>

      <div className="roles-container">
        <div className="role-card admin-card">
          <div className="role-card-header">
            <FaUserShield className="role-icon" />
            <h2>Quản trị viên (Admin)</h2>
          </div>
          <p className="role-description">
            Toàn quyền truy cập và chỉnh sửa tất cả chức năng trong hệ thống quản lý.
          </p>
          <ul className="role-features">
            <li><FaCheck className="check-icon" /> Quản lý sinh viên (thêm, sửa, xóa)</li>
            <li><FaCheck className="check-icon" /> Quản lý môn học, lớp học</li>
            <li><FaCheck className="check-icon" /> Quản lý học kỳ, năm học</li>
            <li><FaCheck className="check-icon" /> Quản lý đăng ký môn học</li>
            <li><FaCheck className="check-icon" /> Quản lý học phí, thu học phí</li>
            <li><FaCheck className="check-icon" /> Xem báo cáo thống kê</li>
            <li><FaCheck className="check-icon" /> Quản lý thông báo</li>
            <li><FaCheck className="check-icon" /> Truy cập trang quản trị (/admin)</li>
          </ul>
        </div>

        <div className="role-card student-card">
          <div className="role-card-header">
            <FaUserGraduate className="role-icon" />
            <h2>Sinh viên</h2>
          </div>
          <p className="role-description">
            Truy cập các chức năng dành cho sinh viên: xem thông tin, đăng ký môn, xem học phí.
          </p>
          <ul className="role-features">
            <li><FaCheck className="check-icon" /> Xem thông tin cá nhân</li>
            <li><FaCheck className="check-icon" /> Đăng ký môn học</li>
            <li><FaCheck className="check-icon" /> Xem lịch học</li>
            <li><FaCheck className="check-icon" /> Xem học phí, thanh toán</li>
            <li><FaCheck className="check-icon" /> Xem thông báo</li>
            <li className="disabled"><FaTimes className="times-icon" /> Không truy cập trang quản trị</li>
            <li className="disabled"><FaTimes className="times-icon" /> Không chỉnh sửa dữ liệu hệ thống</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
