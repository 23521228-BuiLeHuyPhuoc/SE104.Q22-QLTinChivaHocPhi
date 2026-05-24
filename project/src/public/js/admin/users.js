var searchTimer;

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var role = document.getElementById('filter-role').value;
  var group = document.getElementById('filter-group').value;
  var approval = document.getElementById('filter-approval').value;
  var url = '/admin/users?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (role) url += '&Role=' + encodeURIComponent(role);
  if (group) url += '&MaNhom=' + encodeURIComponent(group);
  if (approval) url += '&approval=' + encodeURIComponent(approval);
  window.location.href = url;
}

function handleApprovalClick(el) {
  var id = parseInt(el.getAttribute('data-id'), 10);
  var username = el.getAttribute('data-username');
  var approval = el.getAttribute('data-approval');
  var role = el.getAttribute('data-role') || 'student';
  updateApproval(id, approval, username, role);
}

async function updateApproval(id, approval, username, role) {
  var label = approval === 'approved' ? 'duyệt' : 'từ chối';
  var body = { TrangThaiDuyet: approval };

  if (approval === 'rejected') {
    var reason = prompt('Nhập lý do từ chối tài khoản "' + username + '":', 'Không được duyệt');
    if (reason === null) return;
    body.LyDoTuChoi = reason || 'Không được duyệt';
  } else if (role === 'student') {
    var maSv = prompt('Duyệt tài khoản sinh viên "' + username + '". Nhập MSSV để liên kết hồ sơ sinh viên:', '');
    if (maSv === null) return;
    if (!maSv.trim()) {
      showToast('Cần nhập MSSV khi duyệt tài khoản sinh viên', 'error');
      return;
    }
    body.MaSv = maSv.trim();
  } else if (!confirm('Duyệt tài khoản admin "' + username + '"?')) {
    return;
  }

  try {
    var res = await apiFetch('/api/roles/accounts/' + id + '/approval', {
      method: 'PUT',
      body: body
    });

    if (res.success) {
      showToast(res.message || ('Đã ' + label + ' tài khoản'), 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể cập nhật trạng thái duyệt', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function handleGroupChange(el) {
  var id = parseInt(el.getAttribute('data-id'), 10);
  var select = document.getElementById('group-' + id);
  if (!select) return;
  var username = select.getAttribute('data-username');
  var currentGroup = select.getAttribute('data-current-group');
  var nextGroup = select.value;
  var nextLabel = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : nextGroup;

  if (nextGroup === currentGroup) {
    showToast('Tài khoản đã thuộc nhóm này', 'info');
    return;
  }

  changeGroup(id, username, nextGroup, nextLabel, select);
}

async function changeGroup(id, username, nextGroup, nextLabel, select) {
  if (!confirm('Chuyển tài khoản "' + username + '" sang nhóm "' + nextLabel + '"?')) {
    select.value = select.getAttribute('data-current-group');
    return;
  }

  select.disabled = true;
  try {
    var res = await apiFetch('/api/roles/accounts/' + id + '/role', {
      method: 'PUT',
      body: { MaNhom: nextGroup }
    });

    if (res.success) {
      showToast(res.message || 'Đã thay đổi nhóm người dùng', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể thay đổi nhóm người dùng', 'error');
      select.value = select.getAttribute('data-current-group');
      select.disabled = false;
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
    select.value = select.getAttribute('data-current-group');
    select.disabled = false;
  }
}
