import { useState, useEffect } from 'react';
import { roleService } from '../../services';
import { toast } from 'react-toastify';
import { FaShieldAlt, FaUserShield, FaUserGraduate } from 'react-icons/fa';
import './RoleManagement.css';

const NHOM_QUYEN_LABELS = {
  SINH_VIEN: 'Quản lý Sinh viên',
  MON_HOC: 'Quản lý Môn học',
  LOP_HOC: 'Quản lý Lớp học',
  DANG_KY: 'Đăng ký Môn học',
  HOC_PHI: 'Học phí',
  THU_HP: 'Thu học phí',
  HOC_KY: 'Quản lý Học kỳ',
  BAO_CAO: 'Báo cáo thống kê',
  THONG_BAO: 'Thông báo',
  PHAN_QUYEN: 'Phân quyền'
};

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('admin');
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (roles.length > 0) {
      const found = roles.find(r => r.role === selectedRole);
      if (found) {
        setRolePermissions(found.permissions.map(p => p.ma_quyen));
      } else {
        setRolePermissions([]);
      }
    }
  }, [selectedRole, roles]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(false);
      const [rolesRes, permsRes] = await Promise.all([
        roleService.getAll(),
        roleService.getAllPermissions()
      ]);
      if (rolesRes.success) {
        setRoles(rolesRes.data);
      }
      if (permsRes.success) {
        setAllPermissions(permsRes.grouped);
      }
    } catch (err) {
      setError(true);
      toast.error('Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="role-management loading">Đang tải...</div>;
  }

  if (error) {
    return <div className="role-management loading">Không thể tải dữ liệu phân quyền. Vui lòng thử lại sau.</div>;
  }

  return (
    <div className="role-management">
      <div className="page-header">
        <div className="header-left">
          <FaShieldAlt className="header-icon" />
          <div>
            <h1>Phân quyền hệ thống</h1>
            <p>Xem quyền truy cập của từng vai trò: Quản trị viên và Sinh viên</p>
          </div>
        </div>
      </div>

      <div className="role-tabs">
        {roles.map(r => (
          <button
            key={r.role}
            className={`role-tab ${selectedRole === r.role ? 'active' : ''}`}
            onClick={() => setSelectedRole(r.role)}
          >
            {r.role === 'admin' ? <FaUserShield /> : <FaUserGraduate />}
            {r.ten_vai_tro}
            <span className="perm-count">
              {r.permissions.length} quyền
            </span>
          </button>
        ))}
      </div>

      <div className="permissions-grid">
        {Object.entries(allPermissions).map(([nhom, perms]) => {
          const groupCodes = perms.map(p => p.ma_quyen);
          const selectedCount = groupCodes.filter(c => rolePermissions.includes(c)).length;

          return (
            <div key={nhom} className="permission-group">
              <div className="group-header">
                <span className="group-title">
                  {NHOM_QUYEN_LABELS[nhom] || nhom}
                </span>
                <span className="group-count">{selectedCount}/{groupCodes.length}</span>
              </div>
              <div className="group-permissions">
                {perms.map(perm => (
                  <div key={perm.ma_quyen} className="permission-item">
                    <input
                      type="checkbox"
                      checked={rolePermissions.includes(perm.ma_quyen)}
                      readOnly
                    />
                    <div className="permission-info">
                      <span className="permission-name">{perm.ten_quyen}</span>
                      {perm.mo_ta && <span className="permission-desc">{perm.mo_ta}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoleManagement;
