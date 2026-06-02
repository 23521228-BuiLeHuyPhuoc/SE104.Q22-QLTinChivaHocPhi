var currentNotificationPage = 1;

function notificationSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
  currentNotificationPage = page || 1;
  var loading = document.getElementById('loading');
  var container = document.getElementById('notification-list');
  var filter = document.getElementById('read-filter').value;
  if (loading) loading.classList.remove('hidden');
  if (container) container.classList.add('hidden');

  try {
    var url = '/api/notifications?page=' + currentNotificationPage;
    if (filter) url += '&read=' + encodeURIComponent(filter);
    var res = await apiFetch(url);
    if (loading) loading.classList.add('hidden');
    if (container) container.classList.remove('hidden');

    if (res.success && res.data && res.data.length > 0) {
      container.innerHTML = res.data.map(function(n) {
        var isRead = !!n.DaDoc;
        var snippet = String(n.NoiDung || '');
        if (snippet.length > 180) snippet = snippet.slice(0, 180) + '...';
        return '<div class="notice-item ' + (!isRead ? 'unread' : '') + '" id="notice-' + n.MaThongBao + '" role="button" tabindex="0" onclick="openNotificationDetail(' + n.MaThongBao + ')">' +
          '<div class="notice-header">' +
            '<strong>' + notificationSafe(n.TieuDe || 'Thông báo') + '</strong>' +
            '<small>' + (n.NgayTao ? formatDate(n.NgayTao) : '') + '</small>' +
          '</div>' +
          '<p>' + notificationSafe(snippet) + '</p>' +
          '<div><span class="badge ' + (isRead ? 'badge-secondary' : 'badge-warning') + '">' + (isRead ? 'Đã đọc' : 'Chưa đọc') + '</span></div>' +
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

function closeNotificationDetail() {
  var modal = document.getElementById('notification-detail-modal');
  if (modal) modal.classList.remove('active');
}

function renderNotificationDetail(n) {
  var link = document.getElementById('notification-link-btn');
  if (link) {
    if (n.DuongDan) {
      link.href = n.DuongDan;
      link.style.display = '';
    } else {
      link.href = '#';
      link.style.display = 'none';
    }
  }

  return '<div class="info-list">' +
      '<div><span class="label">Loại</span><span>' + notificationSafe(n.Loai || n.LoaiThongBao || '-') + '</span></div>' +
      '<div><span class="label">Ngày tạo</span><span>' + (n.NgayTao ? formatDate(n.NgayTao) : '-') + '</span></div>' +
      '<div><span class="label">Ngày hết hạn</span><span>' + (n.NgayHetHan ? formatDate(n.NgayHetHan) : '-') + '</span></div>' +
      '<div><span class="label">Trạng thái</span><span><span class="badge ' + (n.DaDoc ? 'badge-secondary' : 'badge-warning') + '">' + (n.DaDoc ? 'Đã đọc' : 'Chưa đọc') + '</span></span></div>' +
      '<div><span class="label">Liên kết</span><span>' + notificationSafe(n.DuongDan || '-') + '</span></div>' +
    '</div>' +
    '<div class="notice-item"><p style="white-space:pre-wrap;overflow:visible;display:block">' + notificationSafe(n.NoiDung || '') + '</p></div>';
}

async function openNotificationDetail(id) {
  var modal = document.getElementById('notification-detail-modal');
  var title = document.getElementById('notification-detail-title');
  var body = document.getElementById('notification-detail-body');
  if (!modal || !body) return;
  modal.classList.add('active');
  body.innerHTML = '<div class="empty-state">Đang tải dữ liệu...</div>';

  try {
    var res = await apiFetch('/api/notifications/' + encodeURIComponent(id));
    if (!res || res.success === false) {
      body.innerHTML = '<div class="empty-state text-error">' + notificationSafe((res && res.message) || 'Không tải được thông báo') + '</div>';
      return;
    }
    var notification = res.data || {};
    if (title) title.textContent = notification.TieuDe || 'Chi tiết thông báo';
    body.innerHTML = renderNotificationDetail(notification);
    await markRead(id);
  } catch (e) {
    body.innerHTML = '<div class="empty-state text-error">Lỗi tải thông báo</div>';
  }
}

async function refreshUnreadCount() {
  try {
    var res = await apiFetch('/api/notifications/unread-count');
    if (!res || res.success === false) return;
    var count = res.count || (res.data && res.data.count) || 0;
    if (window.setHeaderNotificationCount) {
      window.setHeaderNotificationCount(count);
    } else {
      document.querySelectorAll('.bell-badge,.badge-count,#notification-count').forEach(function(el) {
        el.textContent = count;
        el.style.display = count > 0 ? '' : 'none';
      });
    }
    if (window.refreshHeaderNotifications) window.refreshHeaderNotifications();
  } catch (e) {}
}

async function markRead(id) {
  try {
    var res = await apiFetch('/api/notifications/' + id + '/read', { method: 'PUT' });
    if (res.success) {
      var item = document.getElementById('notice-' + id);
      if (item) {
        item.classList.remove('unread');
        var badge = item.querySelector('.badge');
        if (badge) {
          badge.className = 'badge badge-secondary';
          badge.textContent = 'Đã đọc';
        }
      }
      refreshUnreadCount();
      if (document.getElementById('read-filter').value === 'false') {
        setTimeout(function() { loadNotifications(currentNotificationPage); }, 350);
      }
    }
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', function() {
  loadNotifications(1);
});
