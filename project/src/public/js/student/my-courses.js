var currentStudent = null;

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

async function ensureCurrentStudent() {
  if (currentStudent) return currentStudent;
  var meRes = await apiFetch('/api/auth/me');
  if (meRes.success && meRes.data.student) currentStudent = meRes.data.student;
  return currentStudent;
}

async function loadMyCourses(page) {
  var loading = document.getElementById('loading');
  var table = document.getElementById('courses-table');
  var tbody = document.getElementById('my-courses');

  if (loading) loading.classList.remove('hidden');
  if (table) table.classList.add('hidden');

  try {
    var student = await ensureCurrentStudent();
    if (!student) return;

    var res = await apiFetch('/api/registrations/student/' + student.MaSv + '?page=' + (page || 1));
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');

    var courses = res && res.success && res.data ? (res.data.courses || []) : [];
    if (courses.length > 0) {
      tbody.innerHTML = courses.map(function(c) {
        var lop = c.LOP || {};
        var mon = lop.MONHOC || {};
        var isCancelled = String(c.TrangThai || '').toLowerCase().indexOf('hủy') >= 0;
        var isPaymentLocked = c.KhoaHuyDangKy || (c.PHIEUDANGKY && c.PHIEUDANGKY.DaCoPhieuThuThanhCong);
        var actionHtml = '-';
        if (!isCancelled && c.CanHuy !== false) {
          actionHtml = '<button class="btn btn-sm btn-danger" type="button" onclick="cancelRegistration(' + c.id + ')">Hủy đăng ký</button>';
        } else if (!isCancelled && isPaymentLocked) {
          actionHtml = '<span class="badge badge-warning" title="' + myCoursesEscapeHtml(c.LyDoKhongTheHuy || '') + '">Đã thu HP</span>';
        }
        return '<tr>' +
          '<td class="mono">' + myCoursesEscapeHtml(lop.MaLop || c.MaLop || '-') + '</td>' +
          '<td><strong>' + myCoursesEscapeHtml(mon.TenMonHoc || '-') + '</strong><small>' + myCoursesEscapeHtml(mon.MaMonHoc || c.MaMonHoc || '') + '</small></td>' +
          '<td>' + (c.SoTinChi || '-') + '</td>' +
          '<td><span class="badge ' + registrationBadgeClass(c.LoaiDangKy) + '">' + myCoursesEscapeHtml(c.LoaiDangKyLabel || 'Học mới') + '</span></td>' +
          '<td>' + myCoursesEscapeHtml(lop.GiangVien || '-') + '</td>' +
          '<td>' + myCoursesEscapeHtml(lop.LichHoc || '-') + '</td>' +
          '<td>' + myCoursesEscapeHtml(lop.PhongHoc || '-') + '</td>' +
          '<td>' + (isCancelled ? '<span class="badge badge-error">Đã hủy</span>' : '<span class="badge badge-success">Đã đăng ký</span>') + '</td>' +
          '<td>' + actionHtml + '</td>' +
        '</tr>';
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state">Chưa đăng ký môn nào</div></td></tr>';
    }

    renderClientPagination('my-courses-pagination', res.pagination, 'loadMyCourses');
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
  }
}

async function cancelRegistration(id) {
  if (!confirm('Bạn có chắc muốn hủy đăng ký?')) return;
  try {
    var res = await apiFetch('/api/registrations/' + id + '/cancel', { method: 'PUT' });
    if (res.success) {
      showToast('Đã hủy đăng ký', 'success');
      loadMyCourses(1);
    } else {
      showToast(res.message || 'Không thể hủy đăng ký', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadMyCourses(1);
});
