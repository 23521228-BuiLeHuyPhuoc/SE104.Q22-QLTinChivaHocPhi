var editingCurriculumProgramId = null;
var curriculumProgramSearchTimer = null;
var curriculumCourseSearchTimer = null;
var curriculumCourseLoadToken = 0;

function applyCurriculumProgramFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('cp-search');
  var major = document.getElementById('cp-major');
  var status = document.getElementById('cp-status');

  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (major && major.value) params.set('major', major.value);
  if (status && status.value) params.set('status', status.value);

  var query = params.toString();
  window.location.href = '/admin/curriculum-programs' + (query ? '?' + query : '');
}

function debounceCurriculumProgramSearch() {
  clearTimeout(curriculumProgramSearchTimer);
  curriculumProgramSearchTimer = setTimeout(applyCurriculumProgramFilters, 350);
}

function curriculumCourseOptionLabel(course) {
  if (!course) return '';
  return (course.MaMonHoc || '') + ' - ' + (course.TenMonHoc || '');
}

function appendCurriculumCourseOption(list, value, label) {
  if (!list || !value) return;
  var exists = Array.prototype.some.call(list.options, function(option) {
    return option.value === value;
  });
  if (exists) return;
  var option = document.createElement('option');
  option.value = value;
  option.label = label || value;
  list.appendChild(option);
}

async function loadCurriculumCourseOptions(search, selectedValue, selectedLabel) {
  var list = document.getElementById('cp-course-options');
  if (!list) return;

  var token = ++curriculumCourseLoadToken;
  var params = new URLSearchParams({ all: 'true' });
  if (search && search.trim()) params.set('search', search.trim());

  try {
    var res = await apiFetch('/api/courses?' + params.toString());
    if (token !== curriculumCourseLoadToken) return;
    list.innerHTML = '';
    (res.data || []).forEach(function(course) {
      appendCurriculumCourseOption(list, course.MaMonHoc, curriculumCourseOptionLabel(course));
    });
    if (selectedValue) appendCurriculumCourseOption(list, selectedValue, selectedLabel || selectedValue);
  } catch (e) {
    if (token !== curriculumCourseLoadToken) return;
    list.innerHTML = '';
    showToast('Không tải được danh sách môn học', 'error');
  }
}

function setCurriculumProgramSaving(isSaving) {
  var button = document.getElementById('curriculum-program-save-btn');
  var label = button ? button.querySelector('.curriculum-program-save-label') : null;
  if (!button) return;
  button.disabled = !!isSaving;
  if (label) label.textContent = isSaving ? 'Đang lưu...' : 'Lưu';
}

function openCurriculumProgramModal(mode, row) {
  row = row || {};
  editingCurriculumProgramId = mode === 'edit' && row.id ? row.id : null;

  var modal = document.getElementById('curriculum-program-modal');
  var form = document.getElementById('curriculum-program-form');
  var title = document.getElementById('curriculum-program-modal-title');
  var filterMajor = document.getElementById('cp-major');
  var courseInput = document.getElementById('cp-item-course');

  if (form) form.reset();
  if (title) title.textContent = editingCurriculumProgramId ? 'Sửa môn trong chương trình' : 'Thêm môn vào chương trình';
  setCurriculumProgramSaving(false);

  document.getElementById('cp-item-major').value = row.MaNganh || (filterMajor ? filterMajor.value : '');
  document.getElementById('cp-item-semester').value = row.HocKyDuKien || 1;
  document.getElementById('cp-item-required').value = row.BatBuoc === false ? 'false' : 'true';
  document.getElementById('cp-item-active').value = row.TrangThai === false ? 'false' : 'true';
  document.getElementById('cp-item-note').value = row.GhiChu || '';

  if (courseInput) {
    courseInput.value = row.MaMonHoc || '';
    courseInput.disabled = !!editingCurriculumProgramId;
  }

  loadCurriculumCourseOptions('', row.MaMonHoc || '', row.TenMonHoc ? curriculumCourseOptionLabel(row) : '');
  if (modal) modal.classList.add('active');
}

function closeCurriculumProgramModal() {
  var modal = document.getElementById('curriculum-program-modal');
  if (modal) modal.classList.remove('active');
}

function reloadCurriculumProgramPageAfterSave(body) {
  var params = new URLSearchParams(window.location.search);
  params.delete('search');
  if (body.MaNganh) params.set('major', body.MaNganh);
  if (params.get('status')) params.set('status', body.TrangThai ? 'active' : 'inactive');
  var query = params.toString();
  window.location.href = '/admin/curriculum-programs' + (query ? '?' + query : '');
}

async function saveCurriculumProgramItem() {
  var body = {
    MaNganh: document.getElementById('cp-item-major').value,
    MaMonHoc: document.getElementById('cp-item-course').value.trim().toUpperCase(),
    HocKyDuKien: document.getElementById('cp-item-semester').value,
    BatBuoc: document.getElementById('cp-item-required').value === 'true',
    TrangThai: document.getElementById('cp-item-active').value === 'true',
    GhiChu: document.getElementById('cp-item-note').value.trim()
  };

  if (!body.MaNganh || !body.MaMonHoc || !body.HocKyDuKien) {
    showToast('Vui lòng chọn ngành, môn học và học kỳ', 'error');
    return;
  }

  try {
    setCurriculumProgramSaving(true);
    var url = editingCurriculumProgramId
      ? '/api/majors/curriculum/items/' + encodeURIComponent(editingCurriculumProgramId)
      : '/api/majors/curriculum/items';
    var method = editingCurriculumProgramId ? 'PUT' : 'POST';
    var res = await apiFetch(url, { method: method, body: body });
    if (res.success) {
      showToast(res.message || 'Đã lưu chương trình học', 'success');
      closeCurriculumProgramModal();
      setTimeout(function() { reloadCurriculumProgramPageAfterSave(body); }, 350);
    } else {
      showToast(res.message || 'Không thể lưu chương trình học', 'error');
      setCurriculumProgramSaving(false);
    }
  } catch (e) {
    setCurriculumProgramSaving(false);
    showToast('Lỗi kết nối khi lưu chương trình học', 'error');
  }
}

async function deleteCurriculumProgramItem(id) {
  if (!id || !confirm('Gỡ môn này khỏi chương trình học?')) return;

  try {
    var res = await apiFetch('/api/majors/curriculum/items/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Đã gỡ môn khỏi chương trình học', 'success');
      setTimeout(function() { window.location.reload(); }, 350);
    } else {
      showToast(res.message || 'Không thể gỡ môn khỏi chương trình học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối khi gỡ môn', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var courseInput = document.getElementById('cp-item-course');
  if (courseInput) {
    courseInput.addEventListener('input', function() {
      clearTimeout(curriculumCourseSearchTimer);
      curriculumCourseSearchTimer = setTimeout(function() {
        loadCurriculumCourseOptions(courseInput.value);
      }, 250);
    });

    courseInput.addEventListener('focus', function() {
      var options = document.getElementById('cp-course-options');
      if (options && !options.options.length) loadCurriculumCourseOptions('');
    });
  }

  document.addEventListener('keydown', function(event) {
    var modal = document.getElementById('curriculum-program-modal');
    if (event.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeCurriculumProgramModal();
    }
  });
});
