var currentStudent = null;
var availablePage = 1;
var semesterOptionsById = {};
var searchTimer = null;

var COURSE_SEARCH_PLACEHOLDERS = {
  course: 'Nhập mã hoặc tên môn học',
  lecturer: 'Nhập mã hoặc tên giảng viên',
  class: 'Nhập mã hoặc tên lớp'
};

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

  var params = new URLSearchParams(window.location.search);
  var requestedSemester = params.get('MaHocKy') || '';
  var selected = null;

  (semesters || []).forEach(function(item) {
    var yearName = item.NAMHOC ? item.NAMHOC.TenNamHoc : (item.TenNamHoc || '');
    var windowState = getSemesterWindow(item);
    var suffix = windowState
      ? (windowState.isOpen ? ' - đang mở ĐK' : ' - ' + (windowState.message || 'chưa mở ĐK'))
      : '';
    item.DisplayLabel = item.TenHocKy + (yearName ? ' - ' + yearName : '') + suffix;
    semesterOptionsById[item.MaHocKy] = item;
  });

  if (semesters && semesters.length) {
    var fromUrl = semesters.find(function(item) { return item.MaHocKy === requestedSemester; });
    var firstOpen = semesters.find(function(item) {
      var state = getSemesterWindow(item);
      return state && state.isOpen;
    });
    selected = fromUrl || firstOpen || semesters[0];
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

function renderSeatStatus(max, registered, remaining) {
  if (!max) return '';
  if (remaining > 0 && remaining < 5) return '<span class="badge badge-error available-course-seat-badge">Sắp hết</span>';
  return '';
}

function renderAvailableCourseCard(c) {
  var max = Number(c.SoLuongToiDa || 0);
  var registered = Number(c.SoLuongDaDangKy || 0);
  var remaining = max ? Math.max(max - registered, 0) : 0;
  var canRegister = max > 0 && remaining > 0 && c.CanDangKy !== false;
  var blockedLabel = remaining > 0 && c.CanDangKy === false ? 'Đã thu HP' : 'Hết chỗ';
  var blockedTitle = c.LyDoKhongTheDangKy ? ' title="' + courseEscapeHtml(c.LyDoKhongTheDangKy) + '"' : '';
  var seatStatus = renderSeatStatus(max, registered, remaining);
  var seatsText = max
    ? registered + ' / ' + max + ' đã đăng ký' + (remaining > 0 ? ' · Còn ' + remaining + ' chỗ' : '')
    : registered + ' đã đăng ký';

  return '<article class="available-course-card">' +
    '<div class="available-course-main">' +
      '<div class="available-course-topline">' +
        '<span class="available-course-code mono">' + courseEscapeHtml(c.MaLop || '-') + '</span>' +
        '<span class="badge ' + registrationBadgeClass(c.LoaiDangKy) + '">' + courseEscapeHtml(c.LoaiDangKyLabel || 'Học mới') + '</span>' +
        (c.LoaiMon ? '<span class="badge badge-secondary">' + courseEscapeHtml(c.LoaiMon) + '</span>' : '') +
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
      '<div class="available-course-action-meta">' +
        '<div class="available-course-seats">' + courseEscapeHtml(seatsText) + '</div>' +
        seatStatus +
      '</div>' +
      (canRegister
        ? '<button class="btn btn-sm btn-primary" type="button" data-register-course data-malop="' + courseEscapeHtml(c.MaLop || '') + '" data-mahocky="' + courseEscapeHtml(c.MaHocKy || '') + '">Đăng ký</button>'
        : '<span class="badge badge-error"' + blockedTitle + '>' + blockedLabel + '</span>') +
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

function setFilterValue(id, value) {
  var element = document.getElementById(id);
  if (element) element.value = value || '';
}

function getSearchScope() {
  var scope = document.getElementById('course-search-scope');
  var value = scope ? scope.value : 'course';
  return COURSE_SEARCH_PLACEHOLDERS[value] ? value : 'course';
}

function updateSearchPlaceholder() {
  var input = document.getElementById('course-search');
  if (input) input.placeholder = COURSE_SEARCH_PLACEHOLDERS[getSearchScope()] || COURSE_SEARCH_PLACEHOLDERS.course;
}

function applyFiltersFromUrl() {
  var params = new URLSearchParams(window.location.search);
  var scope = params.get('searchScope') || 'course';
  setFilterValue('course-search-scope', COURSE_SEARCH_PLACEHOLDERS[scope] ? scope : 'course');
  setFilterValue('course-search', params.get('search') || '');
  setFilterValue('filter-course-type', params.get('LoaiMon') || '');
  setFilterValue('filter-weekday', params.get('ThuTrongTuan') || '');
  setFilterValue('filter-period-start', params.get('MaTietBatDau') || '');
  setFilterValue('filter-period-end', params.get('MaTietKetThuc') || '');
  updateSearchPlaceholder();
}

function getSelectedPeriodOrder(selectId) {
  var select = document.getElementById(selectId);
  if (!select || !select.value) return null;
  var option = select.options[select.selectedIndex];
  var order = option ? Number(option.dataset.order) : NaN;
  return Number.isFinite(order) ? order : null;
}

function validatePeriodFilter() {
  var startOrder = getSelectedPeriodOrder('filter-period-start');
  var endOrder = getSelectedPeriodOrder('filter-period-end');
  if (startOrder === null || endOrder === null || startOrder <= endOrder) return true;
  showToast('Tiết bắt đầu phải trước hoặc bằng tiết kết thúc', 'error');
  return false;
}

function getFilterValues() {
  return {
    searchScope: getSearchScope(),
    search: (document.getElementById('course-search') || {}).value || '',
    LoaiMon: (document.getElementById('filter-course-type') || {}).value || '',
    ThuTrongTuan: (document.getElementById('filter-weekday') || {}).value || '',
    MaTietBatDau: (document.getElementById('filter-period-start') || {}).value || '',
    MaTietKetThuc: (document.getElementById('filter-period-end') || {}).value || ''
  };
}

function buildAvailableParams(page, semester) {
  var filters = getFilterValues();
  var params = new URLSearchParams();
  if (semester) params.set('MaHocKy', semester);
  params.set('page', String(page || 1));
  params.set('searchScope', filters.searchScope);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.LoaiMon) params.set('LoaiMon', filters.LoaiMon);
  if (filters.ThuTrongTuan) params.set('ThuTrongTuan', filters.ThuTrongTuan);
  if (filters.MaTietBatDau) params.set('MaTietBatDau', filters.MaTietBatDau);
  if (filters.MaTietKetThuc) params.set('MaTietKetThuc', filters.MaTietKetThuc);
  return params;
}

function syncFilterUrl(page) {
  var semester = (document.getElementById('semester-input') || {}).value || '';
  var params = buildAvailableParams(page || 1, semester.trim());
  var nextUrl = window.location.pathname + '?' + params.toString();
  window.history.replaceState({}, '', nextUrl);
}

function debounceAvailableCourses() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { loadAvailableCourses(1); }, 350);
}

