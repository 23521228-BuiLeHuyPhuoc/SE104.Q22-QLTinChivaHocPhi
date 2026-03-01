import { useState, useEffect } from 'react';
import { roleService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaUserShield, FaSearch, FaUserGraduate, FaUserCog, FaExchangeAlt } from 'react-icons/fa';
import './UserManagement.css';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [changingRole, setChangingRole] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, [pagination.page, filterRole]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await roleService.getAllAccounts({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        role: filterRole || undefined
      });
      if (response.success) {
        setAccounts(response.data);
        setPagination(prev => ({ ...prev, ...response.pagination }));
      }
    } catch (error) {
      toast.error('Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadAccounts();
  };

  const handleChangeRole = async (account) => {
    const newRole = account.role === 'admin' ? 'sinh_vien' : 'admin';
    const confirmMsg = `Bạn có chắc muốn đổi role của "${account.ten_dang_nhap}" từ "${account.role}" thành "${newRole}"?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      setChangingRole(account.ma_tai_khoan);
      const response = await roleService.updateUserRole(account.ma_tai_khoan, newRole);
      if (response.success) {
        toast.success(response.message);
        loadAccounts();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Không thể thay đổi role';
      toast.error(msg);
    } finally {
      setChangingRole(null);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <span className="role-badge admin"><FaUserShield /> Admin</span>;
    }
    return <span className="role-badge student"><FaUserGraduate /> Sinh viên</span>;
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="header-left">
          <FaUserCog className="header-icon" />
          <div>
            <h1>Quản lý tài khoản</h1>
            <p>Xem danh sách tài khoản và thay đổi vai trò (admin / sinh viên)</p>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên đăng nhập hoặc họ tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-search">Tìm kiếm</button>
        </form>
        <select
          className="role-filter"
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        >
          <option value="">Tất cả vai trò</option>
          <option value="admin">Admin</option>
          <option value="sinh_vien">Sinh viên</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <>
          <div className="accounts-table-wrapper">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên đăng nhập</th>
                  <th>Họ tên</th>
                  <th>Mã SV</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-state">Không có tài khoản nào</td>
                  </tr>
                ) : (
                  accounts.map(acc => (
                    <tr key={acc.ma_tai_khoan}>
                      <td>{acc.ma_tai_khoan}</td>
                      <td className="username-cell">{acc.ten_dang_nhap}</td>
                      <td>{acc.ho_ten || '—'}</td>
                      <td>{acc.ma_sv || '—'}</td>
                      <td>{acc.email || '—'}</td>
                      <td>{getRoleBadge(acc.role)}</td>
                      <td>{acc.ngay_tao ? new Date(acc.ngay_tao).toLocaleDateString('vi-VN') : '—'}</td>
                      <td>
                        {parseInt(acc.ma_tai_khoan) === parseInt(currentUser?.ma_tai_khoan || currentUser?.id) ? (
                          <span className="text-muted">Bạn</span>
                        ) : (
                          <button
                            className={`btn-change-role ${acc.role === 'admin' ? 'demote' : 'promote'}`}
                            onClick={() => handleChangeRole(acc)}
                            disabled={changingRole === acc.ma_tai_khoan}
                            title={acc.role === 'admin' ? 'Hạ xuống Sinh viên' : 'Nâng lên Admin'}
                          >
                            <FaExchangeAlt />
                            {changingRole === acc.ma_tai_khoan
                              ? 'Đang đổi...'
                              : acc.role === 'admin'
                                ? 'Hạ → SV'
                                : 'Nâng → Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                ← Trước
              </button>
              <span>Trang {pagination.page} / {pagination.totalPages} (Tổng: {pagination.total})</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserManagement;
