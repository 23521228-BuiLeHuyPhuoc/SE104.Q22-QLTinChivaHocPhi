import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services';
import { FaUser, FaIdCard, FaEnvelope, FaPhone, FaMapMarkerAlt, FaGraduationCap, FaCalendarAlt, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './StudentProfile.css';

const StudentProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // Lấy thông tin sinh viên từ user context hoặc API
      const response = await studentService.getStudentById(user?.studentId || user?.ma_sv);
      if (response.data) {
        setProfile(response.data);
        setEditData({
          email: response.data.email || '',
          so_dien_thoai: response.data.so_dien_thoai || '',
          dia_chi: response.data.dia_chi || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to user context data
      if (user) {
        setProfile({
          ma_sv: user.ma_sv || user.studentId,
          ho_ten: user.ho_ten || user.name,
          email: user.email,
          so_dien_thoai: user.so_dien_thoai || '',
          ngay_sinh: user.ngay_sinh,
          gioi_tinh: user.gioi_tinh,
          ten_nganh: user.ten_nganh || 'Chưa xác định',
          ten_khoa: user.ten_khoa || 'Chưa xác định',
          khoa_hoc: user.khoa_hoc || 'Chưa xác định',
          trang_thai: user.trang_thai || 'Đang học'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({
      email: profile.email || '',
      so_dien_thoai: profile.so_dien_thoai || '',
      dia_chi: profile.dia_chi || ''
    });
  };

  const handleSave = async () => {
    try {
      await studentService.updateStudent(profile.ma_sv, editData);
      setProfile({ ...profile, ...editData });
      setEditing(false);
      toast.success('Cập nhật thông tin thành công!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Không thể cập nhật thông tin!');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Đang học': return 'status-active';
      case 'Đã tốt nghiệp': return 'status-graduated';
      case 'Bảo lưu': return 'status-suspended';
      case 'Nghỉ học': return 'status-dropped';
      default: return 'status-active';
    }
  };

  if (loading) {
    return (
      <div className="student-profile">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-profile">
      <div className="profile-header">
        <h1>Thông tin cá nhân</h1>
        {!editing ? (
          <button className="btn-edit" onClick={handleEdit}>
            <FaEdit /> Chỉnh sửa
          </button>
        ) : (
          <div className="edit-actions">
            <button className="btn-save" onClick={handleSave}>
              <FaSave /> Lưu
            </button>
            <button className="btn-cancel" onClick={handleCancel}>
              <FaTimes /> Hủy
            </button>
          </div>
        )}
      </div>

      <div className="profile-content">
        {/* Avatar & Basic Info */}
        <div className="profile-card avatar-card">
          <div className="avatar-container">
            <div className="avatar">
              <FaUser />
            </div>
            <div className="avatar-info">
              <h2>{profile?.ho_ten || 'Chưa cập nhật'}</h2>
              <p className="student-id">MSSV: {profile?.ma_sv || 'N/A'}</p>
              <span className={`status-badge ${getStatusClass(profile?.trang_thai)}`}>
                {profile?.trang_thai || 'Đang học'}
              </span>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="profile-card">
          <h3 className="card-title">
            <FaIdCard /> Thông tin cơ bản
          </h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Họ và tên</label>
              <span>{profile?.ho_ten || 'Chưa cập nhật'}</span>
            </div>
            <div className="info-item">
              <label>Mã sinh viên</label>
              <span>{profile?.ma_sv || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Ngày sinh</label>
              <span><FaCalendarAlt /> {formatDate(profile?.ngay_sinh)}</span>
            </div>
            <div className="info-item">
              <label>Giới tính</label>
              <span>{profile?.gioi_tinh || 'Chưa cập nhật'}</span>
            </div>
            <div className="info-item">
              <label>CMND/CCCD</label>
              <span>{profile?.so_cmnd || 'Chưa cập nhật'}</span>
            </div>
            <div className="info-item">
              <label>Dân tộc</label>
              <span>{profile?.dan_toc || 'Kinh'}</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="profile-card">
          <h3 className="card-title">
            <FaEnvelope /> Thông tin liên hệ
          </h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Email</label>
              {editing ? (
                <input
                  type="email"
                  name="email"
                  value={editData.email}
                  onChange={handleChange}
                  placeholder="Nhập email"
                />
              ) : (
                <span><FaEnvelope /> {profile?.email || 'Chưa cập nhật'}</span>
              )}
            </div>
            <div className="info-item">
              <label>Số điện thoại</label>
              {editing ? (
                <input
                  type="tel"
                  name="so_dien_thoai"
                  value={editData.so_dien_thoai}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại"
                />
              ) : (
                <span><FaPhone /> {profile?.so_dien_thoai || 'Chưa cập nhật'}</span>
              )}
            </div>
            <div className="info-item full-width">
              <label>Địa chỉ</label>
              {editing ? (
                <input
                  type="text"
                  name="dia_chi"
                  value={editData.dia_chi}
                  onChange={handleChange}
                  placeholder="Nhập địa chỉ"
                />
              ) : (
                <span><FaMapMarkerAlt /> {profile?.dia_chi || profile?.ten_tinh || 'Chưa cập nhật'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="profile-card">
          <h3 className="card-title">
            <FaGraduationCap /> Thông tin học tập
          </h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Ngành học</label>
              <span>{profile?.ten_nganh || 'Chưa xác định'}</span>
            </div>
            <div className="info-item">
              <label>Khoa</label>
              <span>{profile?.ten_khoa || 'Chưa xác định'}</span>
            </div>
            <div className="info-item">
              <label>Khóa học</label>
              <span>{profile?.khoa_hoc || 'Chưa xác định'}</span>
            </div>
            <div className="info-item">
              <label>Hệ đào tạo</label>
              <span>{profile?.he_dao_tao || 'Chính quy'}</span>
            </div>
            <div className="info-item">
              <label>Niên khóa</label>
              <span>{profile?.nien_khoa || 'Chưa xác định'}</span>
            </div>
            <div className="info-item">
              <label>Trạng thái</label>
              <span className={`status-text ${getStatusClass(profile?.trang_thai)}`}>
                {profile?.trang_thai || 'Đang học'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