async function loadPeriods() {
  try {
    var res = await apiFetch('/api/periods?TrangThai=true');
    if (!res || !res.success) return;
    var periods = res.data || [];
    ['filter-period-start', 'filter-period-end'].forEach(function(selectId) {
      var select = document.getElementById(selectId);
      if (!select) return;
      var current = select.value;
      select.innerHTML = '<option value="">Tất cả</option>';
      periods.forEach(function(period) {
        var label = period.TenTiet || period.MaTiet;
        var option = new Option(label, period.MaTiet);
        option.dataset.order = period.ThuTu || '';
        select.add(option);
      });
      select.value = current;
    });
    applyFiltersFromUrl();
  } catch (e) {}
}

function renderCreditSummary(summary) {
  var element = document.getElementById('registered-credit-summary');
  if (!element) return;
  if (!summary) {
    element.textContent = 'Đã đăng ký: -- tín chỉ / Max -- tín chỉ';
    element.removeAttribute('title');
    return;
  }
  var credits = Number(summary.registeredCredits || summary.totalCredits || 0);
  var max = Number(summary.maxCredits || 0);
  element.textContent = 'Đã đăng ký: ' + credits + ' tín chỉ' + (max ? ' / Max ' + max + ' tín chỉ' : '');
  if (summary.creditLimitReason) element.title = summary.creditLimitReason;
  else element.removeAttribute('title');
}

