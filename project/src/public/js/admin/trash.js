var trashPage = 1;
var trashSearchTimer;

function trashSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getTrashEntity() {
  var select = document.getElementById('trash-entity');
  return select ? select.value : 'students';
}

function getTrashSearch() {
  var input = document.getElementById('trash-search');
  return input ? input.value.trim() : '';
}

function setInitialTrashEntity() {
  var select = document.getElementById('trash-entity');
  if (!select) return;
  var params = new URLSearchParams(window.location.search);
  var entity = params.get('entity');
  var search = params.get('search');
  if (search && document.getElementById('trash-search')) document.getElementById('trash-search').value = search;
  if (!entity) return;
  var exists = Array.prototype.some.call(select.options, function(option) {
    return option.value === entity;
  });
  if (exists) select.value = entity;
}

function syncTrashUrl(entity) {
  if (!window.history || !window.history.replaceState) return;
  var params = new URLSearchParams(window.location.search);
  params.set('entity', entity);
  var search = getTrashSearch();
  if (search) params.set('search', search);
  else params.delete('search');
  var query = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
}

function updateBulkButtons() {
  var ids = getSelectedTrashIds();
  var restore = document.getElementById('trash-restore-selected');
  var purge = document.getElementById('trash-purge-selected');
  if (restore) restore.disabled = ids.length === 0;
  if (purge) purge.disabled = ids.length === 0;
}

function getSelectedTrashIds() {
  return Array.prototype.map.call(document.querySelectorAll('.trash-row-check:checked'), function(input) {
    return input.value;
  });
}

function toggleAllTrashRows(master) {
  document.querySelectorAll('.trash-row-check').forEach(function(input) {
    input.checked = master.checked;
  });
  updateBulkButtons();
}

function renderTrashRows(items) {
  var tbody = document.getElementById('trash-body');
  var count = document.getElementById('trash-count');
  var selectAll = document.getElementById('trash-select-all');
  if (selectAll) selectAll.checked = false;
  if (count) count.textContent = (items || []).length + ' bản ghi';
  if (!tbody) return;
  if (!items || !items.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Thùng rác đang trống</div></td></tr>';
    updateBulkButtons();
    return;
  }

  tbody.innerHTML = items.map(function(item) {
    var deletedBy = item.deletedByName || item.deletedBy || item.NguoiXoa || '-';
    var deletedAt = item.deletedAt || item.NgayXoa;
    var id = trashSafe(item.id);
    return '<tr>' +
      '<td><input class="trash-row-check" type="checkbox" value="' + id + '" onchange="updateBulkButtons()"></td>' +
      '<td>' + trashSafe(item.entityLabel) + '</td>' +
      '<td class="mono">' + id + '</td>' +
      '<td>' + trashSafe(item.title || '-') + '</td>' +
      '<td>' + trashSafe(deletedBy) + '</td>' +
      '<td>' + (deletedAt ? formatDate(deletedAt) : '-') + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-sm btn-secondary" type="button" data-id="' + id + '" onclick="restoreTrashItem(this.dataset.id)">Khôi phục</button>' +
        '<button class="btn btn-sm btn-danger" type="button" data-id="' + id + '" onclick="purgeTrashItem(this.dataset.id)">Xóa hẳn</button>' +
      '</td>' +
    '</tr>';
  }).join('');
  updateBulkButtons();
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
  syncTrashUrl(entity);
  var tbody = document.getElementById('trash-body');
  if (tbody) tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Đang tải dữ liệu...</div></td></tr>';
  var url = '/api/trash/' + encodeURIComponent(entity) + '?page=' + trashPage;
  var search = getTrashSearch();
  if (search) url += '&search=' + encodeURIComponent(search);
  var res = await apiFetch(url);
  if (!res || res.success === false) {
    showToast((res && res.message) || 'Không tải được thùng rác', 'error');
    renderTrashRows([]);
    return;
  }
  renderTrashRows(res.data || []);
  renderTrashPagination(res.pagination || {});
}

function debounceTrashSearch() {
  clearTimeout(trashSearchTimer);
  trashSearchTimer = setTimeout(function() { loadTrash(1); }, 350);
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

async function restoreSelectedTrash() {
  var ids = getSelectedTrashIds();
  if (!ids.length) return;
  var entity = getTrashEntity();
  var res = await apiFetch('/api/trash/' + encodeURIComponent(entity) + '/batch-restore', {
    method: 'POST',
    body: { ids: ids }
  });
  if (!res || res.success === false) {
    showToast((res && res.message) || 'Không thể khôi phục dữ liệu đã chọn', 'error');
    return;
  }
  showToast(res.message || 'Đã khôi phục dữ liệu đã chọn', 'success');
  loadTrash(trashPage);
}

async function purgeSelectedTrash() {
  var ids = getSelectedTrashIds();
  if (!ids.length) return;
  if (!confirm('Xóa vĩnh viễn các bản ghi đã chọn?')) return;
  var entity = getTrashEntity();
  var res = await apiFetch('/api/trash/' + encodeURIComponent(entity) + '/batch-purge', {
    method: 'DELETE',
    body: { ids: ids }
  });
  if (!res || res.success === false) {
    showToast((res && res.message) || 'Không thể xóa dữ liệu đã chọn', 'error');
    return;
  }
  showToast(res.message || 'Đã xóa dữ liệu đã chọn', 'success');
  loadTrash(trashPage);
}

document.addEventListener('DOMContentLoaded', function() {
  setInitialTrashEntity();
  loadTrash(1);
});
