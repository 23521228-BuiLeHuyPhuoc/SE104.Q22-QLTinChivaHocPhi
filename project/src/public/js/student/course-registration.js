var currentStudent = null;
var availablePage = 1;

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

function renderSemesterOptions(semesters) {
  var select = document.getElementById('semester-input');
  if (!select) return;
  select.innerHTML = '<option value="">Chọn học kỳ</option>' + (semesters || []).map(function(item) {
    var yearName = item.NAMHOC ? item.NAMHOC.TenNamHoc : '';
    return '<option value="' + item.MaHocKy + '">' + item.TenHocKy + (yearName ? ' - ' + yearName : '') + '</option>';
  }).join('');
  if (semesters && semesters.length) select.value = semesters[0].MaHocKy;
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

  loading.classList.remove('hidden');
  table.classList.add('hidden');
  empty.classList.add('hidden');

  try {
    var url = '/api/registrations/available?MaHocKy=' + encodeURIComponent(semester) + '&page=' + availablePage;
    if (search) url += '&search=' + encodeURIComponent(search);
    var res = await apiFetch(url);

    loading.classList.add('hidden');
    table.classList.remove('hidden');
    renderAvailablePagination(res.pagination || {});

    if (res.success && res.data && res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(c) {
        var max = Number(c.SoLuongToiDa || 0);
        var registered = Number(c.SoLuongDaDangKy || 0);
        var remaining = Math.max(max - registered, 0);
        return '<tr>' +
          '<td class="mono">' + (c.MaLop || '-') + '</td>' +
          '<td><strong>' + (c.TenMonHoc || '-') + '</strong><small>' + (c.TenKhoa || '') + '</small></td>' +
          '<td>' + (c.SoTinChi || '-') + '</td>' +
          '<td>' + (c.GiangVien || '-') + '</td>' +
          '<td>' + (c.LichHoc || '-') + '</td>' +
          '<td>' + (c.PhongHoc || '-') + '</td>' +
          '<td><span class="badge ' + registrationBadgeClass(c.LoaiDangKy) + '">' + (c.LoaiDangKyLabel || 'Học mới') + '</span></td>' +
          '<td class="currency">' + formatCurrency(c.ThanhTienDuKien || 0) + '</td>' +
          '<td>' + registered + ' / ' + (max || '-') + '</td>' +
          '<td>' + (remaining > 0
            ? '<button class="btn btn-sm btn-primary" type="button" onclick="registerCourse(\'' + c.MaLop + '\', \'' + c.MaHocKy + '\')">Đăng ký</button>'
            : '<span class="badge badge-error">Hết chỗ</span>') + '</td>' +
        '</tr>';
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state">Không có lớp mở để đăng ký</div></td></tr>';
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
      loadAvailableCourses(1);
    });
  }
  initializeRegistrationPage();
});