async function loadRegisteredCreditSummary(semester) {
  try {
    var student = await ensureStudent();
    if (!student || !semester) {
      renderCreditSummary(null);
      return;
    }
    var params = new URLSearchParams();
    params.set('MaHocKy', semester);
    params.set('page', '1');
    var res = await apiFetch('/api/registrations/student/' + encodeURIComponent(student.MaSv) + '?' + params.toString());
    renderCreditSummary(res && res.success && res.data ? res.data.summary : null);
  } catch (e) {
    renderCreditSummary(null);
  }
}

async function initializeRegistrationPage() {
  try {
    applyFiltersFromUrl();
    await ensureStudent();
    await loadPeriods();
    var options = await apiFetch('/api/semesters/registration-options').catch(function() { return null; });
    if (options && options.success) {
      renderSemesterOptions(options.data || []);
    } else {
      var active = await apiFetch('/api/semesters/active').catch(function() { return null; });
      if (active && active.success && active.data) renderSemesterOptions([active.data]);
    }
    var initialPage = parseInt(new URLSearchParams(window.location.search).get('page') || '1', 10);
    if (document.getElementById('semester-input').value) loadAvailableCourses(Number.isFinite(initialPage) ? initialPage : 1);
  } catch (e) {}
}

async function loadAvailableCourses(page) {
  if (!validatePeriodFilter()) return;
  availablePage = page || 1;
  var semester = document.getElementById('semester-input').value.trim();
  var empty = document.getElementById('available-empty');
  var loading = document.getElementById('loading');
  var list = document.getElementById('available-courses');
  var count = document.getElementById('available-count');

  syncFilterUrl(availablePage);

  if (!semester) {
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    empty.textContent = 'Vui lòng chọn học kỳ';
    if (count) count.textContent = '';
    renderAvailablePagination({});
    renderCreditSummary(null);
    return;
  }

  await loadRegisteredCreditSummary(semester);
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
    var params = buildAvailableParams(availablePage, semester);
    var res = await apiFetch('/api/registrations/available?' + params.toString());

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
      empty.textContent = 'Không có lớp mở phù hợp với bộ lọc hiện tại.';
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
  var form = document.getElementById('course-registration-filter');
  var search = document.getElementById('course-search');
  var scope = document.getElementById('course-search-scope');
  var semester = document.getElementById('semester-input');
  var list = document.getElementById('available-courses');
  var reset = document.getElementById('reset-filters');
  var filterIds = ['filter-course-type', 'filter-weekday', 'filter-period-start', 'filter-period-end'];

  if (form) {
    form.addEventListener('submit', function(event) {
      event.preventDefault();
      loadAvailableCourses(1);
    });
  }
  if (search) {
    search.addEventListener('input', debounceAvailableCourses);
    search.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        loadAvailableCourses(1);
      }
    });
  }
  if (scope) {
    scope.addEventListener('change', function() {
      updateSearchPlaceholder();
      loadAvailableCourses(1);
    });
  }
  filterIds.forEach(function(id) {
    var element = document.getElementById(id);
    if (element) element.addEventListener('change', function() { loadAvailableCourses(1); });
  });
  if (reset) {
    reset.addEventListener('click', function() {
      setFilterValue('course-search-scope', 'course');
      setFilterValue('course-search', '');
      setFilterValue('filter-course-type', '');
      setFilterValue('filter-weekday', '');
      setFilterValue('filter-period-start', '');
      setFilterValue('filter-period-end', '');
      updateSearchPlaceholder();
      loadAvailableCourses(1);
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
