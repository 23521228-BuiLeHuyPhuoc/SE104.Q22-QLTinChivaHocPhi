var editingId = null;
var searchTimer = null;
var courseSearchTimer = null;
var classLecturerSearchTimer = null;
var classRoomSearchTimer = null;
var lecturerSearchTimer = null;
var openRoomSearchTimer = null;
var scheduleRoomSearchTimer = null;

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

function applyFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input');
  var course = document.getElementById('filter-course');
  var semester = document.getElementById('filter-semester');
  var status = document.getElementById('filter-open-status');

  params.set('page', '1');
  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (course && course.value) params.set('MaMonHoc', course.value);
  if (semester && semester.value) params.set('MaHocKy', semester.value);
  if (status && status.value) params.set('openStatus', status.value);
  window.location.href = '/admin/classes?' + params.toString();
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 400);
}

async function loadCourseOptions(search, selectedValue, selectedLabel) {
  var select = document.getElementById('cl-mamonhoc');
  if (!select) return;

  try {
    var url = '/api/courses';
    if (search) url += '?search=' + encodeURIComponent(search);
    var res = await apiFetch(url);
    var rows = res && res.success && Array.isArray(res.data) ? res.data : [];
    var hasSelected = false;
    var html = '<option value="">Chọn môn học</option>';

    rows.forEach(function(course) {
      var value = course.MaMonHoc || '';
      if (!value) return;
      if (value === selectedValue) hasSelected = true;
      html += '<option value="' + classEscapeHtml(value) + '"' + (value === selectedValue ? ' selected' : '') + '>' +
        classEscapeHtml(value + ' - ' + (course.TenMonHoc || '')) +
        '</option>';
    });

    if (selectedValue && !hasSelected) {
      html += '<option value="' + classEscapeHtml(selectedValue) + '" selected>' +
        classEscapeHtml(selectedLabel || selectedValue) +
        '</option>';
    }

    select.innerHTML = html;
  } catch (e) {
    showToast('Không thể tải danh sách môn học', 'error');
  }
}

function lecturerOptionLabel(lecturer) {
  var degree = lecturer.HocHamHocVi ? lecturer.HocHamHocVi + ' ' : '';
  var faculty = lecturer.TenKhoa || (lecturer.KHOA && lecturer.KHOA.TenKhoa) || '';
  return (lecturer.MaGiangVien || '') + ' - ' + degree + (lecturer.HoTen || '') + (faculty ? ' (' + faculty + ')' : '');
}

async function loadLecturerOptions(selectId, search, selectedValue, selectedLabel) {
  var select = document.getElementById(selectId);
  if (!select) return;

  try {
    var params = new URLSearchParams();
    params.set('TrangThai', 'true');
    if (search) params.set('search', search);
    var url = '/api/lecturers?' + params.toString();
    var res = await apiFetch(url);
    var rows = res && res.success && Array.isArray(res.data) ? res.data : [];
    var hasSelected = false;
    var html = '<option value="">Chọn giảng viên</option>';

    rows.forEach(function(lecturer) {
      var value = lecturer.MaGiangVien || '';
      if (!value) return;
      if (value === selectedValue) hasSelected = true;
      html += '<option value="' + classEscapeHtml(value) + '"' + (value === selectedValue ? ' selected' : '') + '>' +
        classEscapeHtml(lecturerOptionLabel(lecturer)) +
        '</option>';
    });

    if (selectedValue && !hasSelected) {
      html += '<option value="' + classEscapeHtml(selectedValue) + '" selected>' +
        classEscapeHtml(selectedLabel || selectedValue) +
        '</option>';
    }

    select.innerHTML = html;
  } catch (e) {
    showToast('Không thể tải danh sách giảng viên', 'error');
  }
}

function roomOptionLabel(room) {
  var capacity = room.SucChua ? ' (' + room.SucChua + ')' : '';
  return (room.MaPhong || '') + ' - ' + (room.TenPhong || '') + capacity;
}

