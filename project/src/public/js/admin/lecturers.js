var lecturerEditingId = null;
var lecturerSearchTimer = null;

function applyLecturerFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input');
  var faculty = document.getElementById('filter-faculty');
  var status = document.getElementById('filter-status');

  params.set('page', '1');
  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (faculty && faculty.value) params.set('MaKhoa', faculty.value);
  if (status && status.value) params.set('status', status.value);
  window.location.href = '/admin/lecturers?' + params.toString();
}

function debounceLecturerSearch() {
  clearTimeout(lecturerSearchTimer);
  lecturerSearchTimer = setTimeout(applyLecturerFilters, 400);
}

function openLecturerModal(mode, lecturer) {
  lecturerEditingId = null;
  document.getElementById('lecturer-modal-title').textContent = mode === 'edit' ? 'Sửa giảng viên' : 'Thêm giảng viên';
  document.getElementById('lecturer-ma').disabled = mode === 'edit';

  if (mode === 'edit' && lecturer) {
    lecturerEditingId = lecturer.MaGiangVien;
    document.getElementById('lecturer-ma').value = lecturer.MaGiangVien || '';
    document.getElementById('lecturer-hoten').value = lecturer.HoTen || '';
    document.getElementById('lecturer-hocham').value = lecturer.HocHamHocVi || '';
    document.getElementById('lecturer-khoa').value = lecturer.MaKhoa || '';
    document.getElementById('lecturer-email').value = lecturer.Email || '';
    document.getElementById('lecturer-sdt').value = lecturer.Sdt || '';
    document.getElementById('lecturer-trangthai').value = lecturer.TrangThai === false ? 'false' : 'true';
    document.getElementById('lecturer-mota').value = lecturer.MoTa || '';
  } else {
    document.getElementById('lecturer-form').reset();
    document.getElementById('lecturer-trangthai').value = 'true';
  }

  document.getElementById('lecturer-modal').classList.add('active');
}

function closeLecturerModal() {
  document.getElementById('lecturer-modal').classList.remove('active');
}

async function saveLecturer() {
  var data = {
    MaGiangVien: document.getElementById('lecturer-ma').value.trim(),
    HoTen: document.getElementById('lecturer-hoten').value.trim(),
    HocHamHocVi: document.getElementById('lecturer-hocham').value.trim() || null,
    MaKhoa: document.getElementById('lecturer-khoa').value || null,
    Email: document.getElementById('lecturer-email').value.trim() || null,
    Sdt: document.getElementById('lecturer-sdt').value.trim() || null,
    TrangThai: document.getElementById('lecturer-trangthai').value === 'true',
    MoTa: document.getElementById('lecturer-mota').value.trim() || null
  };

  if (!data.MaGiangVien || !data.HoTen) {
    showToast('Vui lòng nhập mã giảng viên và họ tên', 'error');
    return;
  }

  try {
    var res = lecturerEditingId
      ? await apiFetch('/api/lecturers/' + encodeURIComponent(lecturerEditingId), { method: 'PUT', body: data })
      : await apiFetch('/api/lecturers', { method: 'POST', body: data });

    if (res.success) {
      showToast(res.message || 'Đã lưu giảng viên', 'success');
      closeLecturerModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu giảng viên', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteLecturer(id) {
  if (!confirm('Bạn có chắc muốn xóa giảng viên này?')) return;
  try {
    var res = await apiFetch('/api/lecturers/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Đã xóa giảng viên', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa giảng viên', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}
