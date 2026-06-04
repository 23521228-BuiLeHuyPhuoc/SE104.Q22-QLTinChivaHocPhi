var searchTimer;
var currentDetailRegistrationId = null;

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var searchScope = document.getElementById('registration-search-scope');
  var status = document.getElementById('filter-status').value;
  var semester = document.getElementById('registration-semester');
  var params = new URLSearchParams();
  params.set('page', '1');
  if (search && search.trim()) params.set('search', search.trim());
  if (searchScope && searchScope.value) params.set('searchScope', searchScope.value);
  if (status) params.set('status', status);
  if (semester && semester.value) params.set('MaHocKy', semester.value);
  window.location.href = '/admin/registrations?' + params.toString();
}

function updateRegistrationSearchPlaceholder() {
  var scope = document.getElementById('registration-search-scope');
  var input = document.getElementById('search-input');
  if (!scope || !input) return;
  var selectedOption = scope.options[scope.selectedIndex];
  if (selectedOption && selectedOption.dataset.placeholder) {
    input.placeholder = selectedOption.dataset.placeholder;
    return;
  }
  input.placeholder = 'Nhập từ khóa tìm kiếm';
}

document.addEventListener('DOMContentLoaded', function() {
  updateRegistrationSearchPlaceholder();
  renderRegistrationActivityPanel();
});

function closeRegistrationDetail() {
  var modal = document.getElementById('registration-detail-modal');
  if (modal) modal.classList.remove('active');
  currentDetailRegistrationId = null;
}

function registrationEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function registrationTypeLabel(type) {
  if (type === 'hoc_lai') return 'Học lại';
  if (type === 'hoc_cai_thien') return 'Học cải thiện';
  if (type === 'hoc_he') return 'Học hè';
  return 'Học mới';
}

function registrationStatusBadge(status) {
  return String(status || '').toLowerCase().indexOf('hủy') >= 0 ? 'badge-error' : 'badge-success';
}

function getSelectedRegistrationActivity() {
  var select = document.getElementById('registration-semester');
  if (!select || !select.value) return null;
  var option = select.options[select.selectedIndex];
  return parseActivityData(option ? option.dataset.activity : null);
}

function renderRegistrationActivityPanel() {
  var activity = getSelectedRegistrationActivity();
  var semesterEl = document.getElementById('registration-activity-semester');
  var badge = document.getElementById('registration-window-badge');
  var start = document.getElementById('registration-window-start');
  var end = document.getElementById('registration-window-end');
  var tuitionStatus = document.getElementById('registration-tuition-status');
  var button = document.getElementById('finalize-registration-btn');

  if (!activity) {
    if (semesterEl) semesterEl.textContent = 'Chọn học kỳ để xem thời hạn đăng ký';
    setActivityBadge(badge, getActivityBadgeMeta(null));
    if (start) start.textContent = '-';
    if (end) end.textContent = '-';
    if (tuitionStatus) tuitionStatus.textContent = '-';
    if (button) {
      button.disabled = true;
      button.title = 'Chọn học kỳ để chốt đăng ký';
    }
    return;
  }

  var windowState = activity.registrationWindow || {};
  var workflow = activity.workflow || {};
  if (semesterEl) semesterEl.textContent = activity.label || activity.MaHocKy || '-';
  setActivityBadge(badge, getActivityBadgeMeta(windowState));
  if (start) start.textContent = formatActivityDateTime(activity.NgayBatDauDangKy || windowState.registrationStart || windowState.start);
  if (end) end.textContent = formatActivityDateTime(activity.NgayKetThucDangKy || windowState.registrationDeadline || windowState.deadline);
  if (tuitionStatus) {
    var paymentWindow = activity.tuitionPaymentWindow || {};
    var paymentStart = activity.NgayMoThuHocPhi || paymentWindow.paymentStart || paymentWindow.start;
    tuitionStatus.textContent = workflow.tuitionOpen || activity.MoThuHocPhi
      ? 'Đã mở thu' + (paymentStart ? ' từ ' + formatActivityDateTime(paymentStart) : '')
      : 'Chưa mở thu';
  }
  if (button) {
    var alreadyFinalized = Boolean(workflow.finalized || activity.NgayChotDangKy);
    button.disabled = alreadyFinalized || !workflow.canFinalize;
    button.title = alreadyFinalized ? 'Học kỳ đã chốt đăng ký' : (workflow.finalizeReason || 'Có thể chốt đăng ký');
  }
}

