(async function() {
  try {
    var res = await apiFetch('/api/notifications');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notification-list').classList.remove('hidden');

    var container = document.getElementById('notification-list');
    if (res.success && res.data && res.data.length > 0) {
      var html = '';
      res.data.forEach(function(n) {
        var isRead = n.DaDoc;
        html += '<div class="notice-item ' + (!isRead ? 'unread' : '') + '">';
        html += '<div class="notice-header">';
        html += '<strong>' + (n.TieuDe || 'Thông báo') + '</strong>';
        html += '<small>' + (n.NgayTao ? new Date(n.NgayTao).toLocaleDateString('vi-VN') : '') + '</small>';
        html += '</div>';
        html += '<p>' + (n.NoiDung || '') + '</p>';
        if (!isRead && n.MaThongBao) {
          html += '<button class="btn btn-sm btn-outline" type="button" onclick="markRead(' + n.MaThongBao + ', this)">Đánh dấu đã đọc</button>';
        }
        html += '</div>';
      });
      container.innerHTML = html;
    } else {
      container.innerHTML = '<div class="empty-state">Không có thông báo</div>';
    }
  } catch (e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notification-list').classList.remove('hidden');
    document.getElementById('notification-list').innerHTML = '<div class="empty-state text-error">Lỗi tải thông báo</div>';
  }
})();

async function markRead(id, btn) {
  try {
    var res = await apiFetch('/api/notifications/' + id + '/read', { method: 'PUT' });
    if (res.success) {
      btn.parentElement.classList.remove('unread');
      btn.remove();
    }
  } catch (e) {}
}
