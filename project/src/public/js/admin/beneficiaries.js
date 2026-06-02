var editMode = false;
var editId = null;
var currentBeneficiaryId = null;

function beneficiaryEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openModal(mode, data) {
  editMode = mode === 'edit';
  editId = editMode ? data.MaDoiTuong : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sua doi tuong' : 'Them doi tuong';
  document.getElementById('ben-ma').value = editMode ? data.MaDoiTuong : '';
  document.getElementById('ben-ma').disabled = editMode;
  document.getElementById('ben-ten').value = editMode ? data.TenDoiTuong : '';
  document.getElementById('ben-tile').value = editMode ? Number(data.TiLeGiamHocPhi || 0) : '';
  document.getElementById('ben-uutien').value = editMode ? data.DoUuTien : '';
  document.getElementById('ben-mota').value = editMode ? (data.MoTa || '') : '';
  document.getElementById('beneficiary-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('beneficiary-modal').classList.remove('active');
}

async function saveBeneficiary() {
  var body = {
    MaDoiTuong: document.getElementById('ben-ma').value.trim(),
    TenDoiTuong: document.getElementById('ben-ten').value.trim(),
    TiLeGiamHocPhi: document.getElementById('ben-tile').value,
    DoUuTien: document.getElementById('ben-uutien').value,
    MoTa: document.getElementById('ben-mota').value.trim()
  };
  var discountPercent = Number(body.TiLeGiamHocPhi);
  var priority = Number(body.DoUuTien);
  if (!body.MaDoiTuong || !body.TenDoiTuong || body.TiLeGiamHocPhi === '' || body.DoUuTien === '') {
    showToast('Vui long nhap day du thong tin', 'error');
    return;
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    showToast('Ti le giam hoc phi phai tu 0 den 100', 'error');
    return;
  }
  if (!Number.isInteger(priority) || priority <= 0) {
    showToast('Do uu tien phai la so nguyen duong', 'error');
    return;
  }
  var url = editMode ? '/api/beneficiaries/' + editId : '/api/beneficiaries';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Loi', 'error');
  }
}

async function deleteBeneficiary(id) {
  if (!confirm('Xoa doi tuong "' + id + '"?')) return;
  var res = await apiFetch('/api/beneficiaries/' + id, { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Loi', 'error');
  }
}

async function openStudentsModal(id, name) {
  currentBeneficiaryId = id;
  document.getElementById('students-modal-title').textContent = 'SV thuoc: ' + name;
  document.getElementById('students-modal').classList.add('active');
  document.getElementById('add-sv-masv').value = '';
  await loadStudentList();
}

function closeStudentsModal() {
  document.getElementById('students-modal').classList.remove('active');
}

async function loadStudentList() {
  var listEl = document.getElementById('students-list');
  listEl.innerHTML = '<div class="empty-state">Dang tai...</div>';
  try {
    var res = await apiFetch('/api/beneficiaries/' + currentBeneficiaryId + '/students');
    var students = res.data || [];
    if (students.length === 0) {
      listEl.innerHTML = '<div class="empty-state">Chua co sinh vien nao</div>';
      return;
    }
    var html = '<table class="data-table"><thead><tr><th>MSSV</th><th>Ho ten</th><th>Ghi chu</th><th>Thao tac</th></tr></thead><tbody>';
    students.forEach(function(s) {
      var maSv = beneficiaryEscapeHtml(s.MaSv);
      html += '<tr><td class="mono">' + maSv + '</td>';
      html += '<td>' + beneficiaryEscapeHtml(s.SINHVIEN ? s.SINHVIEN.HoTen : '-') + '</td>';
      html += '<td>' + beneficiaryEscapeHtml(s.GhiChu || '-') + '</td>';
      html += '<td><button class="btn btn-sm btn-danger" data-masv="' + maSv + '" onclick="removeStudent(this.dataset.masv)">Xoa</button></td></tr>';
    });
    html += '</tbody></table>';
    listEl.innerHTML = html;
  } catch (e) {
    listEl.innerHTML = '<div class="empty-state">Loi tai du lieu</div>';
  }
}

async function addStudent() {
  var masv = document.getElementById('add-sv-masv').value.trim();
  if (!masv) {
    showToast('Vui long nhap MSSV', 'error');
    return;
  }
  var res = await apiFetch('/api/beneficiaries/' + currentBeneficiaryId + '/students', { method: 'POST', body: { MaSv: masv } });
  if (res.success) {
    showToast(res.message, 'success');
    document.getElementById('add-sv-masv').value = '';
    await loadStudentList();
    location.reload();
  } else {
    showToast(res.message || 'Loi', 'error');
  }
}

async function removeStudent(masv) {
  if (!confirm('Xoa SV ' + masv + ' khoi doi tuong?')) return;
  var res = await apiFetch('/api/beneficiaries/' + currentBeneficiaryId + '/students/' + encodeURIComponent(masv), { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    await loadStudentList();
  } else {
    showToast(res.message || 'Loi', 'error');
  }
}