async function finalizeSelectedRegistration() {
  var activity = getSelectedRegistrationActivity();
  if (!activity || !activity.MaHocKy) {
    showToast('Vui lòng chọn học kỳ cần chốt đăng ký', 'error');
    return;
  }
  if (!confirm('Chốt đăng ký học phần cho ' + (activity.label || activity.MaHocKy) + '? Các lớp dưới 75% sức chứa sẽ bị đóng và đăng ký của các lớp đó sẽ bị hủy.')) return;

  try {
    var res = await apiFetch('/api/semesters/' + encodeURIComponent(activity.MaHocKy) + '/finalize-registration', { method: 'POST' });
    if (res && res.success) {
      var summary = res.data || {};
      showToast(
        'Đã chốt đăng ký: ' + (summary.SoLopDatNguong || 0) + ' lớp mở, ' +
          (summary.SoLopBiDong || 0) + ' lớp đóng, ' +
          (summary.SoDangKyBiHuy || 0) + ' đăng ký bị hủy, đã mở thu học phí',
        'success'
      );
      setTimeout(function() { window.location.reload(); }, 500);
      return;
    }
    showToast((res && res.message) || 'Không thể chốt đăng ký học phần', 'error');
  } catch (error) {
    showToast('Lỗi kết nối khi chốt đăng ký học phần', 'error');
  }
}

function isActiveRegistration(item) {
  return item && item.TrangThai === 'Đã đăng ký';
}

async function loadAllStudentRegistrationCourses(maSv) {
  var courses = [];
  var page = 1;
  var totalPages = 1;
  var activity = getSelectedRegistrationActivity();
  var semesterQuery = activity && activity.MaHocKy ? '&MaHocKy=' + encodeURIComponent(activity.MaHocKy) : '';
  do {
    var res = await apiFetch('/api/registrations/student/' + encodeURIComponent(maSv) + '?page=' + page + semesterQuery);
    if (!res || res.success === false) throw new Error((res && res.message) || 'Không tải được chi tiết đăng ký');
    courses = courses.concat((res.data && res.data.courses) || []);
    totalPages = Number(res.pagination && res.pagination.totalPages || 1);
    page += 1;
  } while (page <= totalPages);
  return courses;
}

