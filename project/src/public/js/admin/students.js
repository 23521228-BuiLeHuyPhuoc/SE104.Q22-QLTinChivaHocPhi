var editingId = null;

function asDateInput(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

(async function loadMajors() {
  try {
    var res = await apiFetch('/api/students/majors');
    if (!res.success) return;

    var select = document.getElementById('sv-nganh');
    res.data.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m.MaNganh;
      opt.textContent = m.TenNganh + (m.TenKhoa ? ' (' + m.TenKhoa + ')' : '');
      select.appendChild(opt);
    });
  } catch (e) {}
})();

function openModal(mode, sv) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa sinh viên' : 'Thêm sinh viên';
  document.getElementById('sv-mssv').disabled = mode === 'edit';

  if (mode === 'edit' && sv) {
    editingId = sv.MaSv;
    document.getElementById('sv-mssv').value = sv.MaSv || '';
    document.getElementById('sv-hoten').value = sv.HoTen || '';
    document.getElementById('sv-email').value = sv.Email || '';
    document.getElementById('sv-sdt').value = sv.Sdt || '';
    document.getElementById('sv-ngaysinh').value = asDateInput(sv.NgaySinh);
    document.getElementById('sv-gioitinh').value = sv.GioiTinh || 'Nam';
    document.getElementById('sv-cmnd').value = sv.Cccd || '';
    document.getElementById('sv-dantoc').value = sv.MaDanToc || 'DT01';
    document.getElementById('sv-phuongxa').value = sv.MaPhuongXa || 'PX001';
    document.getElementById('sv-diachi').value = sv.DiaChiLienHe || '';
    document.getElementById('sv-nganh').value = sv.MaNganh || '';
    document.getElementById('sv-trangthai').value = sv.TrangThai || 'Đang học';
    document.getElementById('sv-password').value = '';
  } else {
    document.getElementById('student-form').reset();
    document.getElementById('sv-dantoc').value = 'DT01';
    document.getElementById('sv-phuongxa').value = 'PX001';
    document.getElementById('sv-trangthai').value = 'Đang học';
  }

  document.getElementById('student-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('student-modal').classList.remove('active');
}

async function saveStudent() {
  var data = {
    MaSv: document.getElementById('sv-mssv').value.trim(),
    HoTen: document.getElementById('sv-hoten').value.trim(),
    Email: document.getElementById('sv-email').value.trim() || null,
    Sdt: document.getElementById('sv-sdt').value.trim() || null,
    NgaySinh: document.getElementById('sv-ngaysinh').value,
    GioiTinh: document.getElementById('sv-gioitinh').value,
    Cccd: document.getElementById('sv-cmnd').value.trim() || null,
    MaDanToc: document.getElementById('sv-dantoc').value.trim() || null,
    MaPhuongXa: document.getElementById('sv-phuongxa').value.trim(),
    DiaChiLienHe: document.getElementById('sv-diachi').value.trim() || null,
    MaNganh: document.getElementById('sv-nganh').value,
    TrangThai: document.getElementById('sv-trangthai').value
  };

  if (!data.Cccd || !data.MaDanToc || !data.DiaChiLienHe) {
    showToast('CCCD, dân tộc và địa chỉ liên hệ là bắt buộc', 'error');
    return;
  }

  var password = document.getElementById('sv-password').value;
  if (password) data.password = password;

  try {
    var res = editingId
      ? await apiFetch('/api/students/' + editingId, { method: 'PUT', body: data })
      : await apiFetch('/api/students', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cập nhật sinh viên thành công' : 'Thêm sinh viên thành công', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu sinh viên', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteStudent(maSv) {
  if (!confirm('Bạn có chắc muốn xóa sinh viên ' + maSv + '?')) return;
  try {
    var res = await apiFetch('/api/students/' + maSv, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa sinh viên', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa sinh viên', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function approveStudentAccount(accountId, button) {
  var row = button ? button.closest('tr') : null;
  var maSv = row ? row.querySelector('td.mono').textContent.trim() : '';
  var res = await apiFetch('/api/roles/accounts/' + accountId + '/approval', {
    method: 'PUT',
    body: { TrangThaiDuyet: 'approved', MaSv: maSv }
  });
  if (res.success) {
    showToast('Đã duyệt sinh viên', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Không thể duyệt sinh viên', 'error');
  }
}

async function rejectStudentAccount(accountId) {
  var reason = prompt('Lý do từ chối?') || 'Không được duyệt';
  var res = await apiFetch('/api/roles/accounts/' + accountId + '/approval', {
    method: 'PUT',
    body: { TrangThaiDuyet: 'rejected', LyDoTuChoi: reason }
  });
  if (res.success) {
    showToast('Đã từ chối sinh viên', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Không thể từ chối sinh viên', 'error');
  }
}

var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var status = document.getElementById('filter-status').value;
  var url = '/admin/students?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (status) url += '&status=' + encodeURIComponent(status);
  window.location.href = url;
}
