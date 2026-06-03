var editingId = null;
var searchTimer = null;
var entityPickerState = { type: null, timer: null };

function classEscapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function classFormatDate(value) {
  if (!value) return '-';
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
}

function getSelectedClassSemester() {
  var filter = document.getElementById('filter-semester');
  return filter ? filter.value : '';
}

function selectedPeriodOrder(selectId) {
  var select = document.getElementById(selectId);
  if (!select || !select.value) return null;
  var option = select.options[select.selectedIndex];
  var order = option ? Number(option.dataset.order) : NaN;
  return Number.isFinite(order) ? order : null;
}

function validatePeriodRange(startSelectId, endSelectId) {
  var startOrder = selectedPeriodOrder(startSelectId);
  var endOrder = selectedPeriodOrder(endSelectId);
  if (startOrder === null || endOrder === null) return true;
  if (startOrder <= endOrder) return true;
  showToast('Tiết bắt đầu phải trước hoặc bằng tiết kết thúc', 'error');
  return false;
}

async function validateScheduleConflict(mode, body) {
  try {
    var payload = Object.assign({ mode: mode }, body);
    var res = await apiFetch('/api/classes/validate-schedule', { method: 'POST', body: payload });
    if (res && res.success) return true;
    showToast((res && res.message) || 'Lịch học bị trùng', 'error');
    return false;
  } catch (e) {
    showToast('Lỗi kết nối khi kiểm tra lịch học', 'error');
    return false;
  }
}

function applyFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input');
  var scope = document.getElementById('filter-search-scope');
  var semester = document.getElementById('filter-semester');
  var status = document.getElementById('filter-open-status');
  var capacitySort = document.getElementById('filter-capacity-sort');

  params.set('page', '1');
  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (scope && scope.value) params.set('searchScope', scope.value);
  if (semester && semester.value) params.set('MaHocKy', semester.value);
  if (status && status.value) params.set('openStatus', status.value);
  if (capacitySort && capacitySort.value) params.set('capacitySort', capacitySort.value);
  window.location.href = '/admin/classes?' + params.toString();
}

function setOpenStatusFilter(value) {
  var status = document.getElementById('filter-open-status');
  if (status) status.value = value || '';
  document.querySelectorAll('#class-open-status-filter .segmented-option').forEach(function(button) {
    button.classList.toggle('active', (button.dataset.value || '') === (value || ''));
  });
  applyFilters();
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 400);
}

function courseOptionLabel(course) {
  return (course.MaMonHoc || '') + ' - ' + (course.TenMonHoc || '');
}

function lecturerOptionLabel(lecturer) {
  var degree = lecturer.HocHamHocVi ? lecturer.HocHamHocVi + ' ' : '';
  var faculty = lecturer.TenKhoa || (lecturer.KHOA && lecturer.KHOA.TenKhoa) || '';
  return (lecturer.MaGiangVien || '') + ' - ' + degree + (lecturer.HoTen || '') + (faculty ? ' (' + faculty + ')' : '');
}

function roomOptionLabel(room) {
  var capacity = room.SucChua ? ' (' + room.SucChua + ')' : '';
  var code = String(room.MaPhong || '').trim();
  var name = String(room.TenPhong || '').trim();
  var label = code && name && name.toLowerCase().indexOf(code.toLowerCase()) < 0
    ? code + ' - ' + name
    : (name || code);
  return label + capacity;
}

function ensureSelectOption(selectId, value, label) {
  var select = document.getElementById(selectId);
  if (!select || !value) return;
  var exists = Array.prototype.some.call(select.options, function(option) {
    return option.value === value;
  });
  if (!exists) select.add(new Option(label || value, value, true, true));
  select.value = value;
}

