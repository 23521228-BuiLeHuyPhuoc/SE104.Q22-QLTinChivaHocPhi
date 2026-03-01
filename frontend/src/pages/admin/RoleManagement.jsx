import { useState, useEffect } from 'react';
import { roleService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaShieldAlt, FaSave, FaUserShield, FaUserGraduate } from 'react-icons/fa';
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
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('admin');
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (roles.length > 0) {
      const found = roles.find(r => r.role === selectedRole);
      if (found) {
        setRolePermissions(found.permissions.map(p => p.ma_quyen));
      }
    }
  }, [selectedRole, roles]);

  const loadData = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      toast.error('Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (maQuyen) => {
    setRolePermissions(prev => {
      if (prev.includes(maQuyen)) {
        return prev.filter(p => p !== maQuyen);
      }
      return [...prev, maQuyen];
    });
  };

  const handleToggleGroup = (groupPermissions) => {
    const groupCodes = groupPermissions.map(p => p.ma_quyen);
    const allSelected = groupCodes.every(c => rolePermissions.includes(c));
    
    if (allSelected) {
      setRolePermissions(prev => prev.filter(p => !groupCodes.includes(p)));
    } else {
      setRolePermissions(prev => {
        const newPerms = [...prev];
        groupCodes.forEach(c => {
          if (!newPerms.includes(c)) {
            newPerms.push(c);
          }
        });
        return newPerms;
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await roleService.updateRolePermissions(selectedRole, rolePermissions);
      if (response.success) {
        toast.success('Cập nhật phân quyền thành công');
        await loadData();
      } else {
        toast.error(response.message || 'Lỗi cập nhật');
      }
    } catch (error) {
      toast.error('Không thể cập nhật phân quyền');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="role-management loading">Đang tải...</div>;
  }

  const canEdit = hasPermission('ROLE_EDIT');

  return (
    <div className="role-management">
      <div className="page-header">
        <div className="header-left">
          <FaShieldAlt className="header-icon" />
          <div>
            <h1>Phân quyền hệ thống</h1>
            <p>Quản lý quyền truy cập cho từng vai trò trong hệ thống</p>
          </div>
        </div>
        {canEdit && (
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            <FaSave />
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        )}
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
          const allSelected = selectedCount === groupCodes.length;

          return (
            <div key={nhom} className="permission-group">
              <div className="group-header">
                <label className="group-checkbox">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => handleToggleGroup(perms)}
                    disabled={!canEdit}
                  />
                  <span className="group-title">
                    {NHOM_QUYEN_LABELS[nhom] || nhom}
                  </span>
                </label>
                <span className="group-count">{selectedCount}/{groupCodes.length}</span>
              </div>
              <div className="group-permissions">
                {perms.map(perm => (
                  <label key={perm.ma_quyen} className="permission-item">
                    <input
                      type="checkbox"
                      checked={rolePermissions.includes(perm.ma_quyen)}
                      onChange={() => handleTogglePermission(perm.ma_quyen)}
                      disabled={!canEdit}
                    />
                    <div className="permission-info">
                      <span className="permission-name">{perm.ten_quyen}</span>
                      {perm.mo_ta && <span className="permission-desc">{perm.mo_ta}</span>}
                    </div>
                  </label>
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
