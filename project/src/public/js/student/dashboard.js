function studentDashboardSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setDashboardText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

function todayVietnameseLabel() {
  var day = new Date().getDay();
  if (day === 0) return 'Chủ nhật';
  return 'Thứ ' + (day + 1);
}

function countTodayCourses(courses) {
  var label = todayVietnameseLabel();
  return (courses || []).filter(function(course) {
    var lichHoc = course.LOP && course.LOP.LichHoc ? course.LOP.LichHoc : '';
    return lichHoc.indexOf(label) >= 0;
  }).length;
}

async function loadDashboardNotifications() {
  var notifEl = document.getElementById('notifications-list');
  var nRes = await apiFetch('/api/notifications').catch(function() { return null; });
  if (nRes && nRes.success && nRes.data && nRes.data.length > 0) {
    notifEl.innerHTML = nRes.data.slice(0, 5).map(function(n) {
      return '<div class="notice-item ' + (!n.DaDoc ? 'unread' : '') + '">' +
        '<div class="notice-header"><strong>' + studentDashboardSafe(n.TieuDe || 'Thông báo') + '</strong><small>' + (n.NgayTao ? formatDate(n.NgayTao) : '') + '</small></div>' +
        '<p>' + studentDashboardSafe(n.NoiDung || '') + '</p>' +
      '</div>';
    }).join('');
  } else {
    notifEl.innerHTML = '<div class="empty-state">Không có thông báo mới</div>';
  }

  var countRes = await apiFetch('/api/notifications/unread-count').catch(function() { return null; });
  setDashboardText('stat-new-notifications', countRes && countRes.success ? (countRes.count || 0) : 0);
}

(async function() {
  try {
    await loadDashboardNotifications();

    var meRes = await apiFetch('/api/auth/me').catch(function() { return null; });
    if (meRes && meRes.success && meRes.data.student) {
      var sid = meRes.data.student.MaSv;
      var responses = await Promise.all([
        apiFetch('/api/registrations/student/' + sid + '?limit=100').catch(function() { return null; }),
        apiFetch('/api/tuition/student/' + sid + '?limit=100').catch(function() { return null; }),
        apiFetch('/api/completed-courses/me?limit=200').catch(function() { return null; })
      ]);
      var regRes = responses[0];
      var tRes = responses[1];
      var completedRes = responses[2];

      if (completedRes && completedRes.success) {
        setDashboardText('stat-completed-credits', completedRes.summary ? completedRes.summary.passedCredits || 0 : 0);
      } else {
        setDashboardText('stat-completed-credits', 0);
      }

      if (tRes && tRes.success) {
        setDashboardText('stat-debt', formatCurrency(tRes.summary ? tRes.summary.totalRemaining || 0 : 0));
      } else {
        setDashboardText('stat-debt', formatCurrency(0));
      }

      if (regRes && regRes.success) {
        var courses = regRes.data && regRes.data.courses ? regRes.data.courses : [];
        setDashboardText('stat-today-schedule', countTodayCourses(courses));
      } else {
        setDashboardText('stat-today-schedule', 0);
      }
    }
  } catch (e) {
    console.error('Error loading dashboard:', e);
  }
})();