var entityPickerConfig = {
  course: {
    targetId: 'cl-mamonhoc',
    textId: 'cl-course-picker-text',
    buttonId: 'cl-course-picker',
    title: 'Chọn môn học',
    subtitle: 'Tìm theo mã môn hoặc tên môn học',
    placeholder: 'Nhập mã hoặc tên môn học',
    empty: 'Không tìm thấy môn học phù hợp',
    valueField: 'MaMonHoc',
    label: courseOptionLabel,
    detail: function(course) {
      return [course.TenKhoa || (course.KHOA && course.KHOA.TenKhoa), course.LoaiMon, course.SoTinChi ? course.SoTinChi + ' tín chỉ' : '']
        .filter(Boolean)
        .join(' · ');
    },
    url: function(search) {
      var params = new URLSearchParams();
      params.set('all', 'true');
      params.set('TrangThai', 'true');
      if (search) params.set('search', search);
      return '/api/courses?' + params.toString();
    }
  },
  lecturer: {
    targetId: 'cl-magiangvien',
    textId: 'cl-lecturer-picker-text',
    buttonId: 'cl-lecturer-picker',
    title: 'Chọn giảng viên',
    subtitle: 'Tìm theo mã giảng viên hoặc họ tên',
    placeholder: 'Nhập mã hoặc họ tên giảng viên',
    empty: 'Không tìm thấy giảng viên phù hợp',
    valueField: 'MaGiangVien',
    label: lecturerOptionLabel,
    detail: function(lecturer) {
      return [lecturer.Email, lecturer.TenKhoa || (lecturer.KHOA && lecturer.KHOA.TenKhoa)].filter(Boolean).join(' · ');
    },
    url: function(search) {
      var params = new URLSearchParams();
      params.set('TrangThai', 'true');
      params.set('all', 'true');
      if (search) params.set('search', search);
      return '/api/lecturers?' + params.toString();
    }
  },
  room: {
    targetId: 'cl-maphong',
    textId: 'cl-room-picker-text',
    buttonId: 'cl-room-picker',
    title: 'Chọn phòng',
    subtitle: 'Tìm theo mã phòng, tên phòng hoặc tòa nhà',
    placeholder: 'Nhập mã phòng, tên phòng hoặc tòa nhà',
    empty: 'Không tìm thấy phòng phù hợp',
    valueField: 'MaPhong',
    label: roomOptionLabel,
    detail: function(room) {
      return [room.ToaNha ? 'Tòa ' + room.ToaNha : '', room.LoaiPhong, room.SucChua ? 'Sức chứa ' + room.SucChua : '']
        .filter(Boolean)
        .join(' · ');
    },
    url: function(search) {
      var params = new URLSearchParams();
      params.set('TrangThai', 'true');
      params.set('all', 'true');
      if (search) params.set('search', search);
      return '/api/rooms?' + params.toString();
    }
  }
};

function setPickerDisplay(type, value, label) {
  var config = entityPickerConfig[type];
  if (!config) return;
  var text = document.getElementById(config.textId);
  var button = document.getElementById(config.buttonId);
  if (text) text.textContent = value ? (label || value) : config.title;
  if (button) button.classList.toggle('is-empty', !value);
}

function setPickerValue(type, value, label) {
  var config = entityPickerConfig[type];
  if (!config) return;
  var select = document.getElementById(config.targetId);
  if (!select) return;
  if (value) {
    ensureSelectOption(config.targetId, value, label || value);
    select.value = value;
  } else {
    select.value = '';
  }
  setPickerDisplay(type, value, label);
}

function selectedPickerValue() {
  var config = entityPickerConfig[entityPickerState.type];
  var select = config ? document.getElementById(config.targetId) : null;
  return select ? select.value : '';
}

function openEntityPicker(type) {
  var config = entityPickerConfig[type];
  if (!config) return;

  entityPickerState.type = type;
  document.getElementById('entity-picker-title').textContent = config.title;
  document.getElementById('entity-picker-subtitle').textContent = config.subtitle;
  document.getElementById('entity-picker-search').placeholder = config.placeholder;
  document.getElementById('entity-picker-search').value = '';
  document.getElementById('entity-picker-modal').classList.add('active');
  loadEntityPickerRows('');
  setTimeout(function() {
    var input = document.getElementById('entity-picker-search');
    if (input) input.focus();
  }, 50);
}

function closeEntityPicker() {
  document.getElementById('entity-picker-modal').classList.remove('active');
  entityPickerState.type = null;
}

function renderEntityPickerRows(rows) {
  var config = entityPickerConfig[entityPickerState.type];
  var results = document.getElementById('entity-picker-results');
  var meta = document.getElementById('entity-picker-meta');
  if (!config || !results) return;

  if (meta) meta.textContent = rows.length ? rows.length + ' kết quả' : '';
  if (!rows.length) {
    results.innerHTML = '<div class="empty-state">' + classEscapeHtml(config.empty) + '</div>';
    return;
  }

  var selectedValue = selectedPickerValue();
  results.innerHTML = rows.map(function(row) {
    var value = row[config.valueField] || '';
    var label = config.label(row);
    var detail = config.detail(row);
    return '<button class="entity-picker-option' + (value === selectedValue ? ' is-selected' : '') + '" type="button" data-value="' +
      classEscapeHtml(value) + '" data-label="' + classEscapeHtml(label) + '" onclick="selectEntityPickerOption(this)">' +
      '<span class="entity-picker-title-row">' +
        '<span class="entity-picker-code">' + classEscapeHtml(value) + '</span>' +
        '<span class="entity-picker-name">' + classEscapeHtml(label.replace(value + ' - ', '')) + '</span>' +
      '</span>' +
      '<span class="entity-picker-detail">' + classEscapeHtml(detail || label) + '</span>' +
    '</button>';
  }).join('');
}

