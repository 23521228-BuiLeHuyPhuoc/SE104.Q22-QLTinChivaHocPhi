function completedEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function completedResultBadge(result) {
  if (result === 'qua_mon') return '<span class="badge badge-success">Qua môn</span>';
  if (result === 'rot') return '<span class="badge badge-error">Rớt</span>';
  return '<span class="badge badge-secondary">-</span>';
}

function completedSemesterText(item) {
  var semester = item.HOCKY || {};
  var year = semester.NAMHOC || {};
  return completedEscapeHtml((semester.TenHocKy || item.MaHocKy || '-') + (year.TenNamHoc ? ' - ' + year.TenNamHoc : ''));
}

function updateCompletedSummary(summary) {
  document.getElementById('total-attempts').textContent = Number(summary.totalAttempts || 0);
  document.getElementById('passed-count').textContent = Number(summary.passedCount || 0);
  document.getElementById('failed-count').textContent = Number(summary.failedCount || 0);
  document.getElementById('passed-credits').textContent = Number(summary.passedCredits || 0);
}

function renderCompletedCourses(rows) {
  var tbody = document.getElementById('completed-list');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Chưa có môn đã học</div></td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function(item) {
    var course = item.MONHOC || {};
    var cls = item.LOP || {};
    return [
      '<tr>',
      '<td class="mono">' + completedEscapeHtml(item.MaMonHoc || course.MaMonHoc || '-') + '</td>',
      '<td><strong>' + completedEscapeHtml(course.TenMonHoc || '-') + '</strong><small>' + completedEscapeHtml(course.LoaiMon || '') + '</small></td>',
      '<td>' + Number(course.SoTinChi || 0) + '</td>',
      '<td>' + completedSemesterText(item) + '</td>',
      '<td><span class="mono">' + completedEscapeHtml(item.MaLop || '-') + '</span><small>' + completedEscapeHtml(cls.TenLop || '') + '</small></td>',
      '<td>' + Number(item.LanHoc || 1) + '</td>',
      '<td>' + completedResultBadge(item.KetQua) + '</td>',
      '<td>' + completedEscapeHtml(item.GhiChu || '-') + '</td>',
      '</tr>'
    ].join('');
  }).join('');
}

async function loadCompletedCourses(page) {
  var loading = document.getElementById('completed-loading');
  var table = document.getElementById('completed-table');
  var search = document.getElementById('completed-search').value.trim();
  var result = document.getElementById('completed-result').value;
  var params = new URLSearchParams();
  params.set('page', page || 1);
  if (search) params.set('search', search);
  if (result) params.set('KetQua', result);

  loading.classList.remove('hidden');
  table.classList.add('hidden');

  try {
    var url = '/api/completed-courses/me?' + params.toString();
    var res = await apiFetch(url);
    loading.classList.add('hidden');
    table.classList.remove('hidden');

    if (!res.success) {
      document.getElementById('completed-list').innerHTML = '<tr><td colspan="8"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
      updateCompletedSummary({});
      renderClientPagination('completed-pagination', null, 'loadCompletedCourses');
      return;
    }

    updateCompletedSummary(res.summary || {});
    renderCompletedCourses(res.data || []);
    renderClientPagination('completed-pagination', res.pagination, 'loadCompletedCourses');
  } catch (e) {
    loading.classList.add('hidden');
    table.classList.remove('hidden');
    document.getElementById('completed-list').innerHTML = '<tr><td colspan="8"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
    updateCompletedSummary({});
    renderClientPagination('completed-pagination', null, 'loadCompletedCourses');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var searchTimer = null;
  document.getElementById('completed-result').addEventListener('change', function() { loadCompletedCourses(1); });
  document.getElementById('completed-search').addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() { loadCompletedCourses(1); }, 300);
  });
  loadCompletedCourses(1);
});
