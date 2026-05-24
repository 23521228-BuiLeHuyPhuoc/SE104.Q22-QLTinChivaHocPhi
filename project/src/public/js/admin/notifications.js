var editMode = false; var editId = null;
function applyFilters() {
  var loai = document.getElementById('filter-loai').value;
  var url = '/admin/notifications?';
  if (loai) url += 'Loai=' + encodeURIComponent(loai);
  window.location.href = url;
}
function openModal(mode, data) {
  editMode = mode === 'edit'; editId = editMode ? data.MaThongBao : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa thông báo' : 'Tạo thông báo';
  document.getElementById('notif-tieude').value = editMode ? data.TieuDe : '';
  document.getElementById('notif-noidung').value = editMode ? data.NoiDung : '';
  document.getElementById('notif-loai').value = editMode ? data.Loai : 'chung';
  document.getElementById('notif-doituong').value = editMode ? (data.DOITUONG || 'Tất cả') : 'Tất cả';
  document.getElementById('notif-ghim').checked = editMode ? !!data.GhimTop : false;
  document.getElementById('notif-hethan').value = editMode && data.NgayHetHan ? new Date(data.NgayHetHan).toISOString().split('T')[0] : '';
  document.getElementById('notif-modal').classList.add('active');
}
function closeModal() { document.getElementById('notif-modal').classList.remove('active'); }
async function saveNotification() {
  var body = {
    TieuDe: document.getElementById('notif-tieude').value.trim(),
    NoiDung: document.getElementById('notif-noidung').value.trim(),
    Loai: document.getElementById('notif-loai').value,
    DOITUONG: document.getElementById('notif-doituong').value,
    GhimTop: document.getElementById('notif-ghim').checked,
    NgayHetHan: document.getElementById('notif-hethan').value || null
  };
  if (!body.TieuDe || !body.NoiDung) { showToast('Vui lòng nhập tiêu đề và nội dung', 'error'); return; }
  var url = editMode ? '/api/notifications/' + editId : '/api/notifications';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) { showToast(res.message || 'Thành công', 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
async function deleteNotification(id) {
  if (!confirm('Xóa thông báo này?')) return;
  var res = await apiFetch('/api/notifications/' + id, { method: 'DELETE' });
  if (res.success) { showToast(res.message || 'Đã xóa', 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
