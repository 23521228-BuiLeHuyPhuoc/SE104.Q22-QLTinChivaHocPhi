var editingPrereqId = null;
var prereqSearchTimer = null;
var prereqCoursePickerTimer = null;
var prereqPickerTarget = 'course';
var prereqPickerRows = [];
var selectedPrereqCourse = null;
var selectedPrereqRequiredCourse = null;

function prereqEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function prereqCourseLabel(course) {
  if (!course) return '';
  return (course.MaMonHoc || '') + ' - ' + (course.TenMonHoc || '');
}

function conditionTypeLabel(type) {
  return type === 'tien_quyet' ? 'Tiên quyết' : 'Học trước';
}

function setPrereqCourse(target, course) {
  var isRequired = target === 'required';
  var input = document.getElementById(isRequired ? 'prereq-required-course' : 'prereq-course');
  var summary = document.getElementById(isRequired ? 'prereq-required-summary' : 'prereq-course-summary');
  if (isRequired) selectedPrereqRequiredCourse = course || null;
  else selectedPrereqCourse = course || null;

  if (input) input.value = course ? course.MaMonHoc || '' : '';
  if (!summary) return;
  if (!course) {
    summary.innerHTML = '<strong>' + (isRequired ? 'Chưa chọn môn điều kiện' : 'Chưa chọn môn học') + '</strong><small>Tìm theo mã hoặc tên môn học</small>';
    return;
  }
  summary.innerHTML =
    '<strong>' + prereqEscapeHtml(prereqCourseLabel(course)) + '</strong>' +
    '<small>' + prereqEscapeHtml((course.LoaiMon || '-') + ' | ' + (course.TenKhoa || course.MaKhoa || '-')) + '</small>';
}

