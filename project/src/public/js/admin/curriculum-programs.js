var editingCurriculumProgramId = null;
var curriculumProgramSearchTimer = null;
var curriculumCourseSearchTimer = null;
var curriculumCourseLoadToken = 0;

function applyCurriculumProgramFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('cp-search');
  var searchField = document.getElementById('cp-search-field');
  var major = document.getElementById('cp-major');
  var status = document.getElementById('cp-status');

  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (searchField && searchField.value) params.set('searchField', searchField.value);
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

function curriculumEscapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setCurriculumCourseSelection(courseOrCode, label) {
  var hidden = document.getElementById('cp-item-course');
  var title = document.getElementById('cp-item-course-title');
  var subtitle = document.getElementById('cp-item-course-subtitle');
  var course = typeof courseOrCode === 'object' && courseOrCode ? courseOrCode : null;
  var code = course ? course.MaMonHoc : (courseOrCode || '');
  var name = course ? course.TenMonHoc : (label || '');
  if (hidden) hidden.value = code || '';
  if (title) title.textContent = code ? (name || code) : 'Chưa chọn môn học';
  if (subtitle) {
    subtitle.textContent = code
      ? [code, course && course.KHOA ? course.KHOA.TenKhoa : '', course && course.SoTinChi ? course.SoTinChi + ' TC' : ''].filter(Boolean).join(' · ')
      : 'Bấm tìm kiếm để chọn môn học';
  }
}

function setCurriculumProgramLockedState(locked) {
  var major = document.getElementById('cp-item-major');
  var picker = document.getElementById('cp-item-course-picker');
  var summary = document.getElementById('cp-item-course-summary');
  if (major) {
    major.dataset.locked = locked ? 'true' : 'false';
    major.classList.toggle('is-locked', !!locked);
  }
  [picker, summary].forEach(function(element) {
    if (element) element.classList.toggle('is-locked', !!locked);
  });
}

function notifyCurriculumLockedField() {
  showToast('Không được phép sửa ngành và môn học. Hãy gỡ dòng này và thêm lại nếu chọn sai.', 'error');
}

function openCurriculumCoursePicker() {
  if (editingCurriculumProgramId) {
    notifyCurriculumLockedField();
    return;
  }
  var modal = document.getElementById('curriculum-course-picker-modal');
  var input = document.getElementById('curriculum-course-picker-search');
  if (!modal) return;
  if (input) input.value = '';
  modal.classList.add('active');
  loadCurriculumCoursePickerRows();
  setTimeout(function() { if (input) input.focus(); }, 50);
}

function closeCurriculumCoursePicker() {
  var modal = document.getElementById('curriculum-course-picker-modal');
  if (modal) modal.classList.remove('active');
}

async function loadCurriculumCoursePickerRows() {
  var body = document.getElementById('curriculum-course-picker-body');
  var input = document.getElementById('curriculum-course-picker-search');
  if (!body) return;
  var params = new URLSearchParams({ all: 'true', TrangThai: 'true' });
  if (input && input.value.trim()) params.set('search', input.value.trim());
  body.innerHTML = '<tr><td colspan="5"><div class="empty-state">Đang tải môn học...</div></td></tr>';
  try {
    var res = await apiFetch('/api/courses?' + params.toString());
    var rows = res && res.success && Array.isArray(res.data) ? res.data : [];
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-state">Không tìm thấy môn học phù hợp</div></td></tr>';
      return;
    }
    body.innerHTML = rows.map(function(course) {
      var record = curriculumEscapeHtml(JSON.stringify(course));
      return '<tr>' +
        '<td class="mono">' + curriculumEscapeHtml(course.MaMonHoc || '-') + '</td>' +
        '<td>' + curriculumEscapeHtml(course.TenMonHoc || '-') + '</td>' +
        '<td>' + curriculumEscapeHtml((course.KHOA && course.KHOA.TenKhoa) || course.TenKhoa || '-') + '</td>' +
        '<td>' + curriculumEscapeHtml(course.SoTinChi || '-') + '</td>' +
        '<td><button class="btn btn-sm btn-primary" type="button" data-course="' + record + '" onclick="selectCurriculumCourseFromPicker(this)">Chọn</button></td>' +
      '</tr>';
    }).join('');
  } catch (error) {
    body.innerHTML = '<tr><td colspan="5"><div class="empty-state">Không thể tải danh sách môn học</div></td></tr>';
  }
}

function selectCurriculumCourseFromPicker(button) {
  if (!button) return;
  try {
    var course = JSON.parse(button.dataset.course || '{}');
    setCurriculumCourseSelection(course);
    closeCurriculumCoursePicker();
  } catch (error) {
    showToast('Không thể chọn môn học này', 'error');
  }
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

  if (form) form.reset();
  if (title) title.textContent = editingCurriculumProgramId ? 'Sửa môn trong chương trình' : 'Thêm môn vào chương trình';
  setCurriculumProgramSaving(false);
  setCurriculumProgramLockedState(!!editingCurriculumProgramId);

  document.getElementById('cp-item-major').value = row.MaNganh || (filterMajor ? filterMajor.value : '');
  document.getElementById('cp-item-semester').value = row.HocKyDuKien || 1;
  document.getElementById('cp-item-active').value = row.TrangThai === false ? 'false' : 'true';
  document.getElementById('cp-item-note').value = row.GhiChu || '';
  setCurriculumCourseSelection(row.MaMonHoc || '', row.TenMonHoc ? curriculumCourseOptionLabel(row) : '');
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
  var majorSelect = document.getElementById('cp-item-major');
  if (majorSelect) {
    ['mousedown', 'keydown'].forEach(function(eventName) {
      majorSelect.addEventListener(eventName, function(event) {
        if (majorSelect.dataset.locked === 'true') {
          event.preventDefault();
          notifyCurriculumLockedField();
        }
      });
    });
  }

  var pickerSearch = document.getElementById('curriculum-course-picker-search');
  if (pickerSearch) {
    pickerSearch.addEventListener('input', function() {
      clearTimeout(curriculumCourseSearchTimer);
      curriculumCourseSearchTimer = setTimeout(loadCurriculumCoursePickerRows, 250);
    });
  }

  document.addEventListener('keydown', function(event) {
    var modal = document.getElementById('curriculum-program-modal');
    var pickerModal = document.getElementById('curriculum-course-picker-modal');
    if (event.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeCurriculumProgramModal();
    }
    if (event.key === 'Escape' && pickerModal && pickerModal.classList.contains('active')) {
      closeCurriculumCoursePicker();
    }
  });
});
