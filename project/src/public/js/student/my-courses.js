var currentStudent = null;
var currentMyCoursesPage = 1;
var myCoursesSemesters = [];
var myCoursesAcademicYears = [];

function myCoursesEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function registrationBadgeClass(type) {
  if (type === 'hoc_lai') return 'badge-warning';
  if (type === 'hoc_cai_thien') return 'badge-info';
  return 'badge-success';
}

function isCancelledRegistration(status) {
  var normalized = String(status || '').toLowerCase();
  return normalized.indexOf('hủy') >= 0 || normalized.indexOf('huy') >= 0;
}

function toNumber(value) {
  var number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

async function ensureCurrentStudent() {
  if (currentStudent) return currentStudent;
  var meRes = await apiFetch('/api/auth/me');
  if (meRes.success && meRes.data.student) currentStudent = meRes.data.student;
  return currentStudent;
}

function setSelectValue(id, value) {
  var element = document.getElementById(id);
  if (element) element.value = value || '';
}

function getFilterValues() {
  return {
    MaNamHoc: (document.getElementById('filter-academic-year') || {}).value || '',
    MaHocKy: (document.getElementById('filter-semester') || {}).value || ''
  };
}

function semesterYearId(semester) {
  return semester.MaNamHoc || (semester.NAMHOC && semester.NAMHOC.MaNamHoc) || '';
}

function semesterYearName(semester) {
  return semester.TenNamHoc || (semester.NAMHOC && semester.NAMHOC.TenNamHoc) || '';
}

function semesterLabel(semester) {
  var year = semesterYearName(semester);
  return (semester.TenHocKy || semester.MaHocKy || '-') + (year ? ' - ' + year : '');
}

function registrationSemesterText(course) {
  var registration = course.PHIEUDANGKY || {};
  var semester = registration.HOCKY || {};
  var year = semester.NAMHOC || {};
  var semesterName = semester.TenHocKy || registration.MaHocKy || '-';
  var yearName = year.TenNamHoc || semester.TenNamHoc || '';
  return semesterName + (yearName ? ' - ' + yearName : '');
}

function syncFilterUrl(page) {
  var filters = getFilterValues();
  var params = new URLSearchParams();
  params.set('page', String(page || 1));
  if (filters.MaNamHoc) params.set('MaNamHoc', filters.MaNamHoc);
  if (filters.MaHocKy) params.set('MaHocKy', filters.MaHocKy);
  window.history.replaceState({}, '', window.location.pathname + '?' + params.toString());
}

function applyFiltersFromUrl() {
  var params = new URLSearchParams(window.location.search);
  setSelectValue('filter-academic-year', params.get('MaNamHoc') || '');
  populateSemesterFilter(params.get('MaHocKy') || '');
}

function populateAcademicYearFilter(selectedValue) {
  var select = document.getElementById('filter-academic-year');
  if (!select) return;
  select.innerHTML = '<option value="">Tất cả năm học</option>';
  myCoursesAcademicYears.forEach(function(year) {
    var option = new Option(year.TenNamHoc || year.MaNamHoc, year.MaNamHoc);
    select.add(option);
  });
  select.value = selectedValue || select.value || '';
}

function populateSemesterFilter(selectedValue) {
  var select = document.getElementById('filter-semester');
  if (!select) return;
  var selectedYear = (document.getElementById('filter-academic-year') || {}).value || '';
  var semesters = myCoursesSemesters.filter(function(semester) {
    return !selectedYear || semesterYearId(semester) === selectedYear;
  });

  select.innerHTML = '<option value="">Tất cả học kỳ</option>';
  semesters.forEach(function(semester) {
    select.add(new Option(semesterLabel(semester), semester.MaHocKy));
  });

  var nextValue = selectedValue || select.value || '';
  if (nextValue && !semesters.some(function(semester) { return semester.MaHocKy === nextValue; })) {
    nextValue = '';
  }
  select.value = nextValue;
}

async function fetchAllSemesters() {
  var first = await apiFetch('/api/semesters?page=1');
  if (!first || !first.success) return [];
  var rows = first.data || [];
  var totalPages = Number(first.pagination && first.pagination.totalPages || 1);
  for (var page = 2; page <= totalPages; page += 1) {
    var res = await apiFetch('/api/semesters?page=' + page).catch(function() { return null; });
    if (res && res.success) rows = rows.concat(res.data || []);
  }
  return rows;
}

async function loadFilterOptions() {
  try {
    var params = new URLSearchParams(window.location.search);
    var selectedYear = params.get('MaNamHoc') || '';
    var selectedSemester = params.get('MaHocKy') || '';
    var yearsRes = await apiFetch('/api/semesters/years').catch(function() { return null; });
    myCoursesAcademicYears = yearsRes && yearsRes.success ? (yearsRes.data || []) : [];
    myCoursesSemesters = await fetchAllSemesters();
    populateAcademicYearFilter(selectedYear);
    populateSemesterFilter(selectedSemester);
  } catch (e) {
    populateAcademicYearFilter('');
    populateSemesterFilter('');
  }
}

function buildMyCoursesParams(page) {
  var filters = getFilterValues();
  var params = new URLSearchParams();
  params.set('page', String(page || 1));
  params.set('includeCancelled', 'false');
  if (filters.MaNamHoc) params.set('MaNamHoc', filters.MaNamHoc);
  if (filters.MaHocKy) params.set('MaHocKy', filters.MaHocKy);
  return params;
}

function renderMyCoursesSummary(summary) {
  var panel = document.getElementById('my-courses-summary');
  if (!panel) return;

  summary = summary || {};
  var credits = toNumber(summary.totalCreditsRegistered || summary.registeredCredits || summary.totalCredits);
  var courses = toNumber(summary.registeredCourses || summary.activeCourses || summary.totalCourses);
  var tuition = toNumber(summary.totalTuitionBeforeDiscount || summary.registeredTuition || summary.totalTuition || summary.totalAmount);

  var creditsElement = document.getElementById('my-courses-total-credits');
  var coursesElement = document.getElementById('my-courses-total-courses');
  var feeElement = document.getElementById('my-courses-total-fee');

  if (creditsElement) creditsElement.textContent = 'Tổng tín chỉ đã đăng ký: ' + credits;
  if (coursesElement) coursesElement.textContent = courses + ' học phần đang đăng ký';
  if (feeElement) feeElement.textContent = 'Học phí trước miễn/giảm tạm tính: ' + formatCurrency(tuition);
  panel.classList.remove('hidden');
}

function renderCancelAction(course) {
  var isCancelled = isCancelledRegistration(course.TrangThai);
  var canCancel = !isCancelled && course.CanHuy !== false && course.CanCancelRegistration !== false;
  var label = course.CancelActionLabel || (canCancel ? 'Hủy ĐK' : 'Đã chốt đăng ký');
  var message = course.CancelActionMessage || course.LyDoKhongTheHuy || 'Đợt đăng ký học phần đã kết thúc';

  if (canCancel) {
    return '<button class="btn btn-sm btn-danger" type="button" onclick="cancelRegistration(' + course.id + ')">Hủy ĐK</button>';
  }

  return '<button class="btn btn-sm btn-outline my-courses-locked-action" type="button" title="' + myCoursesEscapeHtml(message) + '" disabled>' + myCoursesEscapeHtml(label) + '</button>';
}

function renderMyCourseRow(course) {
  var lop = course.LOP || {};
  var mon = lop.MONHOC || {};
  var status = course.TrangThai || 'Đã đăng ký';
  var registration = course.PHIEUDANGKY || {};

  return '<tr>' +
    '<td><span class="mono">#' + myCoursesEscapeHtml(registration.SoPhieu || course.SoPhieu || '-') + '</span><small>' + myCoursesEscapeHtml(registrationSemesterText(course)) + '</small></td>' +
    '<td class="mono">' + myCoursesEscapeHtml(lop.MaLop || course.MaLop || '-') + '</td>' +
    '<td><strong>' + myCoursesEscapeHtml(mon.TenMonHoc || '-') + '</strong><small>' + myCoursesEscapeHtml(mon.MaMonHoc || course.MaMonHoc || '') + '</small></td>' +
    '<td>' + (course.SoTinChi || '-') + '</td>' +
    '<td><span class="badge ' + registrationBadgeClass(course.LoaiDangKy) + '">' + myCoursesEscapeHtml(course.LoaiDangKyLabel || 'Học mới') + '</span></td>' +
    '<td>' + myCoursesEscapeHtml(lop.GiangVien || '-') + '</td>' +
    '<td>' + myCoursesEscapeHtml(lop.LichHoc || '-') + '</td>' +
    '<td>' + myCoursesEscapeHtml(lop.PhongHoc || '-') + '</td>' +
    '<td><span class="badge badge-success">' + myCoursesEscapeHtml(status) + '</span></td>' +
    '<td><div class="my-courses-action">' + renderCancelAction(course) + '</div></td>' +
  '</tr>';
}

async function loadMyCourses(page) {
  currentMyCoursesPage = page || 1;
  var loading = document.getElementById('loading');
  var table = document.getElementById('courses-table');
  var tbody = document.getElementById('my-courses');
  var count = document.getElementById('my-courses-count');

  syncFilterUrl(currentMyCoursesPage);
  if (loading) loading.classList.remove('hidden');
  if (table) table.classList.add('hidden');

  try {
    var student = await ensureCurrentStudent();
    if (!student) {
      if (loading) loading.classList.add('hidden');
      if (table) table.classList.remove('hidden');
      if (tbody) tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state text-error">Không xác định được sinh viên hiện tại</div></td></tr>';
      renderMyCoursesSummary({});
      return;
    }

    var params = buildMyCoursesParams(currentMyCoursesPage);
    var res = await apiFetch('/api/registrations/student/' + encodeURIComponent(student.MaSv) + '?' + params.toString());
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');

    if (!res || !res.success) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state text-error">' + myCoursesEscapeHtml((res && res.message) || 'Lỗi tải dữ liệu') + '</div></td></tr>';
      if (count) count.textContent = '';
      renderMyCoursesSummary({});
      renderClientPagination('my-courses-pagination', null, 'loadMyCourses');
      return;
    }

    var courses = (res.data && res.data.courses ? res.data.courses : []).filter(function(course) {
      return !isCancelledRegistration(course.TrangThai);
    });
    var total = Number(res.pagination && res.pagination.total || 0);

    if (!courses.length && currentMyCoursesPage > 1 && total > 0) {
      loadMyCourses(currentMyCoursesPage - 1);
      return;
    }

    if (count) count.textContent = total ? total + ' học phần' : '';
    renderMyCoursesSummary(res.data ? res.data.summary : {});

    if (courses.length > 0) {
      tbody.innerHTML = courses.map(renderMyCourseRow).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state">Không có phiếu đăng ký học phần phù hợp</div></td></tr>';
    }

    renderClientPagination('my-courses-pagination', res.pagination, 'loadMyCourses');
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');
    if (tbody) tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
    if (count) count.textContent = '';
    renderMyCoursesSummary({});
    renderClientPagination('my-courses-pagination', null, 'loadMyCourses');
  }
}

