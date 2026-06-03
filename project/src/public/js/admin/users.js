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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function togglePasswordVisibility(button) {
  var mask = button && button.parentElement ? button.parentElement.querySelector('.password-mask') : null;
  if (!mask) return;
  var shown = mask.getAttribute('data-visible') === 'true';
  mask.textContent = shown ? '********' : decodeURIComponent(mask.getAttribute('data-password') || '');
  mask.setAttribute('data-visible', shown ? 'false' : 'true');
  var icon = button.querySelector('.material-symbols-rounded');
  if (icon) icon.textContent = shown ? 'visibility' : 'visibility_off';
}

function emailStatusLabel(status) {
  if (status === 'sent') return 'Da gui Gmail';
  if (status === 'missing_email') return 'Thieu email';
  if (status === 'not_configured') return 'Chua cau hinh SMTP';
  if (status === 'failed') return 'Gui loi';
  return 'Cho gui';
}

function renderCredentialRows(rows) {
  if (!rows || !rows.length) return '<div class=empty-state>Chua co tai khoan sinh vien nao duoc tao.</div>';
  var html = '<div class=credential-table-wrap><table class=data-table><thead><tr><th>MSSV</th><th>Sinh vien</th><th>Tai khoan</th><th>Mat khau</th><th>Email</th><th>Gmail</th></tr></thead><tbody>';
  rows.forEach(function(row) {
    var password = encodeURIComponent(row.MatKhauTam || row.temporaryPassword || '').replace(/[!'()*]/g, function(ch) {
      return '%' + ch.charCodeAt(0).toString(16).toUpperCase();
    });
    html += '<tr><td class=mono>' + escapeHtml(row.MaSv || '') + '</td>' +
      '<td>' + escapeHtml(row.HoTen || '-') + '</td>' +
      '<td><strong>' + escapeHtml(row.TenDangNhap || '') + '</strong></td>' +
      '<td><span class=password-mask data-password=' + password + '>********</span> ' +
      '<button class=password-eye type=button onclick=togglePasswordVisibility(this)><span class=material-symbols-rounded>visibility</span></button></td>' +
      '<td>' + escapeHtml(row.Email || '-') + '</td>' +
      '<td><span class=badge>' + escapeHtml(emailStatusLabel(row.emailStatus || row.TrangThaiGuiEmail)) + '</span>' +
      (row.emailError || row.LoiGuiEmail ? '<small>' + escapeHtml(row.emailError || row.LoiGuiEmail) + '</small>' : '') + '</td></tr>';
  });
  return html + '</tbody></table></div>';
}

function showCredentialRows(rows, targetId) {
  var target = document.getElementById(targetId || 'batch-result');
  if (!target) return;
  target.classList.remove('hidden', 'empty-state');
  target.innerHTML = renderCredentialRows(rows || []);
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
  var passwordConfirm = document.getElementById('acc-password-confirm').value;
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
  if (password !== passwordConfirm) {
    showToast('Mat khau xac nhan khong khop', 'error');
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
      passwordConfirm: passwordConfirm,
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
  var searchField = document.getElementById('search-field') ? document.getElementById('search-field').value : 'all';
  var role = document.getElementById('filter-role').value;
  var group = document.getElementById('filter-group').value;
  var url = '/admin/users?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (searchField && searchField !== 'all') url += '&searchField=' + encodeURIComponent(searchField);
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

async function batchCreateStudentAccounts() {
  var button = document.getElementById('btn-batch-create');
  var result = document.getElementById('batch-result');
  var body = {
    MaKhoa: document.getElementById('batch-faculty').value,
    MaNganh: document.getElementById('batch-major').value
  };

  if (!body.MaKhoa && !body.MaNganh) {
    showToast('Vui lòng chọn khoa hoặc ngành', 'error');
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
      showCredentialRows(data.created || [], 'batch-result');
      showToast(res.message || message, 'success');
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

function closeCredentialListModal() {
  var modal = document.getElementById('credential-list-modal');
  if (modal) modal.classList.remove('active');
}

async function openCredentialListModal() {
  var modal = document.getElementById('credential-list-modal');
  var content = document.getElementById('credential-list-content');
  if (!modal || !content) return;
  modal.classList.add('active');
  content.className = 'empty-state';
  content.textContent = 'Dang tai danh sach...';
  try {
    var res = await apiFetch('/api/roles/accounts/student-credentials?limit=100');
    if (res.success) {
      showCredentialRows(res.data || [], 'credential-list-content');
    } else {
      content.textContent = res.message || 'Khong the tai danh sach tai khoan';
    }
  } catch (e) {
    content.textContent = 'Loi ket noi';
  }
}
