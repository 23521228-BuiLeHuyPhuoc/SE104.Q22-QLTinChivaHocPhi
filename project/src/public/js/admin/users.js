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

function openBatchStudentModal() {
  var form = document.getElementById('batch-student-form');
  if (form) form.reset();
  var result = document.getElementById('batch-result');
  if (result) {
    result.classList.add('hidden');
    result.textContent = '';
  }
  filterBatchMajors();
  document.getElementById('batch-student-modal').classList.add('active');
}

function closeBatchStudentModal() {
  document.getElementById('batch-student-modal').classList.remove('active');
}

function filterBatchMajors() {
  var faculty = document.getElementById('batch-faculty');
  var major = document.getElementById('batch-major');
  if (!faculty || !major) return;
  var selectedFaculty = faculty.value;
  Array.prototype.forEach.call(major.options, function(option) {
    if (!option.value) {
      option.hidden = false;
      return;
    }
    option.hidden = !!selectedFaculty && option.getAttribute('data-faculty') !== selectedFaculty;
  });
  if (major.selectedOptions[0] && major.selectedOptions[0].hidden) major.value = '';
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

function resetAccountPassword(el) {
  var id = parseInt(el.getAttribute('data-id'), 10);
  var username = el.getAttribute('data-username') || '';
  resetPassword(id, username);
}

async function resetPassword(id, username) {
  if (!id) return;
  if (!confirm('Reset mật khẩu tài khoản "' + username + '" về mặc định?')) return;

  try {
    var res = await apiFetch('/api/roles/accounts/' + id + '/reset-password', {
      method: 'PUT',
      body: {}
    });
    if (res.success) {
      var password = res.data && res.data.defaultPassword ? ' Mật khẩu: ' + res.data.defaultPassword : '';
      showToast((res.message || 'Đã reset mật khẩu') + password, 'success');
    } else {
      showToast(res.message || 'Không thể reset mật khẩu', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function batchCreateStudentAccounts() {
  var button = document.getElementById('btn-batch-create');
  var result = document.getElementById('batch-result');
  var body = {
    MaKhoa: document.getElementById('batch-faculty').value,
    MaNganh: document.getElementById('batch-major').value,
    MaSvText: document.getElementById('batch-mssv-list').value.trim(),
    password: document.getElementById('batch-password').value.trim() || '123456'
  };

  if (!body.MaKhoa && !body.MaNganh && !body.MaSvText) {
    showToast('Vui lòng chọn khoa/ngành hoặc nhập danh sách MSSV', 'error');
    return;
  }
  if (body.password.length < 6) {
    showToast('Mật khẩu mặc định phải có ít nhất 6 ký tự', 'error');
    return;
  }

  if (button) button.disabled = true;
  if (result) {
    result.classList.remove('hidden');
    result.textContent = 'Đang tạo tài khoản...';
  }

  try {
    var res = await apiFetch('/api/roles/accounts/batch-create-student-accounts', {
      method: 'POST',
      body: body
    });
    if (res.success) {
      var data = res.data || {};
      var message = 'Đã tạo ' + (data.createdCount || 0) + ' tài khoản';
      if (data.skippedCount) message += ', bỏ qua ' + data.skippedCount + ' sinh viên';
      if (result) result.textContent = message + '. Mật khẩu mặc định: ' + (data.defaultPassword || body.password);
      showToast(res.message || message, 'success');
      setTimeout(function() { location.reload(); }, 900);
    } else {
      if (result) result.textContent = res.message || 'Không thể tạo tài khoản hàng loạt';
      showToast(res.message || 'Không thể tạo tài khoản hàng loạt', 'error');
    }
  } catch (e) {
    if (result) result.textContent = 'Lỗi kết nối';
    showToast('Lỗi kết nối', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}
