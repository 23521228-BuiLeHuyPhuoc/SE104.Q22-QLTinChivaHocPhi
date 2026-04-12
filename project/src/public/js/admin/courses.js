var editingId = null;

function openModal(mode, c) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa môn học' : 'Thêm môn học';
  document.getElementById('mh-ma').disabled = mode === 'edit';
  if (mode === 'edit' && c) {
    editingId = c.ma_mon_hoc || c.MaMonHoc;
    document.getElementById('mh-ma').value = c.ma_mon_hoc || c.MaMonHoc || '';
    document.getElementById('mh-ten').value = c.ten_mon_hoc || c.TenMonHoc || '';
    document.getElementById('mh-tc').value = c.so_tin_chi || c.SoTinChi || 3;
    document.getElementById('mh-loai').value = c.loai_mon_hoc || c.LoaiMonHoc || 'Bắt buộc';
    document.getElementById('mh-mota').value = c.mo_ta || c.MoTa || '';
  } else {
    document.getElementById('course-form').reset();
  }
  document.getElementById('course-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('course-modal').classList.remove('active');
}

async function saveCourse() {
  const data = {
    ma_mon_hoc: document.getElementById('mh-ma').value,
    ten_mon_hoc: document.getElementById('mh-ten').value,
    so_tin_chi: parseInt(document.getElementById('mh-tc').value),
    loai_mon_hoc: document.getElementById('mh-loai').value,
    mo_ta: document.getElementById('mh-mota').value
  };
  try {
    var res;
    if (editingId) {
      res = await apiFetch('/api/courses/' + editingId, { method: 'PUT', body: data });
    } else {
      res = await apiFetch('/api/courses', { method: 'POST', body: data });
    }
    if (res.success) {
      showToast(editingId ? 'Cập nhật thành công!' : 'Thêm môn học thành công!', 'success');
      closeModal();
      setTimeout(() => location.reload(), 500);
    } else {
      showToast(res.message || 'Lỗi', 'error');
    }
  } catch(e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteCourse(id) {
  if (!confirm('Bạn có chắc muốn xóa môn học này?')) return;
  try {
    const res = await apiFetch('/api/courses/' + id, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa môn học', 'success');
      setTimeout(() => location.reload(), 500);
    } else {
      showToast(res.message || 'Lỗi', 'error');
    }
  } catch(e) { showToast('Lỗi kết nối', 'error'); }
}

var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const search = document.getElementById('search-input').value;
    window.location.href = '/admin/courses?page=1&search=' + encodeURIComponent(search);
  }, 400);
}