async function cancelRegistration(id) {
  if (!id) return;
  if (!confirm('Bạn có chắc muốn hủy đăng ký học phần này?')) return;
  try {
    var res = await apiFetch('/api/registrations/' + id + '/cancel', { method: 'PUT' });
    if (res.success) {
      showToast('Đã hủy đăng ký học phần', 'success');
      loadMyCourses(currentMyCoursesPage);
    } else {
      showToast(res.message || 'Không thể hủy đăng ký học phần', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('my-courses-filter');
  var year = document.getElementById('filter-academic-year');
  var semester = document.getElementById('filter-semester');
  var reset = document.getElementById('reset-my-courses-filter');

  if (form) {
    form.addEventListener('submit', function(event) {
      event.preventDefault();
      loadMyCourses(1);
    });
  }
  if (year) {
    year.addEventListener('change', function() {
      populateSemesterFilter('');
      loadMyCourses(1);
    });
  }
  if (semester) {
    semester.addEventListener('change', function() {
      var selected = myCoursesSemesters.find(function(item) { return item.MaHocKy === semester.value; });
      if (selected && year && !year.value) {
        year.value = semesterYearId(selected);
        populateSemesterFilter(semester.value);
      }
      loadMyCourses(1);
    });
  }
  if (reset) {
    reset.addEventListener('click', function() {
      setSelectValue('filter-academic-year', '');
      populateSemesterFilter('');
      loadMyCourses(1);
    });
  }

  loadFilterOptions().then(function() {
    applyFiltersFromUrl();
    var initialPage = parseInt(new URLSearchParams(window.location.search).get('page') || '1', 10);
    loadMyCourses(Number.isFinite(initialPage) ? initialPage : 1);
  });
});
