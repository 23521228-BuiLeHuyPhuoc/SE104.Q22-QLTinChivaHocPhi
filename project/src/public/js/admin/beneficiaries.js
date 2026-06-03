var editMode = false;
var editId = null;
var currentBeneficiaryId = null;
var selectedBeneficiaryImportFile = null;
var beneficiarySearchTimer = null;

function beneficiaryEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setBeneficiaryCodeReadonly(readonly) {
  var input = document.getElementById('ben-ma');
  if (!input) return;
  input.disabled = false;
  input.readOnly = !!readonly;
  input.toggleAttribute('data-ui-readonly', !!readonly);
  input.classList.toggle('ui-readonly-field', !!readonly);
  if (!readonly) input.removeAttribute('title');
}

function updateBeneficiaryPriorityPreview(data) {
  var preview = document.getElementById('ben-uutien-preview');
  if (!preview) return;
  if (!editMode) {
    preview.textContent = 'Tự động tính khi lưu';
    return;
  }
  preview.textContent = 'Tự động: ' + (data.DoUuTien || '-') + ' theo tỉ lệ ' + Number(data.TiLeGiamHocPhi || 0) + '%';
}

function openModal(mode, data) {
  editMode = mode === 'edit';
  editId = editMode ? data.MaDoiTuong : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa đối tượng' : 'Thêm đối tượng';
  document.getElementById('ben-ma').value = editMode ? data.MaDoiTuong : '';
  setBeneficiaryCodeReadonly(editMode);
  document.getElementById('ben-ten').value = editMode ? data.TenDoiTuong : '';
  document.getElementById('ben-tile').value = editMode ? Number(data.TiLeGiamHocPhi || 0) : '';
  updateBeneficiaryPriorityPreview(data || {});
  document.getElementById('ben-mota').value = editMode ? (data.MoTa || '') : '';
  if (window.AdminUI) {
    AdminUI.markReadonlyFields(document.getElementById('beneficiary-modal'));
    AdminUI.initReadonlyNotices(document.getElementById('beneficiary-modal'));
  }
  document.getElementById('beneficiary-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('beneficiary-modal').classList.remove('active');
}

async function saveBeneficiary() {
  var beneficiaryId = document.getElementById('ben-ma').value.trim();
  var body = {
    TenDoiTuong: document.getElementById('ben-ten').value.trim(),
    TiLeGiamHocPhi: document.getElementById('ben-tile').value,
    MoTa: document.getElementById('ben-mota').value.trim()
  };
  if (!editMode) body.MaDoiTuong = beneficiaryId;
  var discountPercent = Number(body.TiLeGiamHocPhi);
  if (!beneficiaryId || !body.TenDoiTuong || body.TiLeGiamHocPhi === '') {
    showToast('Vui lòng nhập đầy đủ thông tin', 'error');
    return;
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    showToast('Tỉ lệ giảm học phí phải từ 0 đến 100', 'error');
    return;
  }
  var url = editMode ? '/api/beneficiaries/' + editId : '/api/beneficiaries';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

async function deleteBeneficiary(id) {
  if (!confirm('Xóa đối tượng "' + id + '"?')) return;
  var res = await apiFetch('/api/beneficiaries/' + id, { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

async function openStudentsModal(id, name) {
  currentBeneficiaryId = id;
  document.getElementById('students-modal-title').textContent = 'SV thuộc: ' + name;
  document.getElementById('students-modal').classList.add('active');
  document.getElementById('add-sv-masv').value = '';
  selectedBeneficiaryImportFile = null;
  var importInput = document.getElementById('beneficiary-import-input');
  var importResult = document.getElementById('beneficiary-import-result');
  if (importInput) importInput.value = '';
  if (importResult) {
    importResult.classList.add('hidden');
    importResult.innerHTML = '';
  }
  await loadStudentList();
}

function closeStudentsModal() {
  document.getElementById('students-modal').classList.remove('active');
}

async function loadStudentList() {
  var listEl = document.getElementById('students-list');
  listEl.innerHTML = '<div class="empty-state">Đang tải...</div>';
  try {
    var res = await apiFetch('/api/beneficiaries/' + currentBeneficiaryId + '/students');
    var students = res.data || [];
    if (students.length === 0) {
      listEl.innerHTML = '<div class="empty-state">Chưa có sinh viên nào</div>';
      return;
    }
    var html = '<table class="data-table"><thead><tr><th>MSSV</th><th>Họ tên</th><th>Ghi chú</th><th>Thao tác</th></tr></thead><tbody>';
    students.forEach(function(s) {
      var maSv = beneficiaryEscapeHtml(s.MaSv);
      html += '<tr><td class="mono">' + maSv + '</td>';
      html += '<td>' + beneficiaryEscapeHtml(s.SINHVIEN ? s.SINHVIEN.HoTen : '-') + '</td>';
      html += '<td>' + beneficiaryEscapeHtml(s.GhiChu || '-') + '</td>';
      html += '<td><button class="btn btn-sm btn-danger" data-masv="' + maSv + '" onclick="removeStudent(this.dataset.masv)">Xóa</button></td></tr>';
    });
    html += '</tbody></table>';
    listEl.innerHTML = html;
  } catch (e) {
    listEl.innerHTML = '<div class="empty-state">Lỗi tải dữ liệu</div>';
  }
}

async function addStudent() {
  var masv = document.getElementById('add-sv-masv').value.trim();
  if (!masv) {
    showToast('Vui lòng nhập MSSV', 'error');
    return;
  }
  var res = await apiFetch('/api/beneficiaries/' + currentBeneficiaryId + '/students', { method: 'POST', body: { MaSv: masv } });
  if (res.success) {
    showToast(res.message, 'success');
    document.getElementById('add-sv-masv').value = '';
    await loadStudentList();
    location.reload();
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

async function removeStudent(masv) {
  if (!confirm('Xóa SV ' + masv + ' khỏi đối tượng?')) return;
  var res = await apiFetch('/api/beneficiaries/' + currentBeneficiaryId + '/students/' + encodeURIComponent(masv), { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    await loadStudentList();
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

function debounceSearch() {
  clearTimeout(beneficiarySearchTimer);
  beneficiarySearchTimer = setTimeout(function() {
    applyFilters();
  }, 400);
}

function applyFilters() {
  var searchInput = document.getElementById('search-input');
  var searchField = document.getElementById('beneficiary-search-field');
  var search = searchInput ? searchInput.value.trim() : '';
  var url = '/admin/beneficiaries?page=1';
  if (searchField && searchField.value) url += '&searchField=' + encodeURIComponent(searchField.value);
  if (search) url += '&search=' + encodeURIComponent(search);
  window.location.href = url;
}

function onBeneficiaryImportFileChange() {
  var input = document.getElementById('beneficiary-import-input');
  var result = document.getElementById('beneficiary-import-result');

  selectedBeneficiaryImportFile = input && input.files ? input.files[0] : null;

  if (result) {
    result.classList.toggle('hidden', !selectedBeneficiaryImportFile);
    result.innerHTML = selectedBeneficiaryImportFile
      ? [
          '<div class=card><div class=card-body>',
          '<h3>Nhập sinh viên vào đối tượng</h3>',
          '<p>Đã chọn file: <strong>' + beneficiaryEscapeHtml(selectedBeneficiaryImportFile.name) + '</strong></p>',
          '<button class=btn type=button onclick=importStudentsToBeneficiary()>Xác nhận nhập</button>',
          '</div></div>'
        ].join('')
      : '';
  }
}

async function importStudentsToBeneficiary() {
  if (!currentBeneficiaryId) {
    showToast('Vui lòng mở đối tượng ưu tiên trước', 'error');
    return;
  }

  if (!selectedBeneficiaryImportFile) {
    showToast('Vui lòng chọn file Excel', 'error');
    return;
  }

  var result = document.getElementById('beneficiary-import-result');
  if (result) {
    result.classList.remove('hidden');
    result.innerHTML = '<div class=card><div class=card-body>Đang nhập dữ liệu...</div></div>';
  }

  try {
    var formData = new FormData();
    formData.append('file', selectedBeneficiaryImportFile);

    var res = await apiFetch('/api/beneficiaries/' + encodeURIComponent(currentBeneficiaryId) + '/students/import', {
      method: 'POST',
      body: formData
    });

    if (res.success) {
      var data = res.data || {};
      var html = [
        '<div class=card><div class=card-body>',
        '<h3>Kết quả nhập Excel</h3>',
        '<p>Thành công: <strong>' + Number(data.successCount || 0) + '</strong> | Lỗi: <strong>' + Number(data.errorCount || 0) + '</strong></p>'
      ].join('');

      if (data.errors && data.errors.length) {
        html += '<table class=data-table><thead><tr><th>Dòng</th><th>MSSV</th><th>Lý do lỗi</th></tr></thead><tbody>';
        data.errors.forEach(function(error) {
          html += '<tr>';
          html += '<td>' + beneficiaryEscapeHtml(error.row || '-') + '</td>';
          html += '<td>' + beneficiaryEscapeHtml(error.MaSv || '-') + '</td>';
          html += '<td>' + beneficiaryEscapeHtml(error.reason || '-') + '</td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
      }

      html += '</div></div>';
      if (result) result.innerHTML = html;
      showToast(res.message || 'Nhập Excel hoàn tất', 'success');
      await loadStudentList();
    } else {
      showToast(res.message || 'Không thể nhập Excel', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối khi nhập Excel', 'error');
  } finally {
    var importInput = document.getElementById('beneficiary-import-input');
    if (importInput) importInput.value = '';
    selectedBeneficiaryImportFile = null;
  }
}
