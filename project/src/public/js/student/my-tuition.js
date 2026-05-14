(async function() {
  try {
    var meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    var sid = meRes.data.student.MaSv;

    var res = await apiFetch('/api/tuition/student/' + sid);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('tuition-table').classList.remove('hidden');

    if (res.success && res.data && res.data.length > 0) {
      var totalFee = 0;
      var totalPaid = 0;
      var html = '';

      res.data.forEach(function(t) {
        var fee = Number(t.TongTienPhaiDong || 0);
        var paid = Number(t.TongTienDaDong || 0);
        var remaining = Math.max(fee - paid, 0);
        totalFee += fee;
        totalPaid += paid;

        html += '<tr>';
        html += '<td>' + (t.TenHocKy || '-') + '</td>';
        html += '<td class="currency">' + formatCurrency(fee) + '</td>';
        html += '<td class="currency">' + formatCurrency(paid) + '</td>';
        html += '<td class="currency ' + (remaining > 0 ? 'text-danger' : 'text-success') + '">' + formatCurrency(remaining) + '</td>';
        html += '<td>';
        if (remaining <= 0 && fee > 0) html += '<span class="badge badge-success">Đã đóng đủ</span>';
        else if (paid > 0 && remaining > 0) html += '<span class="badge badge-warning">Đóng một phần</span>';
        else html += '<span class="badge badge-error">Chưa đóng</span>';
        html += '</td></tr>';
      });

      document.getElementById('tuition-list').innerHTML = html;
      document.getElementById('total-fee').textContent = formatCurrency(totalFee);
      document.getElementById('total-paid').textContent = formatCurrency(totalPaid);
      document.getElementById('total-remaining').textContent = formatCurrency(Math.max(totalFee - totalPaid, 0));
    } else {
      document.getElementById('tuition-list').innerHTML = '<tr><td colspan="5"><div class="empty-state">Không có dữ liệu học phí</div></td></tr>';
      document.getElementById('total-fee').textContent = formatCurrency(0);
      document.getElementById('total-paid').textContent = formatCurrency(0);
      document.getElementById('total-remaining').textContent = formatCurrency(0);
    }
  } catch (e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('tuition-table').classList.remove('hidden');
    document.getElementById('tuition-list').innerHTML = '<tr><td colspan="5"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
  }
})();
