var currentStudent = null;

async function ensureStudent() {
  if (currentStudent) return currentStudent;
  var meRes = await apiFetch('/api/auth/me');
  if (meRes.success && meRes.data.student) currentStudent = meRes.data.student;
  return currentStudent;
}

async function initializeRegistrationPage() {
  try {
    await ensureStudent();
    var active = await apiFetch('/api/semesters/active').catch(function() { return null; });
    if (active && active.success && active.data && active.data.MaHocKy) {
      document.getElementById('semester-input').value = active.data.MaHocKy;
      loadAvailableCourses();
    }
  } catch (e) {}
}

async function loadAvailableCourses() {
  var semester = document.getElementById('semester-input').value.trim();
  var search = document.getElementById('course-search').value.trim();
  var empty = document.getElementById('available-empty');
  var loading = document.getElementById('loading');
  var table = document.getElementById('courses-table');
  var tbody = document.getElementById('available-courses');

  if (!semester) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    empty.textContent = 'Vui lòng nhập mã học kỳ';
    return;
  }

  loading.classList.remove('hidden');
  table.classList.add('hidden');
  empty.classList.add('hidden');

  try {
    var url = '/api/registrations/available?MaHocKy=' + encodeURIComponent(semester);
    if (search) url += '&search=' + encodeURIComponent(search);
    var res = await apiFetch(url);

    loading.classList.add('hidden');
    table.classList.remove('hidden');

    if (res.success && res.data && res.data.length > 0) {
      var html = '';
      res.data.forEach(function(c) {
        var max = Number(c.SoLuongToiDa || 0);
        var registered = Number(c.SoLuongDaDangKy || 0);
        var remaining = Math.max(max - registered, 0);
        html += '<tr>';
        html += '<td class="mono">' + (c.MaLop || '-') + '</td>';
        html += '<td><strong>' + (c.TenMonHoc || '-') + '</strong><small>' + (c.TenKhoa || '') + '</small></td>';
        html += '<td>' + (c.SoTinChi || '-') + '</td>';
        html += '<td>' + (c.GiangVien || '-') + '</td>';
        html += '<td>' + (c.LichHoc || '-') + '</td>';
        html += '<td>' + (c.PhongHoc || '-') + '</td>';
        html += '<td>' + remaining + '</td>';
        html += '<td>';
        if (remaining > 0) {
          html += '<button class="btn btn-sm btn-primary" type="button" onclick="registerCourse(\'' + c.MaLop + '\', \'' + c.MaHocKy + '\')">Đăng ký</button>';
        } else {
          html += '<span class="badge badge-error">Hết chỗ</span>';
        }
        html += '</td></tr>';
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Không có lớp mở để đăng ký</div></td></tr>';
    }
  } catch (e) {
    loading.classList.add('hidden');
    table.classList.remove('hidden');
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
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
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể đăng ký', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var search = document.getElementById('course-search');
  if (search) {
    search.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') loadAvailableCourses();
    });
  }
  initializeRegistrationPage();
});