function openPrereqModal(mode, row) {
  editingPrereqId = null;
  document.getElementById('prereq-modal-title').textContent = mode === 'edit' ? 'Sửa ràng buộc' : 'Thêm ràng buộc';
  document.getElementById('prereq-form').reset();
  document.getElementById('prereq-type').value = 'tien_quyet';
  document.getElementById('prereq-status').value = 'true';
  setPrereqCourse('course', null);
  setPrereqCourse('required', null);

  if (mode === 'edit' && row) {
    editingPrereqId = row.id;
    setPrereqCourse('course', row.MONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC || { MaMonHoc: row.MaMonHoc, TenMonHoc: row.MaMonHoc });
    setPrereqCourse('required', row.MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC || { MaMonHoc: row.MaMonDieuKien, TenMonHoc: row.MaMonDieuKien });
    document.getElementById('prereq-type').value = row.LoaiDieuKien || 'hoc_truoc';
    document.getElementById('prereq-status').value = row.TrangThai === false ? 'false' : 'true';
    document.getElementById('prereq-note').value = row.MoTa || '';
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
  if (!data.MaMonHoc || !data.MaMonDieuKien) {
    showToast('Vui lòng chọn môn học và môn điều kiện', 'error');
    return;
  }
  if (data.MaMonHoc === data.MaMonDieuKien) {
    showToast('Không thể chọn trùng môn học', 'error');
    return;
  }

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
  var searchField = document.getElementById('prereq-search-field').value;
  var type = document.getElementById('type-filter').value;
  var params = new URLSearchParams({ page: '1' });
  if (searchField) params.set('searchField', searchField);
  if (search) params.set('search', search);
  if (type) params.set('LoaiDieuKien', type);
  window.location.href = '/admin/prerequisites?' + params.toString();
}

function debouncePrereqSearch() {
  clearTimeout(prereqSearchTimer);
  prereqSearchTimer = setTimeout(applyPrereqFilters, 400);
}

function openPrereqCoursePicker(target) {
  prereqPickerTarget = target === 'required' ? 'required' : 'course';
  var title = document.getElementById('prereq-picker-title');
  var search = document.getElementById('prereq-course-picker-search');
  if (title) title.textContent = prereqPickerTarget === 'required' ? 'Chọn môn điều kiện' : 'Chọn môn học';
  if (search) search.value = '';
  document.getElementById('prereq-course-picker-modal').classList.add('active');
  loadPrereqCoursePickerResults();
}

function closePrereqCoursePicker() {
  document.getElementById('prereq-course-picker-modal').classList.remove('active');
}

function debouncePrereqCoursePickerSearch() {
  clearTimeout(prereqCoursePickerTimer);
  prereqCoursePickerTimer = setTimeout(loadPrereqCoursePickerResults, 300);
}

async function loadPrereqCoursePickerResults() {
  var tbody = document.getElementById('prereq-course-picker-results');
  var search = document.getElementById('prereq-course-picker-search');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Đang tải...</div></td></tr>';
  try {
    var params = new URLSearchParams({ all: 'true', searchField: 'all' });
    if (search && search.value.trim()) params.set('search', search.value.trim());
    var res = await apiFetch('/api/courses?' + params.toString());
    if (!res.success) throw new Error(res.message || 'Không tải được danh sách môn học');
    prereqPickerRows = res.data || [];
    if (!prereqPickerRows.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Không có môn học phù hợp</div></td></tr>';
      return;
    }

    var otherValue = prereqPickerTarget === 'required'
      ? document.getElementById('prereq-course').value
      : document.getElementById('prereq-required-course').value;
    tbody.innerHTML = prereqPickerRows.map(function(course, index) {
      var duplicated = otherValue && otherValue === course.MaMonHoc;
      return '<tr>' +
        '<td class="mono">' + prereqEscapeHtml(course.MaMonHoc) + '</td>' +
        '<td>' + prereqEscapeHtml(course.TenMonHoc) + '</td>' +
        '<td>' + prereqEscapeHtml(course.LoaiMon || '-') + '</td>' +
        '<td>' + prereqEscapeHtml(course.TenKhoa || course.MaKhoa || '-') + '</td>' +
        '<td><button class="btn btn-sm btn-primary" type="button" data-index="' + index + '" ' + (duplicated ? 'disabled' : '') + ' onclick="selectPrereqCourseFromPicker(Number(this.dataset.index))">Chọn</button></td>' +
      '</tr>';
    }).join('');
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">' + prereqEscapeHtml(error.message || 'Không tải được môn học') + '</div></td></tr>';
  }
}

function selectPrereqCourseFromPicker(index) {
  var course = prereqPickerRows[index];
  if (!course) return;
  setPrereqCourse(prereqPickerTarget, course);
  closePrereqCoursePicker();
}

function closePrereqDetail() {
  document.getElementById('prereq-detail-modal').classList.remove('active');
}

async function openPrereqDetail(id) {
  var modal = document.getElementById('prereq-detail-modal');
  var content = document.getElementById('prereq-detail-content');
  modal.classList.add('active');
  content.textContent = 'Đang tải...';
  try {
    var res = await apiFetch('/api/prerequisites/' + encodeURIComponent(id));
    if (!res.success) throw new Error(res.message || 'Không tải được chi tiết');
    var row = res.data || {};
    var course = row.MONHOC_DIEUKIENMONHOC_MaMonHocToMONHOC || {};
    var required = row.MONHOC_DIEUKIENMONHOC_MaMonDieuKienToMONHOC || {};
    content.innerHTML =
      '<div class="detail-grid">' +
        '<div><strong>Môn học</strong><span>' + prereqEscapeHtml(prereqCourseLabel(course) || row.MaMonHoc) + '</span></div>' +
        '<div><strong>Môn điều kiện</strong><span>' + prereqEscapeHtml(prereqCourseLabel(required) || row.MaMonDieuKien) + '</span></div>' +
        '<div><strong>Loại điều kiện</strong><span>' + prereqEscapeHtml(conditionTypeLabel(row.LoaiDieuKien)) + '</span></div>' +
        '<div><strong>Trạng thái</strong><span>' + (row.TrangThai === false ? 'Tạm khóa' : 'Đang dùng') + '</span></div>' +
        '<div><strong>Cập nhật</strong><span>' + prereqEscapeHtml(row.NgayCapNhat ? new Date(row.NgayCapNhat).toLocaleDateString('vi-VN') : '-') + '</span></div>' +
      '</div>' +
      '<div class="detail-note">' + prereqEscapeHtml(row.MoTa || 'Không có mô tả') + '</div>';
  } catch (error) {
    content.textContent = error.message || 'Không tải được chi tiết';
  }
}

document.addEventListener('keydown', function(event) {
  if (event.key !== 'Escape') return;
  ['prereq-course-picker-modal', 'prereq-detail-modal', 'prereq-modal'].forEach(function(id) {
    var modal = document.getElementById(id);
    if (modal && modal.classList.contains('active')) modal.classList.remove('active');
  });
});
