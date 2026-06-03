var revenueChart = null;
var methodChart = null;
var debtSearchTimer = null;
var currentIncompleteRows = [];
var currentIncompleteSummary = {};

function reportSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getReportSemester() {
  var select = document.getElementById('report-semester');
  return select ? select.value : '';
}

function withSemester(url) {
  var semester = getReportSemester();
  if (!semester) return url;
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'MaHocKy=' + encodeURIComponent(semester);
}

function setText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderChart(canvasId, existingChart, config) {
  var canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return null;
  if (existingChart) existingChart.destroy();
  return new Chart(canvas, config);
}

async function loadReportStats() {
  var responses = await Promise.all([
    apiFetch('/api/students/stats').catch(function() { return null; }),
    apiFetch('/api/courses/stats').catch(function() { return null; }),
    apiFetch(withSemester('/api/registrations/stats')).catch(function() { return null; }),
    apiFetch(withSemester('/api/tuition/stats')).catch(function() { return null; }),
    apiFetch(withSemester('/api/payments/stats')).catch(function() { return null; }),
    apiFetch('/api/dashboard/revenue-monthly?year=' + new Date().getFullYear()).catch(function() { return null; })
  ]);

  var sRes = responses[0];
  var cRes = responses[1];
  var rRes = responses[2];
  var tRes = responses[3];
  var pRes = responses[4];
  var revenueRes = responses[5];

  if (sRes && sRes.success) {
    setText('stat-students', sRes.data.total || 0);
    var studentHtml = '';
    var stats = sRes.data.by_status || sRes.data.byStatus || [];
    stats.forEach(function(s) {
      studentHtml += '<tr><td>' + reportSafe(s.TrangThai || s.trang_thai || '-') + '</td><td>' + (s.count || 0) + '</td></tr>';
    });
    document.getElementById('student-stats-table').innerHTML = studentHtml || '<tr><td colspan="2"><div class="empty-state">Không có dữ liệu</div></td></tr>';
  }

  if (cRes && cRes.success) setText('stat-courses', cRes.data.total || 0);
  if (rRes && rRes.success) setText('stat-registrations', rRes.data.totalRegistrations || rRes.data.total || 0);
  if (tRes && tRes.success) {
    setText('stat-paid', formatCurrency(tRes.data.total_paid || tRes.data.paidAmount || 0));
    setText('stat-remaining', formatCurrency(tRes.data.total_remaining || tRes.data.remainingAmount || 0));
  }

  if (pRes && pRes.success) {
    var rows = pRes.data.by_method || pRes.data.byMethod || [];
    var paymentHtml = '';
    rows.forEach(function(m) {
      paymentHtml += '<tr><td>' + reportSafe(m.HinhThucThu || m.phuong_thuc || '-') + '</td><td>' + (m.count || 0) + '</td><td>' + formatCurrency(m.total || 0) + '</td></tr>';
    });
    if (!paymentHtml) paymentHtml = '<tr><td>Tất cả</td><td>' + (pRes.data.totalReceipts || 0) + '</td><td>' + formatCurrency(pRes.data.totalAmount || 0) + '</td></tr>';
    document.getElementById('payment-stats-table').innerHTML = paymentHtml;

    methodChart = renderChart('method-chart', methodChart, {
      type: 'pie',
      data: {
        labels: rows.map(function(m) { return m.HinhThucThu || m.PaymentProvider || 'Khác'; }),
        datasets: [{ data: rows.map(function(m) { return m.total || 0; }), backgroundColor: ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'] }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }

  if (revenueRes && revenueRes.success) {
    var revenueRows = revenueRes.data || [];
    revenueChart = renderChart('revenue-chart', revenueChart, {
      type: 'bar',
      data: {
        labels: revenueRows.map(function(row) { return 'T' + row.month; }),
        datasets: [{ label: 'Doanh thu', data: revenueRows.map(function(row) { return row.amount || 0; }), backgroundColor: '#0ea5e9' }]
      },
      options: {
        responsive: true,
        scales: { y: { ticks: { callback: function(value) { return Number(value).toLocaleString('vi-VN'); } } } }
      }
    });
  }
}

function buildDebtQuery() {
  var params = new URLSearchParams();
  var semester = getReportSemester();
  var search = document.getElementById('debt-search').value.trim();
  var faculty = document.getElementById('debt-faculty').value;
  var major = document.getElementById('debt-major').value;
  var status = document.getElementById('debt-status').value;
  var overdue = document.getElementById('debt-overdue').value;
  if (semester) params.set('MaHocKy', semester);
  if (search) params.set('search', search);
  if (faculty) params.set('MaKhoa', faculty);
  if (major) params.set('MaNganh', major);
  if (status) params.set('TrangThai', status);
  if (overdue) params.set('overdue', overdue);
  return params.toString();
}

function filterDebtMajors() {
  var faculty = document.getElementById('debt-faculty');
  var major = document.getElementById('debt-major');
  if (!faculty || !major) return;
  var selectedFaculty = faculty.value;
  Array.prototype.forEach.call(major.options, function(option) {
    if (!option.value) {
      option.hidden = false;
      return;
    }
    option.hidden = !!selectedFaculty && option.getAttribute('data-faculty') !== selectedFaculty;
  });
  if (major.selectedOptions[0] && major.selectedOptions[0].hidden) major.value = '';
}

function debtBadge(status) {
  if (status === 'Đóng một phần') return 'badge-warning';
  if (status === 'Quá hạn') return 'badge-error';
  return 'badge-error';
}

function renderIncompleteTuition(data) {
  currentIncompleteSummary = data.summary || {};
  currentIncompleteRows = data.rows || [];
  setText('debt-total-students', currentIncompleteSummary.totalStudents || 0);
  setText('debt-total-amount', formatCurrency(currentIncompleteSummary.totalDebt || 0));
  setText('debt-overdue-students', currentIncompleteSummary.overdueStudents || 0);
  setText('debt-partial-students', currentIncompleteSummary.partialStudents || 0);

  var tbody = document.getElementById('incomplete-tuition-table');
  if (!currentIncompleteRows.length) {
    tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state">Không có sinh viên còn nợ theo bộ lọc</div></td></tr>';
    return;
  }

  tbody.innerHTML = currentIncompleteRows.map(function(row) {
    return '<tr>' +
      '<td class="mono">' + reportSafe(row.MSSV || row.MaSv) + '</td>' +
      '<td>' + reportSafe(row.HoTen) + '</td>' +
      '<td>' + reportSafe([row.TenNganh, row.TenKhoa].filter(Boolean).join(' / ') || '-') + '</td>' +
      '<td>' + reportSafe([row.TenHocKy, row.TenNamHoc].filter(Boolean).join(' - ')) + '</td>' +
      '<td class="currency">' + formatCurrency(row.TongTienPhaiDong || 0) + '</td>' +
      '<td class="currency">' + formatCurrency(row.TongTienDaDong || 0) + '</td>' +
      '<td class="currency text-danger">' + formatCurrency(row.ConNo || 0) + '</td>' +
      '<td>' + (row.HanDongHocPhi ? formatDate(row.HanDongHocPhi) : '-') + '</td>' +
      '<td>' + (row.SoNgayQuaHan ? row.SoNgayQuaHan : '-') + '</td>' +
      '<td><span class="badge ' + debtBadge(row.TrangThai) + '">' + reportSafe(row.TrangThai) + '</span></td>' +
    '</tr>';
  }).join('');
}

async function loadIncompleteTuition() {
  var tbody = document.getElementById('incomplete-tuition-table');
  if (tbody) tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state">Đang tải dữ liệu...</div></td></tr>';
  try {
    var query = buildDebtQuery();
    var res = await apiFetch('/api/dashboard/incomplete-tuition' + (query ? '?' + query : ''));
    if (!res || res.success === false) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state text-error">' + reportSafe((res && res.message) || 'Không tải được báo cáo') + '</div></td></tr>';
      return;
    }
    renderIncompleteTuition(res.data || {});
  } catch (e) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state text-error">Lỗi tải báo cáo</div></td></tr>';
  }
}

function debounceDebtSearch() {
  clearTimeout(debtSearchTimer);
  debtSearchTimer = setTimeout(loadIncompleteTuition, 350);
}

function loadReports() {
  loadReportStats();
  loadIncompleteTuition();
}

function exportIncompleteCsv() {
  if (!currentIncompleteRows.length) {
    showToast('Không có dữ liệu để xuất', 'info');
    return;
  }
  var header = ['MSSV', 'Họ tên', 'Ngành', 'Khoa', 'Học kỳ', 'Phải đóng', 'Đã đóng', 'Còn nợ', 'Hạn đóng học phí', 'Số ngày quá hạn', 'Trạng thái'];
  var lines = [header.join(',')];
  currentIncompleteRows.forEach(function(row) {
    lines.push([
      row.MSSV || row.MaSv,
      row.HoTen,
      row.TenNganh,
      row.TenKhoa,
      [row.TenHocKy, row.TenNamHoc].filter(Boolean).join(' - '),
      row.TongTienPhaiDong,
      row.TongTienDaDong,
      row.ConNo,
      row.HanDongHocPhi ? formatDate(row.HanDongHocPhi) : '',
      row.SoNgayQuaHan || '',
      row.TrangThai
    ].map(function(value) {
      return '"' + String(value || '').replace(/"/g, '""') + '"';
    }).join(','));
  });
  var blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = 'sinh-vien-chua-hoan-thanh-hoc-phi.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printIncompleteReport() {
  if (!currentIncompleteRows.length) {
    showToast('Không có dữ liệu để in', 'info');
    return;
  }
  var rows = currentIncompleteRows.map(function(row) {
    return '<tr><td>' + reportSafe(row.MSSV || row.MaSv) + '</td><td>' + reportSafe(row.HoTen) + '</td><td>' + reportSafe(row.TenNganh || '-') + '</td><td>' + reportSafe(row.TenHocKy || '-') + '</td><td>' + formatCurrency(row.TongTienPhaiDong) + '</td><td>' + formatCurrency(row.TongTienDaDong) + '</td><td>' + formatCurrency(row.ConNo) + '</td><td>' + (row.HanDongHocPhi ? formatDate(row.HanDongHocPhi) : '-') + '</td><td>' + reportSafe(row.TrangThai) + '</td></tr>';
  }).join('');
  var win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) {
    showToast('Trình duyệt đang chặn cửa sổ in', 'error');
    return;
  }
  win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Báo cáo sinh viên chưa hoàn thành học phí</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:6px;font-size:12px}th{background:#f3f4f6}.summary{margin:12px 0}</style></head><body><h2>Báo cáo sinh viên chưa hoàn thành học phí</h2><div class="summary">Tổng SV: ' + (currentIncompleteSummary.totalStudents || 0) + ' | Tổng nợ: ' + formatCurrency(currentIncompleteSummary.totalDebt || 0) + ' | Quá hạn: ' + (currentIncompleteSummary.overdueStudents || 0) + '</div><table><thead><tr><th>MSSV</th><th>Họ tên</th><th>Ngành</th><th>Học kỳ</th><th>Phải đóng</th><th>Đã đóng</th><th>Còn nợ</th><th>Hạn đóng</th><th>Trạng thái</th></tr></thead><tbody>' + rows + '</tbody></table><script>window.onload=function(){window.print();}</script></body></html>');
  win.document.close();
}

document.addEventListener('DOMContentLoaded', function() {
  filterDebtMajors();
  loadReports();
});
