(async function() {
  try {
    var meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    var sid = meRes.data.student.MaSv;

    var res = await apiFetch('/api/payments/student/' + sid);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('payments-table').classList.remove('hidden');

    var tbody = document.getElementById('payment-list');
    if (res.success && res.data && res.data.length > 0) {
      var html = '';
      res.data.forEach(function(p) {
        html += '<tr>';
        html += '<td class="mono">' + (p.SoPhieuThu || '-') + '</td>';
        html += '<td>' + (p.TenHocKy || '-') + '</td>';
        html += '<td class="currency">' + formatCurrency(p.SoTienThu || 0) + '</td>';
        html += '<td>' + (p.HinhThucThu || '-') + '</td>';
        html += '<td>' + (p.NgayLap ? new Date(p.NgayLap).toLocaleDateString('vi-VN') : '-') + '</td>';
        html += '<td>' + (p.GhiChu || '-') + '</td>';
        html += '</tr>';
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Chưa có lịch sử thanh toán</div></td></tr>';
    }
  } catch (e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('payments-table').classList.remove('hidden');
    document.getElementById('payment-list').innerHTML = '<tr><td colspan="6"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
  }
})();
