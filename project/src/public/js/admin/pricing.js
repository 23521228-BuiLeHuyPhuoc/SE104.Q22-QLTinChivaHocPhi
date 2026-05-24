var editMode = false; var editId = null;
function applyFilters() {
  var lm = document.getElementById('filter-loaimon').value;
  var hk = document.getElementById('filter-hocky').value;
  var url = '/admin/pricing?';
  if (lm) url += 'LoaiMon=' + encodeURIComponent(lm) + '&';
  if (hk) url += 'MaHocKy=' + encodeURIComponent(hk) + '&';
  window.location.href = url;
}
function openModal(mode, data) {
  editMode = mode === 'edit'; editId = editMode ? data.id : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa đơn giá' : 'Thêm đơn giá';
  document.getElementById('pr-loaimon').value = editMode ? data.LoaiMon : 'LT';
  document.getElementById('pr-loaihoc').value = editMode ? data.LoaiHoc : 'hoc_moi';
  document.getElementById('pr-dongia').value = editMode ? Number(data.DonGia || 0) : '';
  document.getElementById('pr-hocky').value = editMode ? (data.MaHocKy || '') : '';
  document.getElementById('pr-ghichu').value = editMode ? (data.GhiChu || '') : '';
  document.getElementById('pricing-modal').classList.add('active');
}
function closeModal() { document.getElementById('pricing-modal').classList.remove('active'); }
async function savePricing() {
  var body = { LoaiMon: document.getElementById('pr-loaimon').value, LoaiHoc: document.getElementById('pr-loaihoc').value, DonGia: document.getElementById('pr-dongia').value, MaHocKy: document.getElementById('pr-hocky').value || null, GhiChu: document.getElementById('pr-ghichu').value.trim() };
  if (!body.DonGia) { showToast('Vui lòng nhập đơn giá', 'error'); return; }
  var url = editMode ? '/api/pricing/' + editId : '/api/pricing';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
async function deletePricing(id) {
  if (!confirm('Xóa đơn giá này?')) return;
  var res = await apiFetch('/api/pricing/' + id, { method: 'DELETE' });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
