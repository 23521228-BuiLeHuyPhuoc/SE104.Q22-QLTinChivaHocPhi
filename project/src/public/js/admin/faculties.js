var searchTimer; var editMode = false; var editId = null;
function debounceSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(function() { applyFilters(); }, 400); }
function applyFilters() { var s = document.getElementById('search-input').value; var url = '/admin/faculties?page=1'; if (s) url += '&search=' + encodeURIComponent(s); window.location.href = url; }
function openModal(mode, data) {
  editMode = mode === 'edit'; editId = editMode ? data.MaKhoa : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa khoa' : 'Thêm khoa';
  document.getElementById('fac-ma').value = editMode ? data.MaKhoa : ''; document.getElementById('fac-ma').disabled = editMode;
  document.getElementById('fac-ten').value = editMode ? data.TenKhoa : '';
  document.getElementById('fac-viettat').value = editMode ? (data.TenVietTat || '') : '';
  document.getElementById('fac-truongkhoa').value = editMode ? (data.TruongKhoa || '') : '';
  document.getElementById('fac-email').value = editMode ? (data.Email || '') : '';
  document.getElementById('fac-sdt').value = editMode ? (data.Sdt || '') : '';
  document.getElementById('fac-diachi').value = editMode ? (data.DiaChi || '') : '';
  document.getElementById('faculty-modal').classList.add('active');
}
function closeModal() { document.getElementById('faculty-modal').classList.remove('active'); }
async function saveFaculty() {
  var body = { MaKhoa: document.getElementById('fac-ma').value.trim(), TenKhoa: document.getElementById('fac-ten').value.trim(), TenVietTat: document.getElementById('fac-viettat').value.trim(), TruongKhoa: document.getElementById('fac-truongkhoa').value.trim(), Email: document.getElementById('fac-email').value.trim(), Sdt: document.getElementById('fac-sdt').value.trim(), DiaChi: document.getElementById('fac-diachi').value.trim() };
  if (!body.MaKhoa || !body.TenKhoa) { showToast('Vui lòng nhập mã và tên khoa', 'error'); return; }
  var url = editMode ? '/api/faculties/' + editId : '/api/faculties';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
async function deleteFaculty(id) {
  if (!confirm('Xóa khoa "' + id + '"?')) return;
  var res = await apiFetch('/api/faculties/' + id, { method: 'DELETE' });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
