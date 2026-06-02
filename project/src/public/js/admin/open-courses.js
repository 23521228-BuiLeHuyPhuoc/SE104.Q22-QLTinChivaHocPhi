var editingOpenCourseId = null;
var editingOpenCourseRecord = null;
var openCourseSearchTimer = null;
var openCourseLoadToken = 0;

function openCourseOptionLabel(course) {
  if (!course) return '';
  return (course.MaMonHoc || '') + ' - ' + (course.TenMonHoc || '');
}

function setOpenCourseSelectMessage(message, disabled) {
  var select = document.getElementById('oc-mamonhoc');
  if (!select) return;
  select.innerHTML = '';
  select.add(new Option(message, ''));
  select.disabled = !!disabled;
}

function ensureOpenCourseOption(value, label) {
  var select = document.getElementById('oc-mamonhoc');
  if (!select || !value) return;
  var exists = Array.prototype.some.call(select.options, function(option) {
    return option.value === value;
  });
  if (!exists) select.add(new Option(label || value, value, true, true));
  select.value = value;
}

function renderAvailableOpenCourseOptions(courses, selectedValue, selectedLabel) {
  var select = document.getElementById('oc-mamonhoc');
  if (!select) return;

  select.innerHTML = '';
  select.add(new Option(courses.length ? 'Chọn môn học đang hoạt động' : 'Không còn môn học phù hợp', ''));
  courses.forEach(function(course) {
    select.add(new Option(openCourseOptionLabel(course), course.MaMonHoc));
  });
  if (selectedValue) ensureOpenCourseOption(selectedValue, selectedLabel);
  select.value = selectedValue || '';
  select.disabled = courses.length === 0 && !selectedValue;
}

async function loadAvailableOpenCourseOptions(selectedValue, selectedLabel) {
  var semester = document.getElementById('oc-hocky');
  var selectedSemester = semester ? semester.value : '';
  if (editingOpenCourseId) {
    openCourseLoadToken += 1;
    ensureOpenCourseOption(selectedValue, selectedLabel);
    var editSelect = document.getElementById('oc-mamonhoc');
    if (editSelect) editSelect.disabled = false;
    return;
  }

  if (!selectedSemester) {
    openCourseLoadToken += 1;
    setOpenCourseSelectMessage('Chọn học kỳ trước', true);
    return;
  }

  var token = ++openCourseLoadToken;
  setOpenCourseSelectMessage('Đang tải danh sách môn học...', true);

  try {
    var params = new URLSearchParams({ all: 'true', MaHocKy: selectedSemester });
    var faculty = document.getElementById('oc-filter-khoa');
    if (faculty && faculty.value) params.set('MaKhoa', faculty.value);
    var res = await apiFetch('/api/open-courses/available?' + params.toString());
    if (token !== openCourseLoadToken) return;
    if (res && res.success) {
      renderAvailableOpenCourseOptions(res.data || [], selectedValue, selectedLabel);
    } else {
      setOpenCourseSelectMessage('Không tải được danh sách môn học', true);
      showToast((res && res.message) || 'Không tải được danh sách môn học', 'error');
    }
  } catch (e) {
    if (token !== openCourseLoadToken) return;
    setOpenCourseSelectMessage('Không tải được danh sách môn học', true);
    showToast('Lỗi kết nối khi tải danh sách môn học', 'error');
  }
}

function setOpenCourseSaving(isSaving) {
  var button = document.getElementById('open-course-save-btn');
  var label = button ? button.querySelector('.open-course-save-label') : null;
  if (!button) return;
  button.disabled = !!isSaving;
  if (label) label.textContent = isSaving ? 'Đang lưu...' : 'Lưu';
}

function applyOpenCourseFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('oc-search');
  var semester = document.getElementById('oc-filter-hocky');
  var faculty = document.getElementById('oc-filter-khoa');
  var status = document.getElementById('oc-filter-trangthai');

  params.set('page', '1');
  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (semester && semester.value) params.set('MaHocKy', semester.value);
  if (faculty && faculty.value) params.set('MaKhoa', faculty.value);
  if (status && status.value) params.set('TrangThai', status.value);
  window.location.href = '/admin/open-courses?' + params.toString();
}

function debounceOpenCourseSearch() {
  clearTimeout(openCourseSearchTimer);
  openCourseSearchTimer = setTimeout(applyOpenCourseFilters, 350);
}

function openCourseModal(mode, row) {
  openCourseLoadToken += 1;
  editingOpenCourseId = mode === 'edit' && row ? row.id : null;
  editingOpenCourseRecord = editingOpenCourseId ? row : null;
  document.getElementById('open-course-modal-title').textContent = editingOpenCourseId ? 'Sửa môn học mở' : 'Thêm môn học mở';
  document.getElementById('open-course-form').reset();
  document.getElementById('oc-trangthai').value = 'true';
  setOpenCourseSaving(false);

  if (editingOpenCourseId) {
    document.getElementById('oc-hocky').value = row.MaHocKy || '';
    document.getElementById('oc-trangthai').value = row.TrangThai === false ? 'false' : 'true';
    document.getElementById('oc-ghichu').value = row.GhiChu || '';
    loadAvailableOpenCourseOptions(row.MaMonHoc || '', openCourseOptionLabel(row));
  } else {
    var filterSemester = document.getElementById('oc-filter-hocky');
    if (filterSemester && filterSemester.value) document.getElementById('oc-hocky').value = filterSemester.value;
    loadAvailableOpenCourseOptions();
  }

  document.getElementById('open-course-modal').classList.add('active');
}

function closeOpenCourseModal() {
  document.getElementById('open-course-modal').classList.remove('active');
}

async function saveOpenCourse() {
  var data = {
    MaHocKy: document.getElementById('oc-hocky').value,
    MaMonHoc: document.getElementById('oc-mamonhoc').value,
    TrangThai: document.getElementById('oc-trangthai').value === 'true',
    GhiChu: document.getElementById('oc-ghichu').value.trim()
  };

  if (!data.MaHocKy || !data.MaMonHoc) {
    showToast('Vui lòng chọn học kỳ và môn học', 'error');
    return;
  }

  try {
    setOpenCourseSaving(true);
    var url = editingOpenCourseId ? '/api/open-courses/' + encodeURIComponent(editingOpenCourseId) : '/api/open-courses';
    var method = editingOpenCourseId ? 'PUT' : 'POST';
    var res = await apiFetch(url, { method: method, body: data });
    if (res.success) {
      showToast(res.message || 'Đã lưu môn học mở', 'success');
      closeOpenCourseModal();
      setTimeout(function() { window.location.reload(); }, 400);
    } else {
      showToast(res.message || 'Không thể lưu môn học mở', 'error');
      setOpenCourseSaving(false);
    }
  } catch (e) {
    setOpenCourseSaving(false);
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteOpenCourse(id) {
  if (!id || !confirm('Bạn có chắc muốn xóa môn học mở này?')) return;
  try {
    var res = await apiFetch('/api/open-courses/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Đã xóa môn học mở', 'success');
      setTimeout(function() { window.location.reload(); }, 400);
    } else {
      showToast(res.message || 'Không thể xóa môn học mở', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var semester = document.getElementById('oc-hocky');
  if (semester) {
    semester.addEventListener('change', function() {
      loadAvailableOpenCourseOptions(
        editingOpenCourseRecord ? editingOpenCourseRecord.MaMonHoc : '',
        editingOpenCourseRecord ? openCourseOptionLabel(editingOpenCourseRecord) : ''
      );
    });
  }

  document.addEventListener('keydown', function(event) {
    var modal = document.getElementById('open-course-modal');
    if (event.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeOpenCourseModal();
    }
  });
});
