(async function() {
  try {
    var token = getToken();
    var headers = { Authorization: 'Bearer ' + token };

    var nRes = await fetch('/api/notifications', { headers: headers }).then(function(r) { return r.json(); }).catch(function() { return null; });
    var notifEl = document.getElementById('notifications-list');
    if (nRes && nRes.success && nRes.data && nRes.data.length > 0) {
      var html = '';
      nRes.data.slice(0, 5).forEach(function(n) {
        html += '<div class="notice-item">';
        html += '<strong>' + (n.TieuDe || 'Thông báo') + '</strong>';
        html += '<p>' + (n.NoiDung || '') + '</p>';
        html += '</div>';
      });
      notifEl.innerHTML = html;
    } else {
      notifEl.innerHTML = '<div class="empty-state">Không có thông báo mới</div>';
    }

    var meRes = await fetch('/api/auth/me', { headers: headers }).then(function(r) { return r.json(); }).catch(function() { return null; });
    if (meRes && meRes.success && meRes.data.student) {
      var sid = meRes.data.student.MaSv;
      var responses = await Promise.all([
        fetch('/api/registrations/student/' + sid, { headers: headers }).then(function(r) { return r.json(); }).catch(function() { return null; }),
        fetch('/api/tuition/student/' + sid, { headers: headers }).then(function(r) { return r.json(); }).catch(function() { return null; })
      ]);
      var regRes = responses[0];
      var tRes = responses[1];

      if (regRes && regRes.success) {
        document.getElementById('stat-courses').textContent = regRes.data.courses ? regRes.data.courses.length : 0;
        document.getElementById('stat-credits').textContent = regRes.data.summary ? regRes.data.summary.totalCredits : 0;
      }

      if (tRes && tRes.success && tRes.data && tRes.data.length > 0) {
        var totalFee = 0;
        var totalPaid = 0;
        tRes.data.forEach(function(t) {
          totalFee += Number(t.TongTienPhaiDong || 0);
          totalPaid += Number(t.TongTienDaDong || 0);
        });
        document.getElementById('stat-tuition').textContent = formatCurrency(totalFee);
        document.getElementById('stat-debt').textContent = formatCurrency(Math.max(totalFee - totalPaid, 0));
      } else {
        document.getElementById('stat-tuition').textContent = formatCurrency(0);
        document.getElementById('stat-debt').textContent = formatCurrency(0);
      }
    }
  } catch (e) {
    console.error('Error loading dashboard:', e);
  }
})();
