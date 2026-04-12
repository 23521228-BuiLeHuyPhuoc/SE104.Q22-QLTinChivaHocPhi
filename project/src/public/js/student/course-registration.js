(async function() {
  try {
    const res = await apiFetch('/api/registrations/available');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('courses-table').classList.remove('hidden');

    const tbody = document.getElementById('available-courses');
    if (res.success && res.data && res.data.length > 0) {
      var html = '';
      res.data.forEach(c => {
        var remaining = (c.so_luong_toi_da || 0) - (c.so_luong_hien_tai || 0);
        html += '<tr>';
        html += '<td>' + (c.ma_lop || '-') + '</td>';
        html += '<td>' + (c.ten_mon_hoc || '-') + '</td>';
        html += '<td>' + (c.so_tin_chi || '-') + '</td>';
        html += '<td>' + (c.giang_vien || '-') + '</td>';
        html += '<td>' + (c.lich_hoc || '-') + '</td>';
        html += '<td>' + (c.phong_hoc || '-') + '</td>';
        html += '<td>' + remaining + '</td>';
        html += '<td>';
        if (remaining > 0) {
          html += '<button class="btn btn-sm btn-primary" onclick="registerCourse(\'' + c.ma_lop_mo + '\')">Đăng ký</button>';
        } else {
          html += '<span class="badge badge-error">Hết chỗ</span>';
        }
        html += '</td></tr>';
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không có lớp mở để đăng ký</td></tr>';
    }
  } catch(e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('courses-table').classList.remove('hidden');
    document.getElementById('available-courses').innerHTML = '<tr><td colspan="8" class="text-center text-error">Lỗi tải dữ liệu</td></tr>';
  }
})();

async function registerCourse(maLopMo) {
  if (!confirm('Bạn có chắc muốn đăng ký lớp này?')) return;
  try {
    const res = await apiFetch('/api/registrations', { method: 'POST', body: { ma_lop_mo: maLopMo } });
    if (res.success) {
      showToast('Đăng ký thành công!', 'success');
      setTimeout(() => location.reload(), 500);
    } else {
      showToast(res.message || 'Lỗi đăng ký', 'error');
    }
  } catch(e) {
    showToast('Lỗi kết nối', 'error');
  }
}
