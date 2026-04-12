(async function() {
  try {
    // Get student info
    const meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    const sid = meRes.data.student.MaSv;

    const res = await apiFetch('/api/registrations/student/' + sid);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('courses-table').classList.remove('hidden');

    const tbody = document.getElementById('my-courses');
    if (res.success && res.data.courses && res.data.courses.length > 0) {
      var html = '';
      res.data.courses.forEach(c => {
        html += '<tr>';
        html += '<td>' + (c.LOP.MaLop || '-') + '</td>';
        html += '<td>' + (c.LOP.MONHOC.TenMonHoc || '-') + '</td>';
        html += '<td>' + (c.SoTinChi || '-') + '</td>';
        html += '<td>' + (c.LOP.GiangVien || '-') + '</td>';
        html += '<td>' + (c.LOP.LichHoc || '-') + '</td>';
        html += '<td>' + (c.LOP.PhongHoc || '-') + '</td>';
        html += '<td>';
        if (c.TrangThai === 'Đã đăng ký') {
          html += '<span class="badge badge-success">Đã ĐK</span>';
        } else {
          html += '<span class="badge badge-error">Đã hủy</span>';
        }
        html += '</td>';
        html += '<td>';
        if (c.TrangThai === 'Đã đăng ký') {
          html += '<button class="btn btn-sm btn-danger" onclick="cancelRegistration(' + c.id + ')">Hủy ĐK</button>';
        }
        html += '</td></tr>';
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">Chưa đăng ký môn nào</td></tr>';
    }
  } catch(e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('courses-table').classList.remove('hidden');
    document.getElementById('my-courses').innerHTML = '<tr><td colspan="8" class="text-center text-error">Lỗi tải dữ liệu</td></tr>';
  }
})();

async function cancelRegistration(id) {
  if (!confirm('Bạn có chắc muốn hủy đăng ký?')) return;
  try {
    const res = await apiFetch('/api/registrations/' + id + '/cancel', { method: 'PUT' });
    if (res.success) {
      showToast('Đã hủy đăng ký', 'success');
      setTimeout(() => location.reload(), 500);
    } else {
      showToast(res.message || 'Lỗi', 'error');
    }
  } catch(e) { showToast('Lỗi kết nối', 'error'); }
}