async function loadEntityPickerRows(search) {
  var config = entityPickerConfig[entityPickerState.type];
  var results = document.getElementById('entity-picker-results');
  var meta = document.getElementById('entity-picker-meta');
  if (!config || !results) return;

  results.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Đang tải dữ liệu...</span></div>';
  if (meta) meta.textContent = '';
  try {
    var res = await apiFetch(config.url(search));
    var rows = res && res.success && Array.isArray(res.data) ? res.data : [];
    renderEntityPickerRows(rows);
  } catch (e) {
    results.innerHTML = '<div class="empty-state">Không thể tải dữ liệu</div>';
  }
}

function selectEntityPickerOption(button) {
  var type = entityPickerState.type;
  if (!type || !button) return;
  setPickerValue(type, button.dataset.value || '', button.dataset.label || '');
  closeEntityPicker();
}

function classDetailValue(label, value) {
  return '<div><strong>' + classEscapeHtml(label) + '</strong><span>' + classEscapeHtml(value || '-') + '</span></div>';
}

function classDetailSemester(opened) {
  if (!opened) return '-';
  var semester = opened.HOCKY || {};
  var year = semester.NAMHOC && semester.NAMHOC.TenNamHoc ? ' - ' + semester.NAMHOC.TenNamHoc : '';
  return (semester.TenHocKy || opened.MaHocKy || '-') + year;
}

function classDetailScheduleText(schedule) {
  if (!schedule) return '-';
  var day = Number(schedule.ThuTrongTuan) === 1 ? 'Chá»§ nháº­t' : 'Thá»© ' + (schedule.ThuTrongTuan || '-');
  var room = schedule.PHONGHOC ? roomOptionLabel(schedule.PHONGHOC) : (schedule.PhongHoc || schedule.MaPhong || '-');
  return day + ', tiáº¿t ' + (schedule.MaTietBatDau || '-') + '-' + (schedule.MaTietKetThuc || '-') + ', phÃ²ng ' + room;
}

function renderClassDetail(cls) {
  var content = document.getElementById('class-detail-content');
  if (!content) return;
  var openedRows = cls.LOPMO || [];
  var activeOpened = openedRows.find(function(item) { return item.TrangThai !== false; }) || openedRows[0] || null;
  var schedules = activeOpened && activeOpened.LICHHOCLOP ? activeOpened.LICHHOCLOP : [];
  var course = cls.MONHOC || {};
  var lecturer = activeOpened && activeOpened.GIANGVIEN
    ? lecturerOptionLabel(activeOpened.GIANGVIEN)
    : (cls.GIANGVIEN ? lecturerOptionLabel(cls.GIANGVIEN) : '');
  var room = cls.PHONGHOC ? roomOptionLabel(cls.PHONGHOC) : (cls.PhongHoc || cls.MaPhong || '-');
  var registeredCount = activeOpened ? Number(activeOpened.SoLuongDaDangKy || 0) : (cls.CHITIETDANGKY ? cls.CHITIETDANGKY.length : 0);
  var status = activeOpened ? (activeOpened.TrangThai === false ? 'ÄÃ£ Ä‘Ã³ng' : 'Äang má»Ÿ') : 'ChÆ°a má»Ÿ';
  var scheduleRows = schedules.length
    ? schedules.map(function(schedule) {
        return '<li>' + classEscapeHtml(classDetailScheduleText(schedule)) + '</li>';
      }).join('')
    : '<li>ChÆ°a cÃ³ lá»‹ch má»Ÿ lá»›p</li>';

  content.innerHTML =
    '<div class="detail-grid">' +
      classDetailValue('MÃ£ lá»›p', cls.MaLop) +
      classDetailValue('TÃªn lá»›p', cls.TenLop) +
      classDetailValue('MÃ´n há»c', (course.TenMonHoc || cls.MaMonHoc) + (cls.MaMonHoc ? ' (' + cls.MaMonHoc + ')' : '')) +
      classDetailValue('Khoa', course.KHOA && course.KHOA.TenKhoa) +
      classDetailValue('Giáº£ng viÃªn', lecturer || cls.GiangVien) +
      classDetailValue('PhÃ²ng máº·c Ä‘á»‹nh', room) +
      classDetailValue('Há»c ká»³ Ä‘ang má»Ÿ', classDetailSemester(activeOpened)) +
      classDetailValue('Tráº¡ng thÃ¡i', status) +
      classDetailValue('SÄ© sá»‘', registeredCount + ' / ' + (cls.SoLuongToiDa || '-')) +
      classDetailValue('Cáº­p nháº­t', classFormatDate(cls.NgayCapNhat || cls.NgayTao)) +
    '</div>' +
    '<div class="detail-note"><strong>Lá»‹ch há»c</strong><ul class="class-detail-schedules">' + scheduleRows + '</ul></div>';
}

