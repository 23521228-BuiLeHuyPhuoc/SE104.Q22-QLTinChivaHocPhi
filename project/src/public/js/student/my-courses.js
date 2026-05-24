(async function() {
  try {
    var meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    var sid = meRes.data.student.MaSv;

    var res = await apiFetch('/api/registrations/student/' + sid);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('courses-table').classList.remove('hidden');

    var tbody = document.getElementById('my-courses');
    if (res.success && res.data.courses && res.data.courses.length > 0) {
      var html = '';
      res.data.courses.forEach(function(c) {
        var isCancelled = String(c.TrangThai || '').toLowerCase().indexOf('hủy') >= 0;
        html += '<tr>';
        html += '<td class="mono">' + (c.LOP.MaLop || '-') + '</td>';
        html += '<td><strong>' + (c.LOP.MONHOC.TenMonHoc || '-') + '</strong><small>' + (c.LOP.MONHOC.MaMonHoc || '') + '</small></td>';
        html += '<td>' + (c.SoTinChi || '-') + '</td>';
        html += '<td><span class="badge ' + registrationBadgeClass(c.LoaiDangKy) + '">' + (c.LoaiDangKyLabel || 'Học mới') + '</span></td>';
        html += '<td>' + (c.LOP.GiangVien || '-') + '</td>';
        html += '<td>' + (c.LOP.LichHoc || '-') + '</td>';
        html += '<td>' + (c.LOP.PhongHoc || '-') + '</td>';
        html += '<td>' + (isCancelled ? '<span class="badge badge-error">Đã hủy</span>' : '<span class="badge badge-success">Đã đăng ký</span>') + '</td>';
        html += '<td>';
        if (!isCancelled) html += '<button class="btn btn-sm btn-danger" type="button" onclick="cancelRegistration(' + c.id + ')">Hủy đăng ký</button>';
        html += '</td></tr>';
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state">Chưa đăng ký môn nào</div></td></tr>';
    }
  } catch (e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('courses-table').classList.remove('hidden');
    document.getElementById('my-courses').innerHTML = '<tr><td colspan="9"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
  }
})();

function registrationBadgeClass(type) {
  if (type === 'hoc_lai') return 'badge-warning';
  if (type === 'hoc_cai_thien') return 'badge-info';
  return 'badge-success';
}

async function cancelRegistration(id) {
  if (!confirm('Bạn có chắc muốn hủy đăng ký?')) return;
  try {
    var res = await apiFetch('/api/registrations/' + id + '/cancel', { method: 'PUT' });
    if (res.success) {
      showToast('Đã hủy đăng ký', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể hủy đăng ký', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}
