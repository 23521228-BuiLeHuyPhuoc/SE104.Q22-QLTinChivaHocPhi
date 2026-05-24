var searchTimer; var editMode = false; var editId = null;
function debounceSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(function() { applyFilters(); }, 400); }
function applyFilters() {
  var s = document.getElementById('search-input').value;
  var k = document.getElementById('filter-khoa').value;
  var url = '/admin/majors?page=1';
  if (s) url += '&search=' + encodeURIComponent(s);
  if (k) url += '&MaKhoa=' + encodeURIComponent(k);
  window.location.href = url;
}
function openModal(mode, data) {
  editMode = mode === 'edit'; editId = editMode ? data.MaNganh : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa ngành' : 'Thêm ngành';
  document.getElementById('maj-ma').value = editMode ? data.MaNganh : ''; document.getElementById('maj-ma').disabled = editMode;
  document.getElementById('maj-ten').value = editMode ? data.TenNganh : '';
  document.getElementById('maj-khoa').value = editMode ? data.MaKhoa : '';
  document.getElementById('maj-tinchi').value = editMode ? (data.SoTinChiToiThieu || 120) : 120;
  document.getElementById('maj-thoigian').value = editMode ? (data.ThoiGianDaoTao || 4) : 4;
  document.getElementById('maj-mota').value = editMode ? (data.MoTa || '') : '';
  document.getElementById('major-modal').classList.add('active');
}
function closeModal() { document.getElementById('major-modal').classList.remove('active'); }
async function saveMajor() {
  var body = { MaNganh: document.getElementById('maj-ma').value.trim(), TenNganh: document.getElementById('maj-ten').value.trim(), MaKhoa: document.getElementById('maj-khoa').value, SoTinChiToiThieu: document.getElementById('maj-tinchi').value, ThoiGianDaoTao: document.getElementById('maj-thoigian').value, MoTa: document.getElementById('maj-mota').value.trim() };
  if (!body.MaNganh || !body.TenNganh || !body.MaKhoa) { showToast('Vui lòng nhập đầy đủ', 'error'); return; }
  var url = editMode ? '/api/majors/' + editId : '/api/majors';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
async function deleteMajor(id) {
  if (!confirm('Xóa ngành "' + id + '"?')) return;
  var res = await apiFetch('/api/majors/' + id, { method: 'DELETE' });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