async function loadRoomOptions(selectId, search, selectedValue, selectedLabel) {
  var select = document.getElementById(selectId);
  if (!select) return;

  try {
    var params = new URLSearchParams();
    params.set('TrangThai', 'true');
    if (search) params.set('search', search);
    var url = '/api/rooms?' + params.toString();
    var res = await apiFetch(url);
    var rows = res && res.success && Array.isArray(res.data) ? res.data : [];
    var hasSelected = false;
    var html = '<option value="">Chọn phòng học</option>';

    rows.forEach(function(room) {
      var value = room.MaPhong || '';
      if (!value) return;
      if (value === selectedValue) hasSelected = true;
      html += '<option value="' + classEscapeHtml(value) + '"' + (value === selectedValue ? ' selected' : '') + '>' +
        classEscapeHtml(roomOptionLabel(room)) +
        '</option>';
    });

    if (selectedValue && !hasSelected) {
      html += '<option value="' + classEscapeHtml(selectedValue) + '" selected>' +
        classEscapeHtml(selectedLabel || selectedValue) +
        '</option>';
    }

    select.innerHTML = html;
  } catch (e) {
    showToast('Không thể tải danh sách phòng học', 'error');
  }
}

function classSetValue(id, value) {
  var element = document.getElementById(id);
  if (element) element.value = value || '';
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

function openModal(mode, cl) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa lớp học' : 'Thêm lớp học';
  document.getElementById('cl-malop').disabled = mode === 'edit';

  if (mode === 'edit' && cl) {
    editingId = cl.MaLop;
    document.getElementById('cl-malop').value = cl.MaLop || '';
    document.getElementById('cl-tenlop').value = cl.TenLop || '';
    document.getElementById('cl-course-search').value = cl.MONHOC && cl.MONHOC.TenMonHoc ? cl.MONHOC.TenMonHoc : '';
    document.getElementById('cl-lecturer-search').value = cl.GIANGVIEN
      ? lecturerOptionLabel(cl.GIANGVIEN)
      : (cl.GiangVien || cl.MaGiangVien || '');
    document.getElementById('cl-thu').value = cl.ThuTrongTuan || '2';
    document.getElementById('cl-tietbd').value = cl.MaTietBatDau || '';
    document.getElementById('cl-tietkt').value = cl.MaTietKetThuc || '';
    document.getElementById('cl-room-search').value = cl.PHONGHOC
      ? roomOptionLabel(cl.PHONGHOC)
      : (cl.PhongHoc || cl.MaPhong || '');
    ensureSelectOption('cl-magiangvien', cl.MaGiangVien || '', cl.GiangVien || cl.MaGiangVien || '');
    ensureSelectOption('cl-maphong', cl.MaPhong || '', cl.PhongHoc || cl.MaPhong || '');
    loadCourseOptions('', cl.MaMonHoc || '', cl.MaMonHoc ? cl.MaMonHoc + ' - ' + (cl.MONHOC && cl.MONHOC.TenMonHoc ? cl.MONHOC.TenMonHoc : '') : '');
    loadLecturerOptions('cl-magiangvien', '', cl.MaGiangVien || '', cl.GiangVien || cl.MaGiangVien || '');
    loadRoomOptions('cl-maphong', '', cl.MaPhong || '', cl.PhongHoc || cl.MaPhong || '');
  } else {
    document.getElementById('class-form').reset();
    loadCourseOptions('', '', '');
    loadLecturerOptions('cl-magiangvien', '', '', '');
    loadRoomOptions('cl-maphong', '', '', '');
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
    showToast('Vui long nhap ma lop, ten lop va mon hoc', 'error');
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

async function openClassModal(maLop) {
  var classData = typeof maLop === 'object' && maLop ? maLop : null;
  var classId = classData ? classData.MaLop : maLop;
  document.getElementById('open-malop').value = classId || '';
  document.getElementById('open-lecturer-search').value = '';
  document.getElementById('open-magiangvien').value = '';
  document.getElementById('open-thu').value = '2';
  document.getElementById('open-tietbd').value = '';
  document.getElementById('open-tietkt').value = '';
  document.getElementById('open-room-search').value = '';
  document.getElementById('open-maphong').value = '';
  document.getElementById('open-ghichu').value = '';
  var semester = document.getElementById('open-mahocky');
  if (semester) semester.value = getSelectedClassSemester() || semester.value;
  loadLecturerOptions('open-magiangvien', '', '', '');
  loadRoomOptions('open-maphong', '', '', '');
  document.getElementById('class-open-modal').classList.add('active');
  if (!classData && classId) {
    try {
      var res = await apiFetch('/api/classes/' + encodeURIComponent(classId));
      if (res.success) classData = res.data;
    } catch (e) {}
  }
  if (classData) {
    document.getElementById('open-lecturer-search').value = classData.GiangVienDisplay || classData.GiangVien || '';
    document.getElementById('open-thu').value = classData.ThuTrongTuan || '2';
    document.getElementById('open-tietbd').value = classData.MaTietBatDau || '';
    document.getElementById('open-tietkt').value = classData.MaTietKetThuc || '';
    document.getElementById('open-room-search').value = classData.PhongHocDisplay || classData.PhongHoc || classData.MaPhong || '';
    loadLecturerOptions('open-magiangvien', '', classData.MaGiangVien || '', classData.GiangVienDisplay || classData.GiangVien || classData.MaGiangVien || '');
    loadRoomOptions('open-maphong', '', classData.MaPhong || '', classData.PhongHocDisplay || classData.PhongHoc || classData.MaPhong || '');
  }
}

function closeOpenClassModal() {
  document.getElementById('class-open-modal').classList.remove('active');
}

async function saveOpenClass() {
  var body = {
    MaLop: document.getElementById('open-malop').value,
    MaHocKy: document.getElementById('open-mahocky').value,
    MaGiangVien: document.getElementById('open-magiangvien').value,
    ThuTrongTuan: document.getElementById('open-thu').value,
    MaTietBatDau: document.getElementById('open-tietbd').value,
    MaTietKetThuc: document.getElementById('open-tietkt').value,
    MaPhong: document.getElementById('open-maphong').value,
    GhiChu: document.getElementById('open-ghichu').value.trim() || null
  };
  if (!body.MaLop || !body.MaHocKy || !body.MaGiangVien || !body.ThuTrongTuan || !body.MaTietBatDau || !body.MaTietKetThuc || !body.MaPhong) {
    showToast('Vui lòng chọn học kỳ, giảng viên, phòng và lịch học', 'error');
    return;
  }

  try {
    var res = await apiFetch('/api/classes/open', { method: 'POST', body: body });
    if (res.success) {
      showToast(res.message || 'Mở lớp thành công', 'success');
      closeOpenClassModal();
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

function openScheduleModal(maLop, tenLop) {
  document.getElementById('schedule-malop').value = maLop || '';
  document.getElementById('schedule-modal-title').textContent = 'Lịch học - ' + (tenLop || maLop || '');
  resetScheduleForm();
  loadRoomOptions('schedule-maphong', '', '', '');
  var semester = document.getElementById('schedule-mahocky');
  if (semester) semester.value = getSelectedClassSemester() || semester.value;
  document.getElementById('class-schedule-modal').classList.add('active');
  loadClassSchedules();
}

function closeScheduleModal() {
  document.getElementById('class-schedule-modal').classList.remove('active');
}

function resetScheduleForm() {
  document.getElementById('schedule-id').value = '';
  document.getElementById('schedule-thu').value = '2';
  document.getElementById('schedule-tietbd').value = '';
  document.getElementById('schedule-tietkt').value = '';
  document.getElementById('schedule-room-search').value = '';
  document.getElementById('schedule-maphong').value = '';
  document.getElementById('schedule-ghichu').value = '';
}

function weekdayText(value) {
  var day = Number(value);
  if (day === 1) return 'Chủ nhật';
  if (day >= 2 && day <= 7) return 'Thứ ' + day;
  return value || '-';
}

function periodText(schedule) {
  var start = schedule.TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC;
  var end = schedule.TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC;
  var startText = start && start.TenTiet ? start.TenTiet : schedule.MaTietBatDau;
  var endText = end && end.TenTiet ? end.TenTiet : schedule.MaTietKetThuc;
  return startText === endText ? startText : startText + ' - ' + endText;
}

function scheduleRoomText(schedule) {
  if (schedule.PHONGHOC) return roomOptionLabel(schedule.PHONGHOC);
  return schedule.PhongHoc || schedule.MaPhong || '-';
}

async function loadClassSchedules() {
  var maLop = document.getElementById('schedule-malop').value;
  var maHocKy = document.getElementById('schedule-mahocky').value;
  var body = document.getElementById('schedule-table-body');
  if (!maLop || !body) return;

  body.innerHTML = '<tr><td colspan="6"><div class="empty-state">Đang tải lịch học...</div></td></tr>';
  try {
    var url = '/api/classes/' + encodeURIComponent(maLop) + '/schedules';
    if (maHocKy) url += '?MaHocKy=' + encodeURIComponent(maHocKy);
    var res = await apiFetch(url);
    var rows = [];
    if (res.success && Array.isArray(res.data)) {
      res.data.forEach(function(opened) {
        (opened.LICHHOCLOP || []).forEach(function(schedule) {
          rows.push({ opened: opened, schedule: schedule });
        });
      });
    }

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6"><div class="empty-state">Chưa có lịch học</div></td></tr>';
      return;
    }

    body.innerHTML = rows.map(function(item) {
      var schedule = item.schedule;
      var opened = item.opened;
      return '<tr>' +
        '<td>' + classEscapeHtml(opened.HOCKY && opened.HOCKY.TenHocKy ? opened.HOCKY.TenHocKy : opened.MaHocKy) + '</td>' +
        '<td>' + classEscapeHtml(weekdayText(schedule.ThuTrongTuan)) + '</td>' +
        '<td>' + classEscapeHtml(periodText(schedule)) + '</td>' +
        '<td>' + classEscapeHtml(scheduleRoomText(schedule)) + '</td>' +
        '<td>' + classEscapeHtml(schedule.GhiChu || '-') + '</td>' +
        '<td class="table-actions">' +
          '<button class="btn btn-sm btn-outline" type="button" data-id="' + schedule.id + '" data-mahocky="' + classEscapeHtml(opened.MaHocKy) + '" data-thu="' + schedule.ThuTrongTuan + '" data-tietbd="' + classEscapeHtml(schedule.MaTietBatDau) + '" data-tietkt="' + classEscapeHtml(schedule.MaTietKetThuc) + '" data-maphong="' + classEscapeHtml(schedule.MaPhong || '') + '" data-phonglabel="' + classEscapeHtml(scheduleRoomText(schedule)) + '" data-ghichu="' + classEscapeHtml(schedule.GhiChu || '') + '" onclick="editSchedule(this)">Sửa</button>' +
          '<button class="btn btn-sm btn-danger" type="button" onclick="deleteSchedule(' + schedule.id + ')">Xóa</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    body.innerHTML = '<tr><td colspan="6"><div class="empty-state">Không thể tải lịch học</div></td></tr>';
  }
}

function editSchedule(button) {
  document.getElementById('schedule-id').value = button.dataset.id || '';
  document.getElementById('schedule-mahocky').value = button.dataset.mahocky || '';
  document.getElementById('schedule-thu').value = button.dataset.thu || '2';
  document.getElementById('schedule-tietbd').value = button.dataset.tietbd || '';
  document.getElementById('schedule-tietkt').value = button.dataset.tietkt || '';
  document.getElementById('schedule-room-search').value = button.dataset.phonglabel || '';
  loadRoomOptions('schedule-maphong', '', button.dataset.maphong || '', button.dataset.phonglabel || button.dataset.maphong || '');
  document.getElementById('schedule-ghichu').value = button.dataset.ghichu || '';
}

async function saveClassSchedule() {
  var maLop = document.getElementById('schedule-malop').value;
  var body = {
    id: document.getElementById('schedule-id').value || null,
    MaHocKy: document.getElementById('schedule-mahocky').value,
    ThuTrongTuan: document.getElementById('schedule-thu').value,
    MaTietBatDau: document.getElementById('schedule-tietbd').value,
    MaTietKetThuc: document.getElementById('schedule-tietkt').value,
    MaPhong: document.getElementById('schedule-maphong').value || null,
    GhiChu: document.getElementById('schedule-ghichu').value.trim() || null
  };

  if (!maLop || !body.MaHocKy || !body.ThuTrongTuan || !body.MaTietBatDau || !body.MaTietKetThuc || !body.MaPhong) {
    showToast('Vui lòng nhập đủ học kỳ, thứ, tiết học và phòng', 'error');
    return;
  }

  try {
    var res = await apiFetch('/api/classes/' + encodeURIComponent(maLop) + '/schedules', { method: 'POST', body: body });
    if (res.success) {
      showToast('Đã lưu lịch học', 'success');
      resetScheduleForm();
      loadClassSchedules();
    } else {
      showToast(res.message || 'Không thể lưu lịch học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteSchedule(scheduleId) {
  var maLop = document.getElementById('schedule-malop').value;
  if (!maLop || !confirm('Bạn có chắc muốn xóa lịch học này?')) return;
  try {
    var res = await apiFetch('/api/classes/' + encodeURIComponent(maLop) + '/schedules/' + encodeURIComponent(scheduleId), { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa lịch học', 'success');
      loadClassSchedules();
    } else {
      showToast(res.message || 'Không thể xóa lịch học', 'error');
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
  var courseSearch = document.getElementById('cl-course-search');
  if (courseSearch) {
    courseSearch.addEventListener('input', function() {
      clearTimeout(courseSearchTimer);
      courseSearchTimer = setTimeout(function() {
        loadCourseOptions(courseSearch.value.trim(), document.getElementById('cl-mamonhoc').value, '');
      }, 300);
    });
  }

  var classLecturerSearch = document.getElementById('cl-lecturer-search');
  if (classLecturerSearch) {
    classLecturerSearch.addEventListener('input', function() {
      clearTimeout(classLecturerSearchTimer);
      classLecturerSearchTimer = setTimeout(function() {
        loadLecturerOptions('cl-magiangvien', classLecturerSearch.value.trim(), document.getElementById('cl-magiangvien').value, '');
      }, 300);
    });
  }

  var classRoomSearch = document.getElementById('cl-room-search');
  if (classRoomSearch) {
    classRoomSearch.addEventListener('input', function() {
      clearTimeout(classRoomSearchTimer);
      classRoomSearchTimer = setTimeout(function() {
        loadRoomOptions('cl-maphong', classRoomSearch.value.trim(), document.getElementById('cl-maphong').value, '');
      }, 300);
    });
  }

  var lecturerSearch = document.getElementById('open-lecturer-search');
  if (lecturerSearch) {
    lecturerSearch.addEventListener('input', function() {
      clearTimeout(lecturerSearchTimer);
      lecturerSearchTimer = setTimeout(function() {
        loadLecturerOptions('open-magiangvien', lecturerSearch.value.trim(), document.getElementById('open-magiangvien').value, '');
      }, 300);
    });
  }

  var openRoomSearch = document.getElementById('open-room-search');
  if (openRoomSearch) {
    openRoomSearch.addEventListener('input', function() {
      clearTimeout(openRoomSearchTimer);
      openRoomSearchTimer = setTimeout(function() {
        loadRoomOptions('open-maphong', openRoomSearch.value.trim(), document.getElementById('open-maphong').value, '');
      }, 300);
    });
  }

  var scheduleRoomSearch = document.getElementById('schedule-room-search');
  if (scheduleRoomSearch) {
    scheduleRoomSearch.addEventListener('input', function() {
      clearTimeout(scheduleRoomSearchTimer);
      scheduleRoomSearchTimer = setTimeout(function() {
        loadRoomOptions('schedule-maphong', scheduleRoomSearch.value.trim(), document.getElementById('schedule-maphong').value, '');
      }, 300);
    });
  }
});
