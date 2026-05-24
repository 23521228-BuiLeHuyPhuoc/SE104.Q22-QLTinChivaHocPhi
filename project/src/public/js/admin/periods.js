var editingPeriodId = null;
var periodSearchTimer = null;

function openPeriodModal(mode, period) {
  editingPeriodId = null;
  document.getElementById('period-modal-title').textContent = mode === 'edit' ? 'Sửa tiết học' : 'Thêm tiết học';
  document.getElementById('period-ma').disabled = mode === 'edit';

  if (mode === 'edit' && period) {
    editingPeriodId = period.MaTiet;
    document.getElementById('period-ma').value = period.MaTiet || '';
    document.getElementById('period-ten').value = period.TenTiet || '';
    document.getElementById('period-thutu').value = period.ThuTu || 1;
    document.getElementById('period-batdau').value = period.GioBatDauText || '';
    document.getElementById('period-ketthuc').value = period.GioKetThucText || '';
    document.getElementById('period-trangthai').value = period.TrangThai === false ? 'false' : 'true';
    document.getElementById('period-mota').value = period.MoTa || '';
  } else {
    document.getElementById('period-form').reset();
    document.getElementById('period-thutu').value = 1;
    document.getElementById('period-trangthai').value = 'true';
  }

  document.getElementById('period-modal').classList.add('active');
}

function closePeriodModal() {
  document.getElementById('period-modal').classList.remove('active');
}

async function savePeriod() {
  var data = {
    MaTiet: document.getElementById('period-ma').value.trim(),
    TenTiet: document.getElementById('period-ten').value.trim(),
    ThuTu: parseInt(document.getElementById('period-thutu').value, 10),
    GioBatDau: document.getElementById('period-batdau').value,
    GioKetThuc: document.getElementById('period-ketthuc').value,
    TrangThai: document.getElementById('period-trangthai').value === 'true',
    MoTa: document.getElementById('period-mota').value.trim() || null
  };

  try {
    var res = editingPeriodId
      ? await apiFetch('/api/periods/' + encodeURIComponent(editingPeriodId), { method: 'PUT', body: data })
      : await apiFetch('/api/periods', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingPeriodId ? 'Cập nhật tiết học thành công' : 'Thêm tiết học thành công', 'success');
      closePeriodModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu tiết học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deletePeriod(id) {
  if (!confirm('Bạn có chắc muốn xóa tiết học này?')) return;
  try {
    var res = await apiFetch('/api/periods/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa tiết học', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa tiết học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function debounceSearch() {
  clearTimeout(periodSearchTimer);
  periodSearchTimer = setTimeout(function() {
    var search = document.getElementById('search-input').value.trim();
    window.location.href = '/admin/periods?page=1&search=' + encodeURIComponent(search);
  }, 400);
}
