var editingId = null;

function syncCredits() {
  var type = document.getElementById('mh-loai').value;
  var lessons = parseInt(document.getElementById('mh-sotiet').value, 10) || 0;
  var divisor = type === 'TH' ? 30 : 15;
  document.getElementById('mh-tc').value = Math.max(1, Math.floor(lessons / divisor) || 1);
}

document.addEventListener('DOMContentLoaded', function() {
  var type = document.getElementById('mh-loai');
  var lessons = document.getElementById('mh-sotiet');
  if (type) type.addEventListener('change', syncCredits);
  if (lessons) lessons.addEventListener('input', syncCredits);
});

function openModal(mode, c) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa môn học' : 'Thêm môn học';
  document.getElementById('mh-ma').disabled = mode === 'edit';

  if (mode === 'edit' && c) {
    editingId = c.MaMonHoc;
    document.getElementById('mh-ma').value = c.MaMonHoc || '';
    document.getElementById('mh-ten').value = c.TenMonHoc || '';
    document.getElementById('mh-makhoa').value = c.MaKhoa || '';
    document.getElementById('mh-loai').value = c.LoaiMon || 'LT';
    document.getElementById('mh-sotiet').value = c.SoTiet || 45;
    document.getElementById('mh-tc').value = c.SoTinChi || 3;
    document.getElementById('mh-mota').value = c.MoTa || '';
  } else {
    document.getElementById('course-form').reset();
    document.getElementById('mh-loai').value = 'LT';
    document.getElementById('mh-sotiet').value = 45;
    syncCredits();
  }

  document.getElementById('course-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('course-modal').classList.remove('active');
}

async function saveCourse() {
  var data = {
    MaMonHoc: document.getElementById('mh-ma').value.trim(),
    TenMonHoc: document.getElementById('mh-ten').value.trim(),
    MaKhoa: document.getElementById('mh-makhoa').value.trim(),
    LoaiMon: document.getElementById('mh-loai').value,
    SoTiet: parseInt(document.getElementById('mh-sotiet').value, 10),
    MoTa: document.getElementById('mh-mota').value.trim() || null
  };

  try {
    var res = editingId
      ? await apiFetch('/api/courses/' + editingId, { method: 'PUT', body: data })
      : await apiFetch('/api/courses', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cập nhật môn học thành công' : 'Thêm môn học thành công', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu môn học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteCourse(id) {
  if (!confirm('Bạn có chắc muốn xóa môn học này?')) return;
  try {
    var res = await apiFetch('/api/courses/' + id, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa môn học', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa môn học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() {
    var search = document.getElementById('search-input').value;
    window.location.href = '/admin/courses?page=1&search=' + encodeURIComponent(search);
  }, 400);
}
