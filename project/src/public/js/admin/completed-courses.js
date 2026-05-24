var searchTimer;
var editMode = false;
var editId = null;

function resultLabel(value) {
  return value === 'qua_mon' ? 'Qua môn' : 'Rớt';
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var hk = document.getElementById('filter-hocky').value;
  var result = document.getElementById('filter-result').value;
  var url = '/admin/completed-courses?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (hk) url += '&MaHocKy=' + encodeURIComponent(hk);
  if (result) url += '&KetQua=' + encodeURIComponent(result);
  window.location.href = url;
}

function openModal(mode, data) {
  editMode = mode === 'edit';
  editId = editMode ? data.id : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa môn đã học' : 'Thêm môn đã học';
  document.getElementById('cc-masv').value = editMode ? (data.MaSv || (data.SINHVIEN ? data.SINHVIEN.MaSv : '')) : '';
  document.getElementById('cc-mamonhoc').value = editMode ? (data.MaMonHoc || (data.MONHOC ? data.MONHOC.MaMonHoc : '')) : '';
  document.getElementById('cc-mahocky').value = editMode ? (data.MaHocKy || (data.HOCKY ? data.HOCKY.MaHocKy : '')) : '';
  document.getElementById('cc-malop').value = editMode ? (data.MaLop || '') : '';
  document.getElementById('cc-lanhoc').value = editMode ? (data.LanHoc || 1) : 1;
  document.getElementById('cc-ketqua').value = editMode ? (data.KetQua || 'qua_mon') : 'qua_mon';
  document.getElementById('cc-ghichu').value = editMode ? (data.GhiChu || '') : '';
  document.getElementById('completed-course-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('completed-course-modal').classList.remove('active');
}

async function saveCompletedCourse() {
  var body = {
    MaSv: document.getElementById('cc-masv').value.trim(),
    MaMonHoc: document.getElementById('cc-mamonhoc').value.trim(),
    MaHocKy: document.getElementById('cc-mahocky').value,
    MaLop: document.getElementById('cc-malop').value.trim() || null,
    LanHoc: document.getElementById('cc-lanhoc').value || 1,
    KetQua: document.getElementById('cc-ketqua').value,
    GhiChu: document.getElementById('cc-ghichu').value.trim()
  };
  if (!body.MaSv || !body.MaMonHoc || !body.MaHocKy || !body.KetQua) {
    showToast('Vui lòng nhập MSSV, mã môn, học kỳ và kết quả', 'error');
    return;
  }
  var url = editMode ? '/api/completed-courses/' + editId : '/api/completed-courses';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

async function deleteCompletedCourse(id) {
  if (!confirm('Xóa môn đã học này?')) return;
  var res = await apiFetch('/api/completed-courses/' + id, { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}
