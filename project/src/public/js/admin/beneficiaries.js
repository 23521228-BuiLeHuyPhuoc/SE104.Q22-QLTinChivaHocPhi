var editMode = false; var editId = null;
var currentBeneficiaryId = null;

function openModal(mode, data) {
  editMode = mode === 'edit'; editId = editMode ? data.MaDoiTuong : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa đối tượng' : 'Thêm đối tượng';
  document.getElementById('ben-ma').value = editMode ? data.MaDoiTuong : ''; document.getElementById('ben-ma').disabled = editMode;
  document.getElementById('ben-ten').value = editMode ? data.TenDoiTuong : '';
  document.getElementById('ben-tile').value = editMode ? Number(data.TiLeGiamHocPhi || 0) : '';
  document.getElementById('ben-uutien').value = editMode ? data.DoUuTien : '';
  document.getElementById('ben-mota').value = editMode ? (data.MoTa || '') : '';
  document.getElementById('beneficiary-modal').classList.add('active');
}
function closeModal() { document.getElementById('beneficiary-modal').classList.remove('active'); }

async function saveBeneficiary() {
  var body = { MaDoiTuong: document.getElementById('ben-ma').value.trim(), TenDoiTuong: document.getElementById('ben-ten').value.trim(), TiLeGiamHocPhi: document.getElementById('ben-tile').value, DoUuTien: document.getElementById('ben-uutien').value, MoTa: document.getElementById('ben-mota').value.trim() };
  if (!body.MaDoiTuong || !body.TenDoiTuong || !body.TiLeGiamHocPhi || !body.DoUuTien) { showToast('Vui lòng nhập đầy đủ', 'error'); return; }
  var url = editMode ? '/api/beneficiaries/' + editId : '/api/beneficiaries';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}

async function deleteBeneficiary(id) {
  if (!confirm('Xóa đối tượng "' + id + '"?')) return;
  var res = await apiFetch('/api/beneficiaries/' + id, { method: 'DELETE' });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}

// ── Students Modal ──
async function openStudentsModal(id, name) {
  currentBeneficiaryId = id;
  document.getElementById('students-modal-title').textContent = 'SV thuộc: ' + name;
  document.getElementById('students-modal').classList.add('active');
  document.getElementById('add-sv-masv').value = '';
  await loadStudentList();
}
function closeStudentsModal() { document.getElementById('students-modal').classList.remove('active'); }

async function loadStudentList() {
  var listEl = document.getElementById('students-list');
  listEl.innerHTML = '<div class="empty-state">Đang tải...</div>';
  try {
    var res = await apiFetch('/api/beneficiaries/' + currentBeneficiaryId + '/students');
    var students = res.data || [];
    if (students.length === 0) { listEl.innerHTML = '<div class="empty-state">Chưa có sinh viên nào</div>'; return; }
    var html = '<table class="data-table"><thead><tr><th>MSSV</th><th>Họ tên</th><th>Ghi chú</th><th>Thao tác</th></tr></thead><tbody>';
    students.forEach(function(s) {
      html += '<tr><td class="mono">' + s.MaSv + '</td>';
      html += '<td>' + (s.SINHVIEN ? s.SINHVIEN.HoTen : '-') + '</td>';
      html += '<td>' + (s.GhiChu || '-') + '</td>';
      html += '<td><button class="btn btn-sm btn-danger" onclick="removeStudent(\'' + s.MaSv + '\')">Xóa</button></td></tr>';
    });
    html += '</tbody></table>';
    listEl.innerHTML = html;
  } catch (e) { listEl.innerHTML = '<div class="empty-state">Lỗi tải dữ liệu</div>'; }
}

async function addStudent() {
  var masv = document.getElementById('add-sv-masv').value.trim();
  if (!masv) { showToast('Vui lòng nhập MSSV', 'error'); return; }
  var res = await apiFetch('/api/beneficiaries/' + currentBeneficiaryId + '/students', { method: 'POST', body: { MaSv: masv } });
  if (res.success) { showToast(res.message, 'success'); document.getElementById('add-sv-masv').value = ''; await loadStudentList(); location.reload(); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}

async function removeStudent(masv) {
  if (!confirm('Xóa SV ' + masv + ' khỏi đối tượng?')) return;
  var res = await apiFetch('/api/beneficiaries/' + currentBeneficiaryId + '/students/' + masv, { method: 'DELETE' });
  if (res.success) { showToast(res.message, 'success'); await loadStudentList(); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
