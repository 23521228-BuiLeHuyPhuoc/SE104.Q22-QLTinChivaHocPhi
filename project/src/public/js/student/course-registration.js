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
  var select = document.getElementById('semester-input');
  if (!select) return;
  semesterOptionsById = {};

  select.innerHTML = '<option value="">Chọn học kỳ</option>' + (semesters || []).map(function(item) {
    var yearName = item.NAMHOC ? item.NAMHOC.TenNamHoc : '';
    var windowState = getSemesterWindow(item);
    var suffix = windowState
      ? (windowState.isOpen ? ' - đang mở ĐK' : ' - ' + (windowState.message || 'chưa mở ĐK'))
      : '';
    semesterOptionsById[item.MaHocKy] = item;
    return '<option value="' + courseEscapeHtml(item.MaHocKy) + '">' +
      courseEscapeHtml(item.TenHocKy + (yearName ? ' - ' + yearName : '') + suffix) +
      '</option>';
  }).join('');
  if (semesters && semesters.length) {
    var firstOpen = semesters.find(function(item) {
      var state = getSemesterWindow(item);
      return state && state.isOpen;
    });
    select.value = (firstOpen || semesters[0]).MaHocKy;
  }
  renderRegistrationWindowMessage();
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
  var table = document.getElementById('courses-table');
  var tbody = document.getElementById('available-courses');

  if (!semester) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    empty.textContent = 'Vui lòng chọn học kỳ';
    renderAvailablePagination({});
    return;
  }

  renderRegistrationWindowMessage();
  var selectedSemester = getSelectedSemesterOption();
  var selectedWindow = getSemesterWindow(selectedSemester);
  if (selectedWindow && !selectedWindow.isOpen) {
    loading.classList.add('hidden');
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    empty.textContent = getSemesterWindowMessage(selectedSemester);
    renderAvailablePagination({});
    return;
  }

  loading.classList.remove('hidden');
  table.classList.add('hidden');
  empty.classList.add('hidden');

  try {
    var url = '/api/registrations/available?MaHocKy=' + encodeURIComponent(semester) + '&page=' + availablePage;
    if (search) url += '&search=' + encodeURIComponent(search);
    var res = await apiFetch(url);

    loading.classList.add('hidden');
    if (!res.success) {
      table.classList.add('hidden');
      empty.classList.remove('hidden');
      empty.textContent = res.message || 'Không thể tải danh sách lớp mở';
      renderAvailablePagination({});
      return;
    }

    table.classList.remove('hidden');
    renderAvailablePagination(res.pagination || {});

    if (res.data && res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(c) {
        var max = Number(c.SoLuongToiDa || 0);
        var registered = Number(c.SoLuongDaDangKy || 0);
        var remaining = Math.max(max - registered, 0);
        var canRegister = remaining > 0 && c.CanDangKy !== false;
        var blockedLabel = remaining > 0 ? 'Đã thu HP' : 'Hết chỗ';
        var blockedTitle = c.LyDoKhongTheDangKy ? ' title="' + courseEscapeHtml(c.LyDoKhongTheDangKy) + '"' : '';
        return '<tr>' +
          '<td class="mono">' + courseEscapeHtml(c.MaLop || '-') + '</td>' +
          '<td><strong>' + courseEscapeHtml(c.TenMonHoc || '-') + '</strong><small>' + courseEscapeHtml(c.TenKhoa || '') + '</small></td>' +
          '<td>' + courseEscapeHtml(c.SoTinChi || '-') + '</td>' +
          '<td>' + courseEscapeHtml(c.GiangVien || '-') + '</td>' +
          '<td>' + courseEscapeHtml(c.LichHoc || '-') + '</td>' +
          '<td>' + courseEscapeHtml(c.PhongHoc || '-') + '</td>' +
          '<td><span class="badge ' + registrationBadgeClass(c.LoaiDangKy) + '">' + courseEscapeHtml(c.LoaiDangKyLabel || 'Học mới') + '</span></td>' +
          '<td class="currency">' + formatCurrency(c.ThanhTienDuKien || 0) + '</td>' +
          '<td>' + registered + ' / ' + (max || '-') + '</td>' +
          '<td>' + (canRegister
            ? '<button class="btn btn-sm btn-primary" type="button" onclick="registerCourse(\'' + courseEscapeHtml(c.MaLop) + '\', \'' + courseEscapeHtml(c.MaHocKy) + '\')">Đăng ký</button>'
            : '<span class="badge badge-error"' + blockedTitle + '>' + blockedLabel + '</span>') + '</td>' +
        '</tr>';
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state">Học kỳ này đang mở đăng ký nhưng chưa có lớp mở phù hợp.</div></td></tr>';
    }
  } catch (e) {
    loading.classList.add('hidden');
    table.classList.remove('hidden');
    renderAvailablePagination({});
    tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
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
  initializeRegistrationPage();
});
