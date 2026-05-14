(async function() {
  try {
    var token = getToken();
    var headers = { Authorization: 'Bearer ' + token };

    var responses = await Promise.all([
      fetch('/api/students/stats', { headers: headers }).then(function(r) { return r.json(); }).catch(function() { return null; }),
      fetch('/api/courses/stats', { headers: headers }).then(function(r) { return r.json(); }).catch(function() { return null; }),
      fetch('/api/registrations/stats', { headers: headers }).then(function(r) { return r.json(); }).catch(function() { return null; }),
      fetch('/api/tuition/stats', { headers: headers }).then(function(r) { return r.json(); }).catch(function() { return null; }),
      fetch('/api/payments/stats', { headers: headers }).then(function(r) { return r.json(); }).catch(function() { return null; })
    ]);

    var sRes = responses[0];
    var cRes = responses[1];
    var rRes = responses[2];
    var tRes = responses[3];
    var pRes = responses[4];

    if (sRes && sRes.success) {
      document.getElementById('stat-students').textContent = sRes.data.total || 0;
      var studentHtml = '';
      var stats = sRes.data.by_status || sRes.data.byStatus || [];
      stats.forEach(function(s) {
        studentHtml += '<tr><td>' + (s.TrangThai || s.trang_thai || '-') + '</td><td>' + (s.count || 0) + '</td></tr>';
      });
      document.getElementById('student-stats-table').innerHTML = studentHtml || '<tr><td colspan="2"><div class="empty-state">Không có dữ liệu</div></td></tr>';
    }

    if (cRes && cRes.success) document.getElementById('stat-courses').textContent = cRes.data.total || 0;
    if (rRes && rRes.success) document.getElementById('stat-registrations').textContent = rRes.data.totalRegistrations || rRes.data.total || 0;

    if (tRes && tRes.success) {
      document.getElementById('stat-paid').textContent = formatCurrency(tRes.data.total_paid || tRes.data.paidAmount || 0);
      document.getElementById('stat-remaining').textContent = formatCurrency(tRes.data.total_remaining || tRes.data.remainingAmount || 0);
    }

    if (pRes && pRes.success) {
      var rows = pRes.data.by_method || pRes.data.byMethod || [];
      var paymentHtml = '';
      rows.forEach(function(m) {
        paymentHtml += '<tr><td>' + (m.HinhThucThu || m.phuong_thuc || '-') + '</td><td>' + (m.count || 0) + '</td><td>' + formatCurrency(m.total || 0) + '</td></tr>';
      });
      if (!paymentHtml) {
        paymentHtml = '<tr><td>Tất cả</td><td>' + (pRes.data.totalReceipts || 0) + '</td><td>' + formatCurrency(pRes.data.totalAmount || 0) + '</td></tr>';
      }
      document.getElementById('payment-stats-table').innerHTML = paymentHtml;
    }
  } catch (e) {
    console.error('Error loading reports:', e);
  }
})();
