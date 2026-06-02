function appealSafe(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function appealBadge(status) {
  if (status === 'cho_duyet') return 'badge-warning';
  if (status === 'da_duyet') return 'badge-success';
  if (status === 'tu_choi') return 'badge-error';
  return 'badge-secondary';
}

function appealContent(row) {
  if (row.LoaiDon === 'them') return 'Thêm: ' + (row.MaLopThem || '-') + (row.MonHocThem ? ' - ' + row.MonHocThem : '');
  if (row.LoaiDon === 'huy') return 'Hủy: ' + (row.MaLopHuy || '-') + (row.MonHocHuy ? ' - ' + row.MonHocHuy : '');
  return 'Đổi: ' + (row.MaLopHuy || '-') + ' -> ' + (row.MaLopThem || '-');
}

function renderAppealRows(rows) {
  var tbody = document.getElementById('appeal-table-body');
  var count = document.getElementById('appeal-count');
  if (count) count.textContent = (rows || []).length + ' bản ghi';
  if (!tbody) return;
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Không có đơn cứu xét phù hợp</div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(function(row) {
    var actions = row.TrangThai === 'cho_duyet'
      ? '<button class="btn btn-sm btn-success" type="button" onclick="approveAppeal(' + row.id + ')">Duyệt</button> ' +
        '<button class="btn btn-sm btn-danger" type="button" onclick="rejectAppeal(' + row.id + ')">Từ chối</button>'
      : '<span class="text-muted">-</span>';
    return '<tr>' +
      '<td class="mono">#' + appealSafe(row.id) + '</td>' +
      '<td><strong>' + appealSafe(row.MaSv) + '</strong><small>' + appealSafe(row.HoTen || '') + '</small></td>' +
      '<td>' + appealSafe(row.TenHocKy || row.MaHocKy || '-') + (row.TenNamHoc ? '<small>' + appealSafe(row.TenNamHoc) + '</small>' : '') + '</td>' +
      '<td>' + appealSafe(row.LoaiDonLabel || row.LoaiDon || '-') + '</td>' +
      '<td>' + appealSafe(appealContent(row)) + '</td>' +
      '<td>' + appealSafe(row.TrangThai === 'tu_choi' ? (row.LyDoTuChoi || row.LyDo) : row.LyDo || '-') + '</td>' +
      '<td><span class="badge ' + appealBadge(row.TrangThai) + '">' + appealSafe(row.TrangThaiLabel || row.TrangThai || '-') + '</span></td>' +
      '<td class="table-actions">' + actions + '</td>' +
    '</tr>';
  }).join('');
}

function renderAppealPagination(meta) {
  renderClientPagination('appeal-pagination', meta, 'loadAppeals');
}

function buildAppealParams(page) {
  var params = new URLSearchParams();
  params.set('page', String(page || 1));
  var semester = document.getElementById('appeal-semester');
  var type = document.getElementById('appeal-type');
  var status = document.getElementById('appeal-status');
  if (semester && semester.value) params.set('MaHocKy', semester.value);
  if (type && type.value) params.set('LoaiDon', type.value);
  if (status && status.value) params.set('TrangThai', status.value);
  return params;
}

async function loadAppeals(page) {
  var tbody = document.getElementById('appeal-table-body');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Đang tải đơn cứu xét...</div></td></tr>';
  try {
    var res = await apiFetch('/api/appeals?' + buildAppealParams(page || 1).toString());
    if (!res || res.success === false) {
      showToast((res && res.message) || 'Không tải được đơn cứu xét', 'error');
      renderAppealRows([]);
      renderAppealPagination(null);
      return;
    }
    renderAppealRows(res.data || []);
    renderAppealPagination(res.pagination);
  } catch (e) {
    renderAppealRows([]);
    renderAppealPagination(null);
    showToast('Lỗi tải đơn cứu xét', 'error');
  }
}

async function approveAppeal(id) {
  if (!confirm('Duyệt đơn cứu xét này?')) return;
  var res = await apiFetch('/api/appeals/' + encodeURIComponent(id) + '/approve', { method: 'PUT' });
  if (res && res.success) {
    showToast('Đã duyệt đơn cứu xét', 'success');
    loadAppeals(1);
  } else {
    showToast((res && res.message) || 'Không thể duyệt đơn', 'error');
  }
}

async function rejectAppeal(id) {
  var reason = prompt('Nhập lý do từ chối');
  if (!reason) return;
  var res = await apiFetch('/api/appeals/' + encodeURIComponent(id) + '/reject', { method: 'PUT', body: { LyDoTuChoi: reason } });
  if (res && res.success) {
    showToast('Đã từ chối đơn cứu xét', 'success');
    loadAppeals(1);
  } else {
    showToast((res && res.message) || 'Không thể từ chối đơn', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadAppeals(1);
});
