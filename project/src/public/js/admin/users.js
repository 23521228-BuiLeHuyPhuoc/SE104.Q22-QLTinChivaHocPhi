var searchTimer;

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var role = document.getElementById('filter-role').value;
  var url = '/admin/users?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (role) url += '&Role=' + encodeURIComponent(role);
  window.location.href = url;
}

function handleRoleClick(el) {
  var id = parseInt(el.getAttribute('data-id'), 10);
  var username = el.getAttribute('data-username');
  var currentRole = el.getAttribute('data-role');
  changeRole(id, username, currentRole);
}

async function changeRole(id, username, currentRole) {
  var newRole = currentRole === 'admin' ? 'student' : 'admin';
  var label = newRole === 'admin' ? 'quản trị viên' : 'sinh viên';
  if (!confirm('Đổi vai trò của "' + username + '" thành ' + label + '?')) return;

  var btn = document.getElementById('btn-role-' + id);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang đổi...';
  }

  try {
    var res = await apiFetch('/api/roles/accounts/' + id + '/role', {
      method: 'PUT',
      body: { Role: newRole }
    });

    if (res.success) {
      showToast(res.message || 'Đã thay đổi vai trò', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể thay đổi vai trò', 'error');
      resetRoleButton(btn, currentRole);
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
    resetRoleButton(btn, currentRole);
  }
}

function resetRoleButton(btn, role) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = role === 'admin' ? 'Chuyển thành sinh viên' : 'Chuyển thành admin';
}
