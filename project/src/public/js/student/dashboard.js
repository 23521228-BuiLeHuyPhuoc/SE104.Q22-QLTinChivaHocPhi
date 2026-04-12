(async function() {
  try {
    const token = getToken();
    const headers = { 'Authorization': 'Bearer ' + token };

    // Load notifications
    const nRes = await fetch('/api/notifications', { headers }).then(r => r.json()).catch(() => null);
    const notifEl = document.getElementById('notifications-list');
    if (nRes && nRes.success && nRes.data && nRes.data.length > 0) {
      var html = '';
      nRes.data.slice(0, 5).forEach(n => {
        html += '<div style="padding: 10px 0; border-bottom: 1px solid var(--border-light);">';
        html += '<strong>' + (n.TieuDe || 'Thông báo') + '</strong>';
        html += '<p style="color: var(--text-tertiary); font-size: 0.875rem;">' + (n.NoiDung || '') + '</p>';
        html += '</div>';
      });
      notifEl.innerHTML = html;
    } else {
      notifEl.innerHTML = '<p class="text-muted">Không có thông báo mới</p>';
    }

    // Load student stats
    const meRes = await fetch('/api/auth/me', { headers }).then(r => r.json()).catch(() => null);
    if (meRes && meRes.success && meRes.data.student) {
      const sid = meRes.data.student.MaSv;
      const [regRes, tRes] = await Promise.all([
        fetch('/api/registrations/student/' + sid, { headers }).then(r => r.json()).catch(() => null),
        fetch('/api/tuition/student/' + sid, { headers }).then(r => r.json()).catch(() => null)
      ]);
      if (regRes && regRes.success) {
        document.getElementById('stat-courses').textContent = regRes.data.courses ? regRes.data.courses.length : 0;
        document.getElementById('stat-credits').textContent = regRes.data.summary ? regRes.data.summary.totalCredits : 0;
      }
      if (tRes && tRes.success && tRes.data && tRes.data.length > 0) {
        var totalFee = 0, totalPaid = 0;
        tRes.data.forEach(t => {
          totalFee += parseFloat(t.TongTienPhaiDong || 0);
          totalPaid += parseFloat(t.TongTienDaDong || 0);
        });
        document.getElementById('stat-tuition').textContent = formatCurrency(totalFee);
        document.getElementById('stat-debt').textContent = formatCurrency(totalFee - totalPaid);
      }
    }
  } catch(e) {
    console.error('Error loading dashboard:', e);
  }
})();
