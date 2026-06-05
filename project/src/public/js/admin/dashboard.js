function dashboardSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderDashboardChart(canvasId, config) {
  var canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  return new Chart(canvas, config);
}

async function loadDashboardStats() {
  var res = await apiFetch('/api/dashboard/stats');
  if (!res || res.success === false) return;
  var stats = res.data || {};
  var students = document.getElementById('stat-students');
  var courses = document.getElementById('stat-courses');
  var openedClasses = document.getElementById('stat-opened-classes');
  var registrations = document.getElementById('stat-registrations');
  var revenue = document.getElementById('stat-revenue');
  if (students) students.textContent = stats.totalStudents || 0;
  if (courses) courses.textContent = stats.totalCourses || 0;
  if (openedClasses) openedClasses.textContent = stats.openedClasses || 0;
  if (registrations) registrations.textContent = stats.registrations || 0;
  if (revenue) revenue.textContent = formatCurrency(stats.paidAmount || 0);
}

async function loadDashboardCharts() {
  var currentYear = new Date().getFullYear();
  var responses = await Promise.all([
    apiFetch('/api/dashboard/revenue-monthly?year=' + currentYear).catch(function() { return null; }),
    apiFetch('/api/dashboard/registration-by-semester').catch(function() { return null; })
  ]);
  var revenueRes = responses[0];
  var registrationRes = responses[1];

  if (revenueRes && revenueRes.success) {
    var revenue = revenueRes.data || [];
    renderDashboardChart('dashboard-revenue-chart', {
      type: 'line',
      data: {
        labels: revenue.map(function(row) { return 'T' + row.month; }),
        datasets: [{ label: 'Doanh thu', data: revenue.map(function(row) { return row.amount || 0; }), borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,.15)', fill: true, tension: 0.3 }]
      },
      options: { responsive: true, scales: { y: { ticks: { callback: function(value) { return Number(value).toLocaleString('vi-VN'); } } } } }
    });
  }

  if (registrationRes && registrationRes.success) {
    var registrations = registrationRes.data || [];
    renderDashboardChart('dashboard-registration-chart', {
      type: 'bar',
      data: {
        labels: registrations.map(function(row) { return row.label || row.MaHocKy; }),
        datasets: [{ label: 'Lượt đăng ký', data: registrations.map(function(row) { return row.count || 0; }), backgroundColor: '#22c55e' }]
      },
      options: { responsive: true }
    });
  }
}

async function loadDebtTable() {
  var tbody = document.getElementById('dashboard-debt-table');
  if (!tbody) return;
  var res = await apiFetch('/api/dashboard/students-owing').catch(function() { return null; });
  if (!res || res.success === false) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state text-error">Không tải được công nợ</div></td></tr>';
    return;
  }
  var rows = (res.data || []).slice(0, 5);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">Không có sinh viên còn nợ</div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(function(row) {
    return '<tr>' +
      '<td class="mono">' + dashboardSafe(row.MSSV || row.MaSv) + '</td>' +
      '<td>' + dashboardSafe(row.HoTen) + '</td>' +
      '<td>' + dashboardSafe(row.TenHocKy || row.MaHocKy) + '</td>' +
      '<td class="currency text-danger">' + formatCurrency(row.ConNo || 0) + '</td>' +
    '</tr>';
  }).join('');
}

async function loadRecentActivity() {
  var container = document.getElementById('dashboard-activity-list');
  if (!container) return;
  var res = await apiFetch('/api/dashboard/recent-activity').catch(function() { return null; });
  if (!res || res.success === false) {
    container.innerHTML = '<div class="empty-state text-error">Không tải được hoạt động</div>';
    return;
  }
  var rows = res.data || [];
  if (!rows.length) {
    container.innerHTML = '<div class="empty-state">Chưa có hoạt động gần đây</div>';
    return;
  }
  container.innerHTML = rows.map(function(item) {
    return '<div class="notice-item">' +
      '<div class="notice-header"><strong>' + dashboardSafe(item.title) + '</strong><small>' + (item.date ? formatDate(item.date) : '') + '</small></div>' +
      '<p>' + dashboardSafe(item.description || '') + '</p>' +
    '</div>';
  }).join('');
}

(async function() {
  try {
    await Promise.all([
      loadDashboardStats(),
      loadDashboardCharts(),
      loadDebtTable(),
      loadRecentActivity()
    ]);
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
})();
