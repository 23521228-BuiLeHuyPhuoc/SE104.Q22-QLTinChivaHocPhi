var editingId = null;
var searchTimer;
var selectedCourseImportFile = null;

function courseEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function syncCredits() {
  var type = document.getElementById('mh-loai').value;
  var lessons = parseInt(document.getElementById('mh-sotiet').value, 10) || 0;
  var divisor = type === 'TH' ? 30 : 15;
  document.getElementById('mh-tc').value = Math.floor(lessons / divisor) || 0;
}

function showLockedCourseFieldMessage(input) {
  if (!input || !input.readOnly) return;
  showToast(input.dataset.lockMessage || 'Trường này không được sửa trực tiếp', 'info');
}

document.addEventListener('DOMContentLoaded', function() {
  var type = document.getElementById('mh-loai');
  var lessons = document.getElementById('mh-sotiet');
  if (type) type.addEventListener('change', syncCredits);
  if (lessons) lessons.addEventListener('input', syncCredits);
  Array.prototype.forEach.call(document.querySelectorAll('.lockable-field'), function(input) {
    input.addEventListener('click', function() { showLockedCourseFieldMessage(input); });
    input.addEventListener('focus', function() { showLockedCourseFieldMessage(input); });
  });
});

function openModal(mode, c) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa môn học' : 'Thêm môn học';
  document.getElementById('mh-ma').readOnly = mode === 'edit';
  document.getElementById('mh-ma').classList.toggle('is-locked', mode === 'edit');

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
    MaKhoa: document.getElementById('mh-makhoa').value,
    LoaiMon: document.getElementById('mh-loai').value,
    SoTiet: parseInt(document.getElementById('mh-sotiet').value, 10),
    MoTa: document.getElementById('mh-mota').value.trim() || null
  };

  if (!data.MaMonHoc || !data.TenMonHoc || !data.MaKhoa || !data.LoaiMon || !Number.isInteger(data.SoTiet) || data.SoTiet <= 0) {
    showToast('Vui lòng nhập đầy đủ thông tin hợp lệ', 'error');
    return;
  }

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

function applyCourseFilters() {
  var params = new URLSearchParams();
  var searchField = document.getElementById('course-search-field').value;
  var search = document.getElementById('search-input').value.trim();
  var faculty = document.getElementById('faculty-filter').value;
  var type = document.getElementById('type-filter').value;
  params.set('page', '1');
  if (searchField) params.set('searchField', searchField);
  if (search) params.set('search', search);
  if (faculty) params.set('MaKhoa', faculty);
  if (type) params.set('LoaiMon', type);
  navigatePageContent('/admin/courses?' + params.toString());
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyCourseFilters, 400);
}

async function exportCourses() {
  var params = new URLSearchParams();
  var searchField = document.getElementById('course-search-field').value;
  var search = document.getElementById('search-input').value.trim();
  var faculty = document.getElementById('faculty-filter').value;
  var type = document.getElementById('type-filter').value;
  if (searchField) params.set('searchField', searchField);
  if (search) params.set('search', search);
  if (faculty) params.set('MaKhoa', faculty);
  if (type) params.set('LoaiMon', type);
  var headers = {};
  var token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  var response = await fetch('/api/courses/export?' + params.toString(), { headers: headers });
  if (!response.ok) {
    showToast('Không thể xuất Excel', 'error');
    return;
  }
  var blob = await response.blob();
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = 'danh-sach-mon-hoc.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function closeCourseDetail() {
  document.getElementById('course-detail-modal').classList.remove('active');
}