function renderStudentRegistrationDetail(maSv, courses) {
  var content = document.getElementById('registration-detail-content');
  if (!content) return;

  var grouped = courses.reduce(function(acc, item) {
    var registration = item.PHIEUDANGKY || {};
    var semester = item.PHIEUDANGKY && item.PHIEUDANGKY.HocKyDisplay
      ? item.PHIEUDANGKY.HocKyDisplay
      : item.PHIEUDANGKY && item.PHIEUDANGKY.HOCKY
        ? item.PHIEUDANGKY.HOCKY.TenHocKy + (item.PHIEUDANGKY.HOCKY.NAMHOC && item.PHIEUDANGKY.HOCKY.NAMHOC.TenNamHoc ? ' - ' + item.PHIEUDANGKY.HOCKY.NAMHOC.TenNamHoc : '')
        : 'Chưa rõ học kỳ';
    var key = registration.SoPhieu || item.SoPhieu || semester;
    if (!acc[key]) acc[key] = { semester: semester, registration: registration, courses: [] };
    acc[key].courses.push(item);
    return acc;
  }, {});

  var rows = Object.keys(grouped).map(function(key) {
    var group = grouped[key];
    var registration = group.registration || {};
    var activeCourses = group.courses.filter(isActiveRegistration);
    var totalCredits = Number(registration.TongTinChi || activeCourses.reduce(function(sum, item) { return sum + Number(item.SoTinChi || 0); }, 0));

    var summary = '<div class="detail-grid registration-summary-grid">' +
      '<div><strong>Số phiếu</strong><span>' + registrationEscapeHtml(registration.SoPhieu || key) + '</span></div>' +
      '<div><strong>Số môn</strong><span>' + activeCourses.length + '</span></div>' +
      '<div><strong>Tổng tín chỉ</strong><span>' + totalCredits + '</span></div>' +
      '<div><strong>Trạng thái phiếu</strong><span>' + registrationEscapeHtml(registration.TrangThai || '-') + '</span></div>' +
    '</div>';

    var courseRows = group.courses.map(function(item) {
      var course = item.LOP && item.LOP.MONHOC ? item.LOP.MONHOC : {};
      var canCancel = isActiveRegistration(item) && item.id;
      var action = canCancel
        ? '<button class="btn btn-sm btn-danger" type="button" onclick="cancelRegistrationDetail(' + Number(item.id) + ')">Hủy</button>'
        : '<span class="text-muted">' + registrationEscapeHtml(item.LyDoHuy || '-') + '</span>';
      return '<tr>' +
        '<td class="mono">' + registrationEscapeHtml(item.MaMonHoc || course.MaMonHoc || '-') + '</td>' +
        '<td>' + registrationEscapeHtml(course.TenMonHoc || '-') + '</td>' +
        '<td class="mono">' + registrationEscapeHtml(item.MaLop || '-') + '</td>' +
        '<td>' + Number(item.SoTinChi || 0) + '</td>' +
        '<td>' + registrationEscapeHtml(registrationTypeLabel(item.LoaiDangKy)) + '</td>' +
        '<td><span class="badge ' + registrationStatusBadge(item.TrangThai) + '">' + registrationEscapeHtml(item.TrangThai || '-') + '</span></td>' +
        '<td>' + action + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="registration-semester-block mt-3">' +
      '<h4>' + registrationEscapeHtml(group.semester) + '</h4>' +
      summary +
      '<div class="table-container"><table class="data-table"><thead><tr>' +
        '<th>Mã môn</th><th>Tên môn</th><th>Lớp</th><th>Tín chỉ</th><th>Loại đăng ký</th><th>Trạng thái</th><th>Thao tác</th>' +
      '</tr></thead><tbody>' + courseRows + '</tbody></table></div>' +
    '</div>';
  }).join('');

  content.innerHTML =
    '<div class="detail-grid">' +
      '<div><strong>MSSV</strong><span>' + registrationEscapeHtml(maSv) + '</span></div>' +
      '<div><strong>Tổng môn đăng ký</strong><span>' + courses.length + '</span></div>' +
      '<div><strong>Tổng tín chỉ</strong><span>' + courses.reduce(function(sum, item) { return sum + Number(item.SoTinChi || 0); }, 0) + '</span></div>' +
    '</div>' +
    (rows || '<div class="empty-state mt-3">Sinh viên chưa có môn đăng ký</div>');
}

async function openStudentRegistrationDetail(maSv) {
  var modal = document.getElementById('registration-detail-modal');
  var content = document.getElementById('registration-detail-content');
  if (!modal || !content) return;
  currentDetailRegistrationId = null;
  modal.classList.add('active');
  content.textContent = 'Đang tải...';

  try {
    var courses = await loadAllStudentRegistrationCourses(maSv);
    renderStudentRegistrationDetail(maSv, courses);
  } catch (error) {
    content.textContent = error.message || 'Không tải được chi tiết đăng ký';
  }
}

function registrationDetailSemester(registration) {
  var semester = registration.HOCKY || {};
  var year = semester.NAMHOC && semester.NAMHOC.TenNamHoc ? ' - ' + semester.NAMHOC.TenNamHoc : '';
  return registration.HocKyDisplay || (semester.TenHocKy ? semester.TenHocKy + year : (registration.MaHocKy || '-'));
}

function renderRegistrationDetail(registration) {
  var content = document.getElementById('registration-detail-content');
  if (!content) return;

  var student = registration.SINHVIEN || {};
  var details = registration.CHITIETDANGKY || [];
  var activeDetails = details.filter(isActiveRegistration);
  var semester = registrationDetailSemester(registration);
  var totalCredits = Number(registration.TongTinChi || activeDetails.reduce(function(sum, item) { return sum + Number(item.SoTinChi || 0); }, 0));

  var rows = details.map(function(item) {
    var course = item.LOP && item.LOP.MONHOC ? item.LOP.MONHOC : (item.MONHOC || {});
    var canCancel = isActiveRegistration(item) && item.id;
    var action = canCancel
      ? '<button class="btn btn-sm btn-danger" type="button" onclick="cancelRegistrationDetail(' + Number(item.id) + ')">Hủy</button>'
      : '<span class="text-muted">' + registrationEscapeHtml(item.LyDoHuy || '-') + '</span>';
    return '<tr>' +
      '<td class="mono">' + registrationEscapeHtml(item.MaMonHoc || course.MaMonHoc || '-') + '</td>' +
      '<td>' + registrationEscapeHtml(course.TenMonHoc || '-') + '</td>' +
      '<td class="mono">' + registrationEscapeHtml(item.MaLop || '-') + '</td>' +
      '<td>' + Number(item.SoTinChi || course.SoTinChi || 0) + '</td>' +
      '<td>' + registrationEscapeHtml(registrationTypeLabel(item.LoaiDangKy)) + '</td>' +
      '<td><span class="badge ' + registrationStatusBadge(item.TrangThai) + '">' + registrationEscapeHtml(item.TrangThai || '-') + '</span></td>' +
      '<td>' + action + '</td>' +
    '</tr>';
  }).join('');

  content.innerHTML =
    '<div class="detail-grid registration-summary-grid">' +
      '<div><strong>Số phiếu</strong><span>' + registrationEscapeHtml(registration.SoPhieu || '-') + '</span></div>' +
      '<div><strong>MSSV</strong><span>' + registrationEscapeHtml(registration.MaSv || student.MaSv || '-') + '</span></div>' +
      '<div><strong>Họ tên</strong><span>' + registrationEscapeHtml(student.HoTen || '-') + '</span></div>' +
      '<div><strong>Học kỳ</strong><span>' + registrationEscapeHtml(semester) + '</span></div>' +
      '<div><strong>Số môn</strong><span>' + activeDetails.length + '</span></div>' +
      '<div><strong>Tổng tín chỉ</strong><span>' + totalCredits + '</span></div>' +
      '<div><strong>Trạng thái phiếu</strong><span>' + registrationEscapeHtml(registration.TrangThai || '-') + '</span></div>' +
    '</div>' +
    '<div class="registration-semester-block mt-3">' +
      '<h4>' + registrationEscapeHtml(semester) + '</h4>' +
      '<div class="table-container"><table class="data-table"><thead><tr>' +
        '<th>Mã môn</th><th>Tên môn</th><th>Lớp</th><th>Tín chỉ</th><th>Loại đăng ký</th><th>Trạng thái</th><th>Thao tác</th>' +
      '</tr></thead><tbody>' + (rows || '<tr><td colspan="7"><div class="empty-state">Phiếu này chưa có môn đăng ký</div></td></tr>') + '</tbody></table></div>' +
    '</div>';
}

async function openRegistrationDetail(soPhieu) {
  var modal = document.getElementById('registration-detail-modal');
  var content = document.getElementById('registration-detail-content');
  if (!modal || !content || !soPhieu) return;
  currentDetailRegistrationId = soPhieu;
  modal.classList.add('active');
  content.textContent = 'Đang tải...';

  try {
    var res = await apiFetch('/api/registrations/' + encodeURIComponent(soPhieu));
    if (!res || res.success === false) throw new Error((res && res.message) || 'Không tải được chi tiết đăng ký');
    renderRegistrationDetail(res.data || {});
  } catch (error) {
    content.textContent = error.message || 'Không tải được chi tiết đăng ký';
  }
}

async function cancelRegistrationDetail(id) {
  if (!id) return;
  if (!confirm('Bạn có chắc muốn hủy chi tiết đăng ký này?')) return;

  try {
    var res = await apiFetch('/api/registrations/' + encodeURIComponent(id) + '/cancel', { method: 'PUT' });
    if (res.success) {
      showToast(res.message || 'Hủy đăng ký thành công', 'success');
      if (currentDetailRegistrationId) openRegistrationDetail(currentDetailRegistrationId);
      return;
    }
    showToast(res.message || 'Không thể hủy đăng ký', 'error');
  } catch (error) {
    showToast(error.message || 'Không thể hủy đăng ký', 'error');
  }
}