async function openClassDetail(id) {
  if (window.event && window.event.target && window.event.target.closest('button, a')) return;
  var modal = document.getElementById('class-detail-modal');
  var content = document.getElementById('class-detail-content');
  if (!id || !modal || !content) return;
  modal.classList.add('active');
  content.innerHTML = '<div class="empty-state">Äang táº£i thÃ´ng tin lá»›p há»c...</div>';
  try {
    var res = await apiFetch('/api/classes/' + encodeURIComponent(id));
    if (!res || res.success === false) throw new Error((res && res.message) || 'KhÃ´ng thá»ƒ táº£i chi tiáº¿t lá»›p');
    renderClassDetail(res.data || {});
  } catch (error) {
    content.innerHTML = '<div class="empty-state">' + classEscapeHtml(error.message || 'KhÃ´ng thá»ƒ táº£i chi tiáº¿t lá»›p') + '</div>';
  }
}

function closeClassDetail() {
  var modal = document.getElementById('class-detail-modal');
  if (modal) modal.classList.remove('active');
}

function openModal(mode, cl) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa lớp học' : 'Thêm lớp học';
  document.getElementById('cl-malop').disabled = mode === 'edit';

  if (mode === 'edit' && cl) {
    editingId = cl.MaLop;
    document.getElementById('cl-malop').value = cl.MaLop || '';
    document.getElementById('cl-tenlop').value = cl.TenLop || '';
    document.getElementById('cl-thu').value = cl.ThuTrongTuan || '2';
    document.getElementById('cl-tietbd').value = cl.MaTietBatDau || '';
    document.getElementById('cl-tietkt').value = cl.MaTietKetThuc || '';
    setPickerValue('course', cl.MaMonHoc || '', cl.MaMonHoc ? cl.MaMonHoc + ' - ' + (cl.MONHOC && cl.MONHOC.TenMonHoc ? cl.MONHOC.TenMonHoc : '') : '');
    setPickerValue('lecturer', cl.MaGiangVien || '', cl.GIANGVIEN ? lecturerOptionLabel(cl.GIANGVIEN) : (cl.GiangVien || cl.MaGiangVien || ''));
    setPickerValue('room', cl.MaPhong || '', cl.PHONGHOC ? roomOptionLabel(cl.PHONGHOC) : (cl.PhongHoc || cl.MaPhong || ''));
  } else {
    document.getElementById('class-form').reset();
    setPickerValue('course', '', '');
    setPickerValue('lecturer', '', '');
    setPickerValue('room', '', '');
  }

  document.getElementById('class-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('class-modal').classList.remove('active');
}

