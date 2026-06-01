var searchTimer;
var currentDetailStudentId = null;

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var searchScope = document.getElementById('registration-search-scope');
  var status = document.getElementById('filter-status').value;
  var currentParams = new URLSearchParams(window.location.search);
  var params = new URLSearchParams();
  params.set('page', '1');
  if (search && search.trim()) params.set('search', search.trim());
  if (searchScope && searchScope.value) params.set('searchScope', searchScope.value);
  if (status) params.set('status', status);
  if (currentParams.get('MaHocKy')) params.set('MaHocKy', currentParams.get('MaHocKy'));
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

document.addEventListener('DOMContentLoaded', updateRegistrationSearchPlaceholder);

function toggleRegistrationStats() {
  var panel = document.getElementById('registration-stats-panel');
  var button = document.getElementById('registration-stats-toggle');
  if (!panel || !button) return;
  panel.hidden = !panel.hidden;
  button.setAttribute('aria-expanded', String(!panel.hidden));
  button.textContent = panel.hidden ? 'Thống kê đăng ký môn học' : 'Ẩn thống kê đăng ký';
  if (!panel.hidden) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function exportRegistrations() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input').value.trim();
  var searchScope = document.getElementById('registration-search-scope');
  var status = document.getElementById('filter-status').value;
  var currentParams = new URLSearchParams(window.location.search);
  if (search) params.set('search', search);
  if (searchScope && searchScope.value) params.set('searchScope', searchScope.value);
  if (status) params.set('status', status);
  if (currentParams.get('MaHocKy')) params.set('MaHocKy', currentParams.get('MaHocKy'));

  try {
    var token = getToken();
    var headers = token ? { Authorization: 'Bearer ' + token } : {};
    var res = await fetch('/api/registrations/export' + (params.toString() ? '?' + params.toString() : ''), { headers: headers });
    if (!res.ok) {
      var errorText = await res.text();
      try {
        var errorJson = JSON.parse(errorText);
        showToast(errorJson.message || 'Không thể xuất Excel', 'error');
      } catch (e) {
        showToast(errorText || 'Không thể xuất Excel', 'error');
      }
      return;
    }

    var blob = await res.blob();
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'thong-ke-dang-ky-mon-hoc.xls';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    showToast('Không thể xuất Excel', 'error');
  }
}

function closeRegistrationDetail() {
  var modal = document.getElementById('registration-detail-modal');
  if (modal) modal.classList.remove('active');
  currentDetailStudentId = null;
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

function isActiveRegistration(item) {
  return item && item.TrangThai === 'Đã đăng ký';
}

async function loadAllStudentRegistrationCourses(maSv) {
  var courses = [];
  var page = 1;
  var totalPages = 1;
  do {
    var res = await apiFetch('/api/registrations/student/' + encodeURIComponent(maSv) + '?page=' + page);
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
    var semester = item.PHIEUDANGKY && item.PHIEUDANGKY.HOCKY
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
  currentDetailStudentId = maSv;
  modal.classList.add('active');
  content.textContent = 'Đang tải...';

  try {
    var courses = await loadAllStudentRegistrationCourses(maSv);
    renderStudentRegistrationDetail(maSv, courses);
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
      if (currentDetailStudentId) openStudentRegistrationDetail(currentDetailStudentId);
      return;
    }
    showToast(res.message || 'Không thể hủy đăng ký', 'error');
  } catch (error) {
    showToast(error.message || 'Không thể hủy đăng ký', 'error');
  }
}
