(async function() {
  try {
    const meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    const sid = meRes.data.student.MaSv;

    const res = await apiFetch('/api/tuition/student/' + sid);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('tuition-table').classList.remove('hidden');

    if (res.success && res.data && res.data.length > 0) {
      var totalFee = 0, totalPaid = 0;
      var html = '';
      res.data.forEach(t => {
        var fee = parseFloat(t.TongTienPhaiDong || 0);
        var paid = parseFloat(t.TongTienDaDong || 0);
        var remaining = fee - paid;
        totalFee += fee;
        totalPaid += paid;

        html += '<tr>';
        html += '<td>' + (t.TenHocKy || '-') + '</td>';
        html += '<td>' + formatCurrency(fee) + '</td>';
        html += '<td>' + formatCurrency(paid) + '</td>';
        html += '<td>' + formatCurrency(remaining) + '</td>';
        html += '<td>';
        if (remaining <= 0 && fee > 0) html += '<span class="badge badge-success">Đã đóng đủ</span>';
        else if (paid > 0 && remaining > 0) html += '<span class="badge badge-warning">Một phần</span>';
        else html += '<span class="badge badge-error">Chưa đóng</span>';
        html += '</td></tr>';
      });
      document.getElementById('tuition-list').innerHTML = html;
      document.getElementById('total-fee').textContent = formatCurrency(totalFee);
      document.getElementById('total-paid').textContent = formatCurrency(totalPaid);
      document.getElementById('total-remaining').textContent = formatCurrency(totalFee - totalPaid);
    } else {
      document.getElementById('tuition-list').innerHTML = '<tr><td colspan="5" class="text-center">Không có dữ liệu học phí</td></tr>';
    }
  } catch(e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('tuition-table').classList.remove('hidden');
    console.error(e);
  }
})();
