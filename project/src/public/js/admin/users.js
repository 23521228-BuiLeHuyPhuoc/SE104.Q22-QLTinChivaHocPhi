var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => applyFilters(), 400);
}

function applyFilters() {
  const search = document.getElementById('search-input').value;
  const role = document.getElementById('filter-role').value;
  let url = '/admin/users?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (role) url += '&role=' + encodeURIComponent(role);
  window.location.href = url;
}

function handleRoleClick(el) {
  var id = parseInt(el.getAttribute('data-id'));
  var username = el.getAttribute('data-username');
  var currentRole = el.getAttribute('data-role');
  changeRole(id, username, currentRole);
}

async function changeRole(id, username, currentRole) {
  var newRole = currentRole === 'admin' ? 'sinh_vien' : 'admin';
  var confirmMsg = 'Bạn có chắc muốn đổi vai trò của "' + username + '" từ "' + currentRole + '" thành "' + newRole + '"?';
  if (!confirm(confirmMsg)) return;

  var btn = document.getElementById('btn-role-' + id);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang đổi...';
  }

  try {
    var res = await apiFetch('/api/roles/accounts/' + id + '/role', {
      method: 'PUT',
      body: { role: newRole }
    });
    if (res.success) {
      showToast(res.message || 'Đã thay đổi vai trò thành công!', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể thay đổi vai trò', 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = currentRole === 'admin' ? '⬇ Hạ → SV' : '⬆ Nâng → Admin';
      }
    }
  } catch(e) {
    showToast('Lỗi kết nối', 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = currentRole === 'admin' ? '⬇ Hạ → SV' : '⬆ Nâng → Admin';
    }
  }
}
