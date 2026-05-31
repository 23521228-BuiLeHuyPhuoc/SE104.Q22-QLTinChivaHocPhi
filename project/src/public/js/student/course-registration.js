var currentStudent = null;
var availablePage = 1;
var semesterOptionsById = {};

function courseEscapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function registrationBadgeClass(type) {
  if (type === 'hoc_lai') return 'badge-warning';
  if (type === 'hoc_cai_thien') return 'badge-info';
  if (type === 'hoc_he') return 'badge-secondary';
  return 'badge-success';
}

async function ensureStudent() {
  if (currentStudent) return currentStudent;
  var meRes = await apiFetch('/api/auth/me');
  if (meRes.success && meRes.data.student) currentStudent = meRes.data.student;
  return currentStudent;
}

function getSemesterWindow(item) {
  return item && item.RegistrationWindow ? item.RegistrationWindow : null;
}

function getSelectedSemesterOption() {
  var select = document.getElementById('semester-input');
  return select && select.value ? semesterOptionsById[select.value] : null;
}

function getSemesterWindowMessage(item) {
  var state = getSemesterWindow(item);
  if (!state) return '';
  if (state.isOpen) return 'Đợt đăng ký học phần đang mở';
  return state.message || item.LyDoKhongTheDangKy || 'Học kỳ này hiện chưa cho phép đăng ký học phần';
}

function renderRegistrationWindowMessage() {
  var messageBox = document.getElementById('registration-window-message');
  if (!messageBox) return;

  var selected = getSelectedSemesterOption();
  var message = getSemesterWindowMessage(selected);
  if (!message) {
    messageBox.classList.add('hidden');
    messageBox.textContent = '';
    return;
  }

  messageBox.textContent = message;
  messageBox.classList.toggle('text-error', !(getSemesterWindow(selected) || {}).isOpen);
  messageBox.classList.remove('hidden');
}

function renderSemesterOptions(semesters) {
  var semesterInput = document.getElementById('semester-input');
  var label = document.getElementById('semester-label');
  if (!semesterInput) return;
  semesterOptionsById = {};

  var selected = null;
  (semesters || []).forEach(function(item) {
    var yearName = item.NAMHOC ? item.NAMHOC.TenNamHoc : '';
    var windowState = getSemesterWindow(item);
    var suffix = windowState
      ? (windowState.isOpen ? ' - đang mở ĐK' : ' - ' + (windowState.message || 'chưa mở ĐK'))
      : '';
    item.DisplayLabel = item.TenHocKy + (yearName ? ' - ' + yearName : '') + suffix;
    semesterOptionsById[item.MaHocKy] = item;
  });
  if (semesters && semesters.length) {
    var firstOpen = semesters.find(function(item) {
      var state = getSemesterWindow(item);
      return state && state.isOpen;
    });
    selected = firstOpen || semesters[0];
    semesterInput.value = selected.MaHocKy;
  } else {
    semesterInput.value = '';
  }
  if (label) {
    label.textContent = selected ? selected.DisplayLabel : 'Chưa có học kỳ đăng ký';
    label.classList.toggle('text-error', Boolean(selected && getSemesterWindow(selected) && !getSemesterWindow(selected).isOpen));
  }
  renderRegistrationWindowMessage();
}

function courseField(label, value) {
  return '<div class="available-course-field">' +
    '<span class="available-course-label">' + courseEscapeHtml(label) + '</span>' +
    '<span class="available-course-value">' + courseEscapeHtml(value || '-') + '</span>' +
  '</div>';
}

function renderAvailableCourseCard(c) {
  var max = Number(c.SoLuongToiDa || 0);
  var registered = Number(c.SoLuongDaDangKy || 0);
  var remaining = Math.max(max - registered, 0);
  var canRegister = remaining > 0;

  return '<article class="available-course-card">' +
    '<div class="available-course-main">' +
      '<div class="available-course-topline">' +
        '<span class="available-course-code mono">' + courseEscapeHtml(c.MaLop || '-') + '</span>' +
        '<span class="badge ' + registrationBadgeClass(c.LoaiDangKy) + '">' + courseEscapeHtml(c.LoaiDangKyLabel || 'Học mới') + '</span>' +
      '</div>' +
      '<div>' +
        '<div class="available-course-title">' + courseEscapeHtml(c.TenMonHoc || '-') + '</div>' +
        '<div class="available-course-faculty">' + courseEscapeHtml(c.TenKhoa || '') + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="available-course-details">' +
      courseField('Tín chỉ', c.SoTinChi || '-') +
      courseField('Giảng viên', c.GiangVien || '-') +
      courseField('Lịch học', c.LichHoc || '-') +
      courseField('Phòng', c.PhongHoc || '-') +
    '</div>' +
    '<div class="available-course-action">' +
      '<div>' +
        '<div class="available-course-price">' + formatCurrency(c.ThanhTienDuKien || 0) + '</div>' +
        '<div class="available-course-seats">' + registered + ' / ' + (max || '-') + ' đã đăng ký</div>' +
      '</div>' +
      (canRegister
        ? '<button class="btn btn-sm btn-primary" type="button" data-register-course data-malop="' + courseEscapeHtml(c.MaLop || '') + '" data-mahocky="' + courseEscapeHtml(c.MaHocKy || '') + '">Đăng ký</button>'
        : '<span class="badge badge-error">Hết chỗ</span>') +
    '</div>' +
  '</article>';
}

