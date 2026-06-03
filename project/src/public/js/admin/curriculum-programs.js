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
  if (title) title.textContent = code ? (name || code) : 'ChÆ°a chá»n mÃ´n há»c';
  if (subtitle) {
    subtitle.textContent = code
      ? [code, course && course.KHOA ? course.KHOA.TenKhoa : '', course && course.SoTinChi ? course.SoTinChi + ' TC' : ''].filter(Boolean).join(' Â· ')
      : 'Báº¥m tÃ¬m kiáº¿m Ä‘á»ƒ chá»n mÃ´n há»c';
  }
}

function setCurriculumProgramLockedState(locked) {
  var major = document.getElementById('cp-item-major');
  var picker = document.getElementById('cp-item-course-picker');
  var summary = document.getElementById('cp-item-course-summary');
  if (major) {
    major.disabled = !!locked;
    major.classList.toggle('is-locked', !!locked);
  }
  [picker, summary].forEach(function(element) {
    if (element) element.classList.toggle('is-locked', !!locked);
  });
}

function notifyCurriculumLockedField() {
  showToast('NgÃ nh vÃ  mÃ´n há»c khÃ´ng Ä‘Æ°á»£c phÃ©p sá»­a. HÃ£y gá»¡ dÃ²ng nÃ y vÃ  thÃªm láº¡i náº¿u chá»n sai.', 'error');
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
  body.innerHTML = '<tr><td colspan="5"><div class="empty-state">Äang táº£i mÃ´n há»c...</div></td></tr>';
  try {
    var res = await apiFetch('/api/courses?' + params.toString());
    var rows = res && res.success && Array.isArray(res.data) ? res.data : [];
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-state">KhÃ´ng tÃ¬m tháº¥y mÃ´n há»c phÃ¹ há»£p</div></td></tr>';
      return;
    }
    body.innerHTML = rows.map(function(course) {
      var record = curriculumEscapeHtml(JSON.stringify(course));
      return '<tr>' +
        '<td class="mono">' + curriculumEscapeHtml(course.MaMonHoc || '-') + '</td>' +
        '<td>' + curriculumEscapeHtml(course.TenMonHoc || '-') + '</td>' +
        '<td>' + curriculumEscapeHtml((course.KHOA && course.KHOA.TenKhoa) || course.TenKhoa || '-') + '</td>' +
        '<td>' + curriculumEscapeHtml(course.SoTinChi || '-') + '</td>' +
        '<td><button class="btn btn-sm btn-primary" type="button" data-course="' + record + '" onclick="selectCurriculumCourseFromPicker(this)">Chá»n</button></td>' +
      '</tr>';
    }).join('');
  } catch (error) {
    body.innerHTML = '<tr><td colspan="5"><div class="empty-state">KhÃ´ng thá»ƒ táº£i danh sÃ¡ch mÃ´n há»c</div></td></tr>';
  }
}

function selectCurriculumCourseFromPicker(button) {
  if (!button) return;
  try {
    var course = JSON.parse(button.dataset.course || '{}');
    setCurriculumCourseSelection(course);
    closeCurriculumCoursePicker();
  } catch (error) {
    showToast('KhÃ´ng thá»ƒ chá»n mÃ´n há»c nÃ y', 'error');
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
