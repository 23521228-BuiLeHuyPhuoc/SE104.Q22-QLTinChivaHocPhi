function renderNotificationPagination(meta) {
  var nav = document.getElementById('notification-pagination');
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
  if (current > 1) html += '<button type="button" onclick="loadNotifications(' + (current - 1) + ')">Trước</button>';
  for (var i = 1; i <= totalPages; i += 1) {
    html += '<button type="button" class="' + (i === current ? 'active' : '') + '" onclick="loadNotifications(' + i + ')">' + i + '</button>';
  }
  if (current < totalPages) html += '<button type="button" onclick="loadNotifications(' + (current + 1) + ')">Sau</button>';
  nav.innerHTML = html;
}

async function loadNotifications(page) {
  var loading = document.getElementById('loading');
  var container = document.getElementById('notification-list');
  var filter = document.getElementById('read-filter').value;
  if (loading) loading.classList.remove('hidden');
  if (container) container.classList.add('hidden');

  try {
    var url = '/api/notifications?page=' + (page || 1);
    if (filter) url += '&read=' + encodeURIComponent(filter);
    var res = await apiFetch(url);
    if (loading) loading.classList.add('hidden');
    if (container) container.classList.remove('hidden');

    if (res.success && res.data && res.data.length > 0) {
      container.innerHTML = res.data.map(function(n) {
        var isRead = n.DaDoc;
        return '<div class="notice-item ' + (!isRead ? 'unread' : '') + '">' +
          '<div class="notice-header">' +
            '<strong>' + (n.TieuDe || 'Thông báo') + '</strong>' +
            '<small>' + (n.NgayTao ? formatDate(n.NgayTao) : '') + '</small>' +
          '</div>' +
          '<p>' + (n.NoiDung || '') + '</p>' +
          (!isRead && n.MaThongBao ? '<button class="btn btn-sm btn-outline" type="button" onclick="markRead(' + n.MaThongBao + ', this)">Đánh dấu đã đọc</button>' : '') +
        '</div>';
      }).join('');
    } else {
      container.innerHTML = '<div class="empty-state">Không có thông báo</div>';
    }
    renderNotificationPagination(res.pagination || {});
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    if (container) {
      container.classList.remove('hidden');
      container.innerHTML = '<div class="empty-state text-error">Lỗi tải thông báo</div>';
    }
    renderNotificationPagination({});
  }
}

async function markRead(id, btn) {
  try {
    var res = await apiFetch('/api/notifications/' + id + '/read', { method: 'PUT' });
    if (res.success) {
      btn.parentElement.classList.remove('unread');
      btn.remove();
    }
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', function() {
  loadNotifications(1);
});