function renderAvailablePagination(meta) {
  var nav = document.getElementById('available-pagination');
  if (!nav) return;
  var totalPages = Number(meta && meta.totalPages || 0);
  var current = Number(meta && meta.page || 1);
  if (totalPages <= 1) {
    nav.style.display = 'none';
    nav.innerHTML = '';
    return;
  }
  nav.style.display = '';
  var html = '';
  if (current > 1) html += '<button type="button" onclick="loadAvailableCourses(' + (current - 1) + ')">Trước</button>';
  for (var i = 1; i <= totalPages; i += 1) {
    html += '<button type="button" class="' + (i === current ? 'active' : '') + '" onclick="loadAvailableCourses(' + i + ')">' + i + '</button>';
  }
  if (current < totalPages) html += '<button type="button" onclick="loadAvailableCourses(' + (current + 1) + ')">Sau</button>';
  nav.innerHTML = html;
}

async function initializeRegistrationPage() {
  try {
    await ensureStudent();
    var options = await apiFetch('/api/semesters/registration-options').catch(function() { return null; });
    if (options && options.success) {
      renderSemesterOptions(options.data || []);
    } else {
      var active = await apiFetch('/api/semesters/active').catch(function() { return null; });
      if (active && active.success && active.data) renderSemesterOptions([active.data]);
    }
    if (document.getElementById('semester-input').value) loadAvailableCourses(1);
  } catch (e) {}
}

async function loadAvailableCourses(page) {
  availablePage = page || 1;
  var semester = document.getElementById('semester-input').value.trim();
  var search = document.getElementById('course-search').value.trim();
  var empty = document.getElementById('available-empty');
  var loading = document.getElementById('loading');
  var list = document.getElementById('available-courses');
  var count = document.getElementById('available-count');

  if (!semester) {
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    empty.textContent = 'Vui lòng chọn học kỳ';
    if (count) count.textContent = '';
    renderAvailablePagination({});
    return;
  }

  renderRegistrationWindowMessage();
  var selectedSemester = getSelectedSemesterOption();
  var selectedWindow = getSemesterWindow(selectedSemester);
  if (selectedWindow && !selectedWindow.isOpen) {
    loading.classList.add('hidden');
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    empty.textContent = getSemesterWindowMessage(selectedSemester);
    if (count) count.textContent = '';
    renderAvailablePagination({});
    return;
  }

  loading.classList.remove('hidden');
  list.classList.add('hidden');
  empty.classList.add('hidden');

  try {
    var url = '/api/registrations/available?MaHocKy=' + encodeURIComponent(semester) + '&page=' + availablePage;
    if (search) url += '&search=' + encodeURIComponent(search);
    var res = await apiFetch(url);

    loading.classList.add('hidden');
    if (!res.success) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      empty.textContent = res.message || 'Không thể tải danh sách lớp mở';
      if (count) count.textContent = '';
      renderAvailablePagination({});
      return;
    }

    renderAvailablePagination(res.pagination || {});
    if (count) {
      var total = res.pagination && Number(res.pagination.total || res.pagination.totalItems || 0);
      count.textContent = total ? total + ' bản ghi' : ((res.data || []).length + ' bản ghi');
    }

    if (res.data && res.data.length > 0) {
      list.innerHTML = res.data.map(renderAvailableCourseCard).join('');
      list.classList.remove('hidden');
    } else {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      empty.textContent = 'Học kỳ này đang mở đăng ký nhưng chưa có lớp mở phù hợp.';
    }
  } catch (e) {
    loading.classList.add('hidden');
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    empty.textContent = 'Lỗi tải dữ liệu';
    if (count) count.textContent = '';
    renderAvailablePagination({});
  }
}

async function registerCourse(maLop, maHocKy) {
  var student = await ensureStudent();
  if (!student) {
    showToast('Không xác định được sinh viên', 'error');
    return;
  }
  if (!confirm('Bạn có chắc muốn đăng ký lớp này?')) return;

  try {
    var res = await apiFetch('/api/registrations', {
      method: 'POST',
      body: { MaSv: student.MaSv, MaHocKy: maHocKy, MaLop: maLop }
    });

    if (res.success) {
      showToast('Đăng ký thành công', 'success');
      loadAvailableCourses(availablePage);
    } else {
      showToast(res.message || 'Không thể đăng ký', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var search = document.getElementById('course-search');
  var semester = document.getElementById('semester-input');
  var list = document.getElementById('available-courses');
  if (search) {
    search.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') loadAvailableCourses(1);
    });
  }
  if (semester) {
    semester.addEventListener('change', function() {
      renderRegistrationWindowMessage();
      loadAvailableCourses(1);
    });
  }
  if (list) {
    list.addEventListener('click', function(event) {
      var button = event.target.closest('[data-register-course]');
      if (!button) return;
      registerCourse(button.dataset.malop, button.dataset.mahocky);
    });
  }
  initializeRegistrationPage();
});