async function saveClass() {
  var hasAssignment = Boolean(
    document.getElementById('cl-magiangvien').value ||
    document.getElementById('cl-tietbd').value ||
    document.getElementById('cl-tietkt').value ||
    document.getElementById('cl-maphong').value
  );
  var data = {
    MaLop: document.getElementById('cl-malop').value.trim(),
    TenLop: document.getElementById('cl-tenlop').value.trim(),
    MaMonHoc: document.getElementById('cl-mamonhoc').value,
    MaGiangVien: document.getElementById('cl-magiangvien').value || null,
    ThuTrongTuan: hasAssignment ? document.getElementById('cl-thu').value : null,
    MaTietBatDau: document.getElementById('cl-tietbd').value || null,
    MaTietKetThuc: document.getElementById('cl-tietkt').value || null,
    MaPhong: document.getElementById('cl-maphong').value || null
  };

  if (!data.MaLop || !data.TenLop || !data.MaMonHoc) {
    showToast('Vui lòng nhập mã lớp, tên lớp và môn học', 'error');
    return;
    /*
    showToast('Vui lòng nhập đầy đủ lớp, môn học, giảng viên, phòng và lịch học', 'error');
    return;
    */
  }
  if (hasAssignment && (!data.MaGiangVien || !data.ThuTrongTuan || !data.MaTietBatDau || !data.MaTietKetThuc || !data.MaPhong)) {
    showToast('Vui lòng chọn đủ giảng viên, thứ, tiết bắt đầu, tiết kết thúc và phòng', 'error');
    return;
  }
  if (hasAssignment && !validatePeriodRange('cl-tietbd', 'cl-tietkt')) return;
  if (hasAssignment && !(await validateScheduleConflict('catalog', data))) return;

  try {
    var res = editingId
      ? await apiFetch('/api/classes/' + encodeURIComponent(editingId), { method: 'PUT', body: data })
      : await apiFetch('/api/classes', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cập nhật lớp học thành công' : 'Thêm lớp học thành công', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu lớp học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteClass(id) {
  if (!confirm('Bạn có chắc muốn xóa lớp này?')) return;
  try {
    var res = await apiFetch('/api/classes/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa lớp học', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa lớp học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function openClass(classData) {
  if (!classData || !classData.MaLop) {
    showToast('Không xác định được lớp cần mở', 'error');
    return;
  }

  var body = {
    MaLop: classData.MaLop,
    MaHocKy: getSelectedClassSemester() || null,
    MaGiangVien: classData.MaGiangVien,
    ThuTrongTuan: classData.ThuTrongTuan,
    MaTietBatDau: classData.MaTietBatDau,
    MaTietKetThuc: classData.MaTietKetThuc,
    MaPhong: classData.MaPhong,
    GhiChu: null
  };
  if (!body.MaLop || !body.MaGiangVien || !body.ThuTrongTuan || !body.MaTietBatDau || !body.MaTietKetThuc || !body.MaPhong) {
    showToast('Lớp này chưa có đủ giảng viên, phòng và lịch học để mở', 'error');
    return;
  }
  if (!(await validateScheduleConflict('open', body))) return;

  try {
    var res = await apiFetch('/api/classes/open', { method: 'POST', body: body });
    if (res.success) {
      showToast(res.message || 'Mở lớp thành công', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể mở lớp', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function closeOpenedClass(lopMoId) {
  if (!confirm('Bạn có chắc muốn đóng lớp mở này?')) return;
  try {
    var res = await apiFetch('/api/classes/opened/' + encodeURIComponent(lopMoId), { method: 'DELETE' });
    if (res.success) {
      showToast('Đã đóng lớp', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể đóng lớp', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function openStudentsModal(maLop, tenLop) {
  document.getElementById('students-malop').value = maLop || '';
  document.getElementById('students-modal-title').textContent = 'DS sinh viên - ' + (tenLop || maLop || '');
  var semester = document.getElementById('students-mahocky');
  if (semester) semester.value = getSelectedClassSemester() || '';
  document.getElementById('class-students-modal').classList.add('active');
  loadClassStudents();
}

function closeStudentsModal() {
  document.getElementById('class-students-modal').classList.remove('active');
}

async function loadClassStudents() {
  var maLop = document.getElementById('students-malop').value;
  var maHocKy = document.getElementById('students-mahocky').value;
  var body = document.getElementById('students-table-body');
  if (!maLop || !body) return;

  body.innerHTML = '<tr><td colspan="5"><div class="empty-state">Đang tải sinh viên...</div></td></tr>';
  try {
    var url = '/api/classes/' + encodeURIComponent(maLop) + '/students';
    if (maHocKy) url += '?MaHocKy=' + encodeURIComponent(maHocKy);
    var res = await apiFetch(url);
    var rows = res.success && Array.isArray(res.data) ? res.data : [];

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-state">Chưa có sinh viên đăng ký</div></td></tr>';
      return;
    }

    body.innerHTML = rows.map(function(row) {
      return '<tr>' +
        '<td class="mono">' + classEscapeHtml(row.MaSv || '-') + '</td>' +
        '<td>' + classEscapeHtml(row.HoTen || '-') + '</td>' +
        '<td>' + classEscapeHtml(row.TenHocKy || row.MaHocKy || '-') + '</td>' +
        '<td>' + classEscapeHtml(classFormatDate(row.NgayDangKy)) + '</td>' +
        '<td><span class="badge badge-success">' + classEscapeHtml(row.TrangThai || '-') + '</span></td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    body.innerHTML = '<tr><td colspan="5"><div class="empty-state">Không thể tải danh sách sinh viên</div></td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var entitySearch = document.getElementById('entity-picker-search');
  if (entitySearch) {
    entitySearch.addEventListener('input', function() {
      clearTimeout(entityPickerState.timer);
      entityPickerState.timer = setTimeout(function() {
        loadEntityPickerRows(entitySearch.value.trim());
      }, 250);
    });
  }

});
