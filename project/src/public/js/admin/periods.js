var editingPeriodId = null;
var periodSearchTimer = null;

function formatAdminDateTime(value) {
  if (!value) return '-';
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function formatPeriodStatus(value) {
  return value === false ? 'Tạm khóa' : 'Đang dùng';
}

function setPeriodCodeReadonly(isReadonly) {
  var input = document.getElementById('period-ma');
  input.readOnly = isReadonly;
  input.classList.toggle('ui-readonly-field', isReadonly);
  if (window.AdminUI) AdminUI.markReadonlyFields(document.getElementById('period-form'));
}

function openPeriodModal(mode, period) {
  editingPeriodId = null;
  document.getElementById('period-modal-title').textContent = mode === 'edit' ? 'Sửa tiết học' : 'Thêm tiết học';
  setPeriodCodeReadonly(mode === 'edit');

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
    setPeriodCodeReadonly(false);
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

function applyPeriodFilters() {
  var search = document.getElementById('search-input').value.trim();
  var searchField = document.getElementById('period-search-field').value;
  var params = new URLSearchParams({ page: '1' });
  if (search) params.set('search', search);
  if (searchField && searchField !== 'all') params.set('searchField', searchField);
  navigatePageContent('/admin/periods?' + params.toString());
}

function debounceSearch() {
  clearTimeout(periodSearchTimer);
  periodSearchTimer = setTimeout(applyPeriodFilters, 400);
}

document.addEventListener('DOMContentLoaded', function() {
  if (!window.AdminUI) return;
  AdminUI.attachRowDetailHandlers({
    rowSelector: 'tbody tr[data-record]',
    title: 'Chi tiết tiết học',
    buildDetail: function(record) {
      return {
        title: 'Chi tiết ' + (record.TenTiet || record.MaTiet || 'tiết học'),
        rows: [
          { label: 'Mã tiết', value: record.MaTiet },
          { label: 'Tên tiết', value: record.TenTiet },
          { label: 'Thứ tự', value: record.ThuTu },
          { label: 'Giờ bắt đầu', value: record.GioBatDauText },
          { label: 'Giờ kết thúc', value: record.GioKetThucText },
          { label: 'Trạng thái', value: formatPeriodStatus(record.TrangThai) },
          { label: 'Mô tả', value: record.MoTa },
          { label: 'Sửa bởi', value: record.NguoiCapNhatTen || record.NguoiCapNhat || '-' },
          { label: 'Sửa lúc', value: formatAdminDateTime(record.NgayCapNhat) }
        ]
      };
    }
  });
});
