var searchTimer;

function getSelectedAccountRole() {
  var select = document.getElementById('acc-group');
  if (!select || !select.options.length) return 'student';
  var option = select.options[select.selectedIndex];
  return option ? (option.getAttribute('data-role') || 'admin') : 'admin';
}

function syncAccountFormMode() {
  var role = getSelectedAccountRole();
  var isStudent = role === 'student';
  var masvGroup = document.getElementById('acc-masv-group');
  var chucVuGroup = document.getElementById('acc-chucvu-group');
  var phongBanGroup = document.getElementById('acc-phongban-group');
  var masv = document.getElementById('acc-masv');
  var username = document.getElementById('acc-username');
  var hoTen = document.getElementById('acc-hoten');

  if (masvGroup) masvGroup.classList.toggle('hidden', !isStudent);
  if (chucVuGroup) chucVuGroup.classList.toggle('hidden', isStudent);
  if (phongBanGroup) phongBanGroup.classList.toggle('hidden', isStudent);
  if (masv) masv.required = isStudent;
  if (username) {
    username.required = !isStudent;
    username.placeholder = isStudent ? 'Mặc định dùng MSSV cho sinh viên' : 'Nhập tên đăng nhập';
  }
  if (hoTen) hoTen.required = !isStudent;
}

function openAccountModal() {
  var form = document.getElementById('account-form');
  if (form) form.reset();
  syncAccountFormMode();
  document.getElementById('account-modal').classList.add('active');
}

function closeAccountModal() {
  document.getElementById('account-modal').classList.remove('active');
}

async function saveAccount() {
  var role = getSelectedAccountRole();
  var isStudent = role === 'student';
  var group = document.getElementById('acc-group').value;
  var password = document.getElementById('acc-password').value;
  var username = document.getElementById('acc-username').value.trim();
  var maSv = document.getElementById('acc-masv').value.trim();
  var hoTen = document.getElementById('acc-hoten').value.trim();

  if (!group) {
    showToast('Vui lòng chọn nhóm người dùng', 'error');
    return;
  }
  if (!password || password.length < 6) {
    showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
    return;
  }
  if (isStudent && !maSv) {
    showToast('Tài khoản sinh viên bắt buộc nhập MSSV đã có', 'error');
    return;
  }
  if (!isStudent && (!username || !hoTen)) {
    showToast('Tài khoản admin cần tên đăng nhập và họ tên', 'error');
    return;
  }

  var button = document.getElementById('btn-save-account');
  if (button) button.disabled = true;

  try {
    var body = {
      MaNhom: group,
      password: password,
      username: username,
      MaSv: maSv,
      HoTen: hoTen,
      Email: document.getElementById('acc-email').value.trim(),
      Sdt: document.getElementById('acc-sdt').value.trim(),
      ChucVu: document.getElementById('acc-chucvu').value.trim(),
      PhongBan: document.getElementById('acc-phongban').value.trim()
    };

    var res = await apiFetch('/api/roles/accounts', {
      method: 'POST',
      body: body
    });

    if (res.success) {
      showToast(res.message || 'Tạo tài khoản thành công', 'success');
      closeAccountModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể tạo tài khoản', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var role = document.getElementById('filter-role').value;
  var group = document.getElementById('filter-group').value;
  var url = '/admin/users?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (role) url += '&Role=' + encodeURIComponent(role);
  if (group) url += '&MaNhom=' + encodeURIComponent(group);
  window.location.href = url;
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

function deleteAccount(el) {
  var id = parseInt(el.getAttribute('data-id'), 10);
  var username = el.getAttribute('data-username') || '';
  removeAccount(id, username);
}

async function removeAccount(id, username) {
  if (!id) return;
  if (!confirm('Xóa tài khoản "' + username + '"?')) return;

  try {
    var res = await apiFetch('/api/roles/accounts/' + id, {
      method: 'DELETE'
    });

    if (res.success) {
      showToast(res.message || 'Đã xóa tài khoản', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa tài khoản', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}
