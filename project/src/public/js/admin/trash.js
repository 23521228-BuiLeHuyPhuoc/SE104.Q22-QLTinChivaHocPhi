var trashPage = 1;

function getTrashEntity() {
  var select = document.getElementById('trash-entity');
  return select ? select.value : 'students';
}

function renderTrashRows(items) {
  var tbody = document.getElementById('trash-body');
  var count = document.getElementById('trash-count');
  if (count) count.textContent = (items || []).length + ' bản ghi';
  if (!tbody) return;
  if (!items || !items.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Thùng rác đang trống</div></td></tr>';
    return;
  }

  tbody.innerHTML = items.map(function(item) {
    var deletedBy = item.deletedByName || item.deletedBy || item.NguoiXoa || '-';
    var deletedAt = item.deletedAt || item.NgayXoa;
    return '<tr>' +
      '<td>' + item.entityLabel + '</td>' +
      '<td class="mono">' + item.id + '</td>' +
      '<td>' + (item.title || '-') + '</td>' +
      '<td>' + deletedBy + '</td>' +
      '<td>' + (deletedAt ? formatDate(deletedAt) : '-') + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-sm btn-secondary" type="button" data-id="' + item.id + '" onclick="restoreTrashItem(this.dataset.id)">Khôi phục</button>' +
        '<button class="btn btn-sm btn-danger" type="button" data-id="' + item.id + '" onclick="purgeTrashItem(this.dataset.id)">Xóa hẳn</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function renderTrashPagination(meta) {
  var nav = document.getElementById('trash-pagination');
  if (!nav) return;
  var totalPages = Number(meta && meta.totalPages || 0);
  var current = Number(meta && meta.page || 1);
  if (totalPages <= 1) {
    nav.style.display = 'none';
    nav.innerHTML = '';
    return;
  }
  nav.style.display = '';
  var html = '';
  if (current > 1) html += '<button type="button" onclick="loadTrash(' + (current - 1) + ')">Trước</button>';
  for (var i = 1; i <= totalPages; i += 1) {
    html += '<button type="button" class="' + (i === current ? 'active' : '') + '" onclick="loadTrash(' + i + ')">' + i + '</button>';
  }
  if (current < totalPages) html += '<button type="button" onclick="loadTrash(' + (current + 1) + ')">Sau</button>';
  nav.innerHTML = html;
}

async function loadTrash(page) {
  trashPage = page || trashPage || 1;
  var entity = getTrashEntity();
  var tbody = document.getElementById('trash-body');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Đang tải dữ liệu...</div></td></tr>';
  var res = await apiFetch('/api/trash/' + encodeURIComponent(entity) + '?page=' + trashPage);
  if (!res || res.success === false) {
    showToast((res && res.message) || 'Không tải được thùng rác', 'error');
    renderTrashRows([]);
    return;
  }
  renderTrashRows(res.data || []);
  renderTrashPagination(res.pagination || {});
}

async function restoreTrashItem(id) {
  var entity = getTrashEntity();
  var res = await apiFetch('/api/trash/' + encodeURIComponent(entity) + '/' + encodeURIComponent(id) + '/restore', { method: 'POST' });
  if (!res || res.success === false) {
    showToast((res && res.message) || 'Không thể khôi phục bản ghi', 'error');
    return;
  }
  showToast('Đã khôi phục bản ghi', 'success');
  loadTrash(trashPage);
}

async function purgeTrashItem(id) {
  if (!confirm('Xóa vĩnh viễn bản ghi này?')) return;
  var entity = getTrashEntity();
  var res = await apiFetch('/api/trash/' + encodeURIComponent(entity) + '/' + encodeURIComponent(id) + '/purge', { method: 'DELETE' });
  if (!res || res.success === false) {
    showToast((res && res.message) || 'Không thể xóa vĩnh viễn bản ghi', 'error');
    return;
  }
  showToast('Đã xóa vĩnh viễn bản ghi', 'success');
  loadTrash(trashPage);
}

document.addEventListener('DOMContentLoaded', function() {
  loadTrash(1);
});
