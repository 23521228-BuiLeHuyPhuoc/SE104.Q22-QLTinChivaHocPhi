var searchTimer;
var editMode = false;
var editId = null;

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

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var s = document.getElementById('search-input').value.trim();
  var searchField = document.getElementById('faculty-search-field').value;
  var params = new URLSearchParams({ page: '1' });
  if (s) params.set('search', s);
  if (searchField && searchField !== 'all') params.set('searchField', searchField);
  window.location.href = '/admin/faculties?' + params.toString();
}

function setFacultyCodeReadonly(isReadonly) {
  var input = document.getElementById('fac-ma');
  input.readOnly = isReadonly;
  input.classList.toggle('ui-readonly-field', isReadonly);
  if (window.AdminUI) AdminUI.markReadonlyFields(document.getElementById('faculty-form'));
}

function openModal(mode, data) {
  editMode = mode === 'edit';
  editId = editMode ? data.MaKhoa : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa khoa' : 'Thêm khoa';
  document.getElementById('fac-ma').value = editMode ? data.MaKhoa : '';
  setFacultyCodeReadonly(editMode);
  document.getElementById('fac-ten').value = editMode ? data.TenKhoa : '';
  document.getElementById('fac-viettat').value = editMode ? (data.TenVietTat || '') : '';
  document.getElementById('fac-truongkhoa').value = editMode ? (data.TruongKhoa || '') : '';
  document.getElementById('fac-email').value = editMode ? (data.Email || '') : '';
  document.getElementById('fac-sdt').value = editMode ? (data.Sdt || '') : '';
  document.getElementById('fac-diachi').value = editMode ? (data.DiaChi || '') : '';
  document.getElementById('faculty-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('faculty-modal').classList.remove('active');
}

async function saveFaculty() {
  var body = {
    MaKhoa: document.getElementById('fac-ma').value.trim(),
    TenKhoa: document.getElementById('fac-ten').value.trim(),
    TenVietTat: document.getElementById('fac-viettat').value.trim(),
    TruongKhoa: document.getElementById('fac-truongkhoa').value.trim(),
    Email: document.getElementById('fac-email').value.trim(),
    Sdt: document.getElementById('fac-sdt').value.trim(),
    DiaChi: document.getElementById('fac-diachi').value.trim()
  };
  if (!body.MaKhoa || !body.TenKhoa) {
    showToast('Vui lòng nhập mã và tên khoa', 'error');
    return;
  }
  var url = editMode ? '/api/faculties/' + encodeURIComponent(editId) : '/api/faculties';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

async function deleteFaculty(id) {
  if (!confirm('Xóa khoa "' + id + '"?')) return;
  var res = await apiFetch('/api/faculties/' + encodeURIComponent(id), { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  if (!window.AdminUI) return;
  AdminUI.attachRowDetailHandlers({
    rowSelector: 'tbody tr[data-record]',
    title: 'Chi tiết khoa',
    buildDetail: function(record) {
      return {
        title: 'Chi tiết khoa ' + (record.MaKhoa || ''),
        rows: [
          { label: 'Mã khoa', value: record.MaKhoa },
          { label: 'Tên khoa', value: record.TenKhoa },
          { label: 'Tên viết tắt', value: record.TenVietTat },
          { label: 'Trưởng khoa', value: record.TruongKhoa },
          { label: 'Email', value: record.Email },
          { label: 'Số điện thoại', value: record.Sdt },
          { label: 'Địa chỉ', value: record.DiaChi },
          { label: 'Số ngành', value: record._count ? record._count.NGANHHOC : 0 },
          { label: 'Số môn', value: record._count ? record._count.MONHOC : 0 },
          { label: 'Sửa bởi', value: record.NguoiCapNhatTen || record.NguoiCapNhat || '-' },
          { label: 'Sửa lúc', value: formatAdminDateTime(record.NgayCapNhat) }
        ]
      };
    }
  });
});