(async function() {
  try {
    const res = await apiFetch('/api/notifications');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notification-list').classList.remove('hidden');

    const container = document.getElementById('notification-list');
    if (res.success && res.data && res.data.length > 0) {
      var html = '';
      res.data.forEach(n => {
        var isRead = n.DaDoc;
        html += '<div style="padding: 16px; border-bottom: 1px solid var(--border-light); ' + (!isRead ? 'background: var(--color-primary-light);' : '') + '">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center;">';
        html += '<strong>' + (n.TieuDe || 'Thông báo') + '</strong>';
        html += '<small style="color: var(--text-muted);">' + (n.NgayTao ? new Date(n.NgayTao).toLocaleDateString('vi-VN') : '') + '</small>';
        html += '</div>';
        html += '<p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 4px;">' + (n.NoiDung || '') + '</p>';
        if (!isRead && n.MaThongBao) {
          html += '<button class="btn btn-sm btn-outline" onclick="markRead(' + n.MaThongBao + ', this)" style="margin-top: 4px;">Đánh dấu đã đọc</button>';
        }
        html += '</div>';
      });
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p class="text-center text-muted">Không có thông báo</p>';
    }
  } catch(e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notification-list').classList.remove('hidden');
    console.error(e);
  }
})();

async function markRead(id, btn) {
  try {
    const res = await apiFetch('/api/notifications/' + id + '/read', { method: 'PUT' });
    if (res.success) {
      btn.parentElement.style.background = '';
      btn.remove();
    }
  } catch(e) {}
}