async function openCourseDetail(id) {
  var modal = document.getElementById('course-detail-modal');
  var content = document.getElementById('course-detail-content');
  modal.classList.add('active');
  content.textContent = 'Đang tải...';
  try {
    var res = await apiFetch('/api/courses/' + encodeURIComponent(id));
    if (!res.success) throw new Error(res.message || 'Không tải được chi tiết');
    var c = res.data || {};
    content.innerHTML =
      '<div class="detail-grid">' +
        '<div><strong>Mã môn</strong><span>' + courseEscapeHtml(c.MaMonHoc) + '</span></div>' +
        '<div><strong>Tên môn</strong><span>' + courseEscapeHtml(c.TenMonHoc) + '</span></div>' +
        '<div><strong>Khoa</strong><span>' + courseEscapeHtml(c.TenKhoa || c.MaKhoa) + '</span></div>' +
        '<div><strong>Tín chỉ</strong><span>' + Number(c.SoTinChi || 0) + '</span></div>' +
        '<div><strong>Loại môn</strong><span>' + courseEscapeHtml(c.LoaiMon || '-') + '</span></div>' +
        '<div><strong>Số tiết</strong><span>' + courseEscapeHtml(c.SoTiet || '-') + '</span></div>' +
        '<div><strong>Trạng thái</strong><span>' + (c.TrangThai === false ? 'Tạm khóa' : 'Đang dùng') + '</span></div>' +
        '<div><strong>Cập nhật</strong><span>' + courseEscapeHtml(c.NgayCapNhat ? new Date(c.NgayCapNhat).toLocaleDateString('vi-VN') : '-') + '</span></div>' +
      '</div>' +
      '<div class="detail-note">' + courseEscapeHtml(c.MoTa || 'Không có mô tả') + '</div>';
  } catch (error) {
    content.textContent = error.message || 'Không tải được chi tiết';
  }
}

function openCourseImportModal() {
  selectedCourseImportFile = null;
  var input = document.getElementById('course-import-file');
  var result = document.getElementById('course-import-result');
  if (input) input.value = '';
  if (result) {
    result.classList.add('hidden');
    result.innerHTML = '';
  }
  document.getElementById('course-import-modal').classList.add('active');
}

function closeCourseImportModal() {
  document.getElementById('course-import-modal').classList.remove('active');
}

function setCourseImportSaving(isSaving) {
  var button = document.getElementById('course-import-submit');
  if (!button) return;
  button.disabled = !!isSaving;
  button.textContent = isSaving ? 'Đang nhập...' : 'Nhập Excel';
}

function renderCourseImportResults(rows, summary) {
  var result = document.getElementById('course-import-result');
  if (!result) return;
  rows = rows || [];
  result.classList.remove('hidden');
  var html = '<div class="import-summary">Thành công: <strong>' + Number(summary.successCount || 0) + '</strong> | Thất bại: <strong>' + Number(summary.errorCount || 0) + '</strong></div>';
  html += '<div class="table-container"><table class="data-table import-result-table"><thead><tr><th>Dòng</th><th>Mã môn</th><th>Tên môn</th><th>Kết quả</th><th>Chi tiết</th></tr></thead><tbody>';
  if (!rows.length) {
    html += '<tr><td colspan="5"><div class="empty-state">Không có dòng kết quả</div></td></tr>';
  } else {
    rows.forEach(function(row) {
      var ok = row.status === 'success';
      html += '<tr class="' + (ok ? 'import-row-success' : 'import-row-failed') + '">';
      html += '<td>' + courseEscapeHtml(row.row || '-') + '</td>';
      html += '<td class="mono">' + courseEscapeHtml(row.MaMonHoc || '-') + '</td>';
      html += '<td>' + courseEscapeHtml(row.TenMonHoc || '-') + '</td>';
      html += '<td><span class="badge ' + (ok ? 'badge-success' : 'badge-error') + '">' + (ok ? 'Thành công' : 'Thất bại') + '</span></td>';
      html += '<td>' + courseEscapeHtml(row.message || '-') + '</td>';
      html += '</tr>';
    });
  }
  html += '</tbody></table></div>';
  result.innerHTML = html;
}

async function importCoursesFromExcel() {
  var input = document.getElementById('course-import-file');
  selectedCourseImportFile = input && input.files ? input.files[0] : null;
  if (!selectedCourseImportFile) {
    showToast('Vui lòng chọn file Excel', 'error');
    return;
  }

  try {
    setCourseImportSaving(true);
    var formData = new FormData();
    formData.append('file', selectedCourseImportFile);
    var res = await apiFetch('/api/courses/import', { method: 'POST', body: formData });
    if (res.success) {
      var data = res.data || {};
      renderCourseImportResults(data.rows || [], data);
      showToast(res.message || 'Nhập Excel hoàn tất', data.errorCount ? 'info' : 'success');
      if (data.successCount && !data.errorCount) {
        setTimeout(function() { location.reload(); }, 900);
      }
    } else {
      showToast(res.message || 'Không thể nhập Excel', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối khi nhập Excel', 'error');
  } finally {
    setCourseImportSaving(false);
    if (input) input.value = '';
    selectedCourseImportFile = null;
  }
}
