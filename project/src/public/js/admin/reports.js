(async function() {
  try {
    const token = getToken();
    const headers = { 'Authorization': 'Bearer ' + token };

    const [sRes, cRes, rRes, tRes, pRes] = await Promise.all([
      fetch('/api/students/stats', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/courses/stats', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/registrations/stats', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/tuition/stats', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/payments/stats', { headers }).then(r => r.json()).catch(() => null)
    ]);

    if (sRes && sRes.success) {
      document.getElementById('stat-students').textContent = sRes.data.total || 0;
      // Student status table
      var html = '';
      if (sRes.data.by_status || sRes.data.byStatus) {
        let stats = sRes.data.by_status || sRes.data.byStatus;
        stats.forEach(s => {
          html += '<tr><td>' + (s.trang_thai || s.TrangThai || '-') + '</td><td>' + (s.count || s._count.MaSv || 0) + '</td></tr>';
        });
      }
      document.getElementById('student-stats-table').innerHTML = html || '<tr><td colspan="2">Không có dữ liệu</td></tr>';
    }

    if (cRes && cRes.success) {
      document.getElementById('stat-courses').textContent = cRes.data.total || 0;
    }
    if (rRes && rRes.success) {
      document.getElementById('stat-registrations').textContent = rRes.data.totalRegistrations || rRes.data.total || 0;
    }
    if (tRes && tRes.success) {
      document.getElementById('stat-paid').textContent = formatCurrency(tRes.data.total_paid || tRes.data.paidAmount || 0);
      document.getElementById('stat-remaining').textContent = formatCurrency(tRes.data.total_remaining || tRes.data.remainingAmount || 0);
    }
    if (pRes && pRes.success) {
      var html2 = '';
      if (pRes.data.by_method || pRes.data.byMethod) {
        let pstats = pRes.data.by_method || pRes.data.byMethod;
        pstats.forEach(m => {
          html2 += '<tr><td>' + (m.phuong_thuc || m.HinhThucThu || '-') + '</td><td>' + (m.count || m._count.SoPhieuThu || 0) + '</td><td>' + formatCurrency(m.total || m._sum.SoTienThu || 0) + '</td></tr>';
        });
      }
      document.getElementById('payment-stats-table').innerHTML = html2 || '<tr><td colspan="3">Không có dữ liệu</td></tr>';
    }
  } catch(e) {
    console.error('Error loading reports:', e);
  }
})();
