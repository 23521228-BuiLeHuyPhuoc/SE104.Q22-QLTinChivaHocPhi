var editingPrereqId = null;
var prereqSearchTimer = null;

function openPrereqModal(mode, row) {
  editingPrereqId = null;
  document.getElementById('prereq-modal-title').textContent = mode === 'edit' ? 'Sửa ràng buộc' : 'Thêm ràng buộc';

  if (mode === 'edit' && row) {
    editingPrereqId = row.id;
    document.getElementById('prereq-course').value = row.MaMonHoc || '';
    document.getElementById('prereq-required-course').value = row.MaMonDieuKien || '';
    document.getElementById('prereq-type').value = row.LoaiDieuKien || 'hoc_truoc';
    document.getElementById('prereq-status').value = row.TrangThai === false ? 'false' : 'true';
    document.getElementById('prereq-note').value = row.MoTa || '';
  } else {
    document.getElementById('prereq-form').reset();
    document.getElementById('prereq-type').value = 'tien_quyet';
    document.getElementById('prereq-status').value = 'true';
  }

  document.getElementById('prereq-modal').classList.add('active');
}

function closePrereqModal() {
  document.getElementById('prereq-modal').classList.remove('active');
}

async function savePrereq() {
  var data = {
    MaMonHoc: document.getElementById('prereq-course').value,
    MaMonDieuKien: document.getElementById('prereq-required-course').value,
    LoaiDieuKien: document.getElementById('prereq-type').value,
    TrangThai: document.getElementById('prereq-status').value === 'true',
    MoTa: document.getElementById('prereq-note').value.trim() || null
  };

  try {
    var res = editingPrereqId
      ? await apiFetch('/api/prerequisites/' + editingPrereqId, { method: 'PUT', body: data })
      : await apiFetch('/api/prerequisites', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingPrereqId ? 'Cập nhật ràng buộc thành công' : 'Thêm ràng buộc thành công', 'success');
      closePrereqModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu ràng buộc môn học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deletePrereq(id) {
  if (!confirm('Bạn có chắc muốn xóa ràng buộc môn học này?')) return;
  try {
    var res = await apiFetch('/api/prerequisites/' + id, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa ràng buộc môn học', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa ràng buộc môn học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function applyPrereqFilters() {
  var search = document.getElementById('search-input').value.trim();
  var type = document.getElementById('type-filter').value;
  var url = '/admin/prerequisites?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (type) url += '&LoaiDieuKien=' + encodeURIComponent(type);
  window.location.href = url;
}

function debouncePrereqSearch() {
  clearTimeout(prereqSearchTimer);
  prereqSearchTimer = setTimeout(applyPrereqFilters, 400);
}
