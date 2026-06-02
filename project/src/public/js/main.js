function getToken() {
  var match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? match[1] : null;
}

function clearToken() {
  document.cookie = 'token=; path=/; max-age=0; SameSite=Strict';
}

function getLoginPathForCurrentPage() {
  return window.location.pathname.indexOf('/admin') === 0 ? '/admin/login' : '/login';
}

async function apiFetch(url, options) {
  var opts = options || {};
  var isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  var headers = Object.assign(isFormData ? {} : { 'Content-Type': 'application/json' }, opts.headers || {});
  var token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  var fetchOpts = {
    method: opts.method || 'GET',
    headers: headers
  };
  if (opts.body) fetchOpts.body = isFormData ? opts.body : JSON.stringify(opts.body);

  var res = await fetch(url, fetchOpts);
  if (res.status === 401) {
    clearToken();
    window.location.href = getLoginPathForCurrentPage();
    return { success: false, message: 'Phiên đăng nhập hết hạn' };
  }

  return await res.json();
}

function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;

  var text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);

  var close = document.createElement('button');
  close.className = 'toast-close';
  close.type = 'button';
  close.textContent = '×';
  close.onclick = function() { toast.remove(); };
  toast.appendChild(close);

  container.appendChild(toast);
  setTimeout(function() {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

function setThemeLabel(theme) {
  var icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
}

function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  setThemeLabel(next);
}

(function() {
  var saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  setThemeLabel(saved || document.documentElement.getAttribute('data-theme') || 'light');
})();

function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (!isMobile) {
    document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed', document.body.classList.contains('sidebar-collapsed') ? '1' : '0');
    syncSidebarToggleIcon();
    return;
  }
  if (sidebar) {
    sidebar.classList.toggle('open');
    if (backdrop) {
      backdrop.classList.toggle('active', sidebar.classList.contains('open'));
    }
    syncSidebarToggleIcon();
  }
}

function closeSidebar() {
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
  syncSidebarToggleIcon();
}

function syncSidebarToggleIcon() {
  var icon = document.getElementById('sidebar-toggle-icon');
  if (!icon) return;
  var sidebar = document.getElementById('sidebar');
  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) {
    icon.textContent = sidebar && sidebar.classList.contains('open') ? 'close' : 'menu';
    return;
  }
  icon.textContent = document.body.classList.contains('sidebar-collapsed') ? 'menu' : 'menu_open';
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '--';
  return Number(amount || 0).toLocaleString('vi-VN') + ' đ';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function parseActivityData(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

function formatActivityDateTime(value) {
  if (!value) return '-';
  var raw = String(value);
  var dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(?:00:00:00|23:59:59)/);
  if (dateOnlyMatch) return dateOnlyMatch[3] + '/' + dateOnlyMatch[2] + '/' + dateOnlyMatch[1];
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  var hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
  return hasTime
    ? date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : date.toLocaleDateString('vi-VN');
}

function getActivityBadgeMeta(state, options) {
  var opts = options || {};
  if (!state) return { label: opts.emptyLabel || 'Chưa chọn', className: 'badge-secondary' };
  if (state.isOpen) return { label: opts.openLabel || 'Đang còn hạn', className: 'badge-success' };
  if (state.reason === 'locked') return { label: opts.lockedLabel || 'Đã khóa', className: 'badge-secondary' };
  if (state.isClosed) return { label: opts.closedLabel || 'Đã hết hạn', className: 'badge-error' };
  return { label: opts.notStartedLabel || 'Chưa mở', className: 'badge-warning' };
}

function setActivityBadge(element, meta) {
  if (!element || !meta) return;
  element.className = 'badge ' + meta.className;
  element.textContent = meta.label;
}

function headerNotificationSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatHeaderNotificationDate(dateStr) {
  if (!dateStr) return '';
  var date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function setHeaderNotificationCount(count) {
  var normalized = Math.max(0, Number(count || 0));
  var label = normalized > 99 ? '99+' : String(normalized);
  document.querySelectorAll('#header-notification-badge,.badge-count,#notification-count').forEach(function(el) {
    el.textContent = label;
    el.style.display = normalized > 0 ? '' : 'none';
  });

  var bell = document.getElementById('header-notification-bell');
  if (bell) {
    bell.classList.toggle('has-unread', normalized > 0);
    bell.setAttribute('aria-label', normalized > 0 ? 'Thông báo, ' + normalized + ' chưa đọc' : 'Thông báo');
  }

  var markAll = document.getElementById('header-notification-mark-all');
  if (markAll) markAll.disabled = normalized <= 0;
}

function setupHeaderNotifications() {
  var popover = document.getElementById('header-notification-popover');
  if (!popover || popover.dataset.ready === '1') return;
  popover.dataset.ready = '1';

  var bell = document.getElementById('header-notification-bell');
  var dropdown = document.getElementById('header-notification-dropdown');
  var list = document.getElementById('header-notification-list');
  var detail = document.getElementById('header-notification-detail');
  var summary = document.getElementById('header-notification-summary');
  var markAll = document.getElementById('header-notification-mark-all');
  var back = document.getElementById('header-notification-back');
  var title = document.getElementById('header-notification-detail-title');
  var meta = document.getElementById('header-notification-detail-meta');
  var content = document.getElementById('header-notification-detail-content');
  var link = document.getElementById('header-notification-detail-link');
  var viewAll = document.getElementById('header-notification-view-all');
  if (!bell || !dropdown || !list) return;

  var notificationHome = popover.getAttribute('data-notification-home') ||
    (window.location.pathname.indexOf('/admin') === 0 ? '/admin/notifications' : '/student/notifications');
  if (viewAll) viewAll.href = notificationHome;

  var state = {
    notifications: [],
    unreadCount: 0,
    loaded: false,
    loading: false
  };

  function setSummaryText() {
    if (!summary) return;
    if (!state.notifications.length) {
      summary.textContent = 'Không có thông báo';
      return;
    }
    summary.textContent = state.unreadCount > 0 ? state.unreadCount + ' chưa đọc' : 'Tất cả đã đọc';
  }

  function showListView() {
    list.classList.remove('hidden');
    if (detail) detail.classList.add('hidden');
  }

  function setListLoading() {
    list.innerHTML = '<div class="notification-empty"><span class="spinner mini-spinner"></span><span>Đang tải thông báo...</span></div>';
  }

  function setListError(message) {
    list.innerHTML = '<div class="notification-empty text-error">' + headerNotificationSafe(message || 'Không tải được thông báo') + '</div>';
  }

  function getPreview(text) {
    var preview = String(text || '').replace(/\s+/g, ' ').trim();
    return preview.length > 110 ? preview.slice(0, 110) + '...' : preview;
  }

  function renderNotificationList() {
    showListView();
    setSummaryText();
    setHeaderNotificationCount(state.unreadCount);

    if (!state.notifications.length) {
      list.innerHTML = '<div class="notification-empty">Không có thông báo</div>';
      return;
    }

    list.innerHTML = state.notifications.slice(0, 6).map(function(n) {
      var isUnread = !n.DaDoc;
      var dateText = formatHeaderNotificationDate(n.NgayTao);
      var typeText = n.Loai || n.LoaiThongBao || '';
      return '<button class="notification-mini-item ' + (isUnread ? 'unread' : '') + '" type="button" data-notification-id="' + headerNotificationSafe(n.MaThongBao) + '">' +
        '<span class="notification-mini-status" aria-hidden="true"></span>' +
        '<span class="notification-mini-content">' +
          '<span class="notification-mini-title">' + headerNotificationSafe(n.TieuDe || 'Thông báo') + '</span>' +
          '<span class="notification-mini-preview">' + headerNotificationSafe(getPreview(n.NoiDung)) + '</span>' +
          '<span class="notification-mini-meta">' + headerNotificationSafe([dateText, typeText].filter(Boolean).join(' • ')) + '</span>' +
        '</span>' +
      '</button>';
    }).join('');
  }

  async function refreshHeaderUnreadCount() {
    if (!getToken()) return;
    try {
      var res = await apiFetch('/api/notifications/unread-count');
      if (!res || res.success === false) return;
      state.unreadCount = Number(res.count || (res.data && res.data.count) || 0);
      setSummaryText();
      setHeaderNotificationCount(state.unreadCount);
    } catch (e) {}
  }

  async function refreshHeaderNotifications(options) {
    options = options || {};
    if (!getToken() || state.loading) return;
    state.loading = true;
    if (!options.silent && !state.loaded) setListLoading();

    try {
      var responses = await Promise.all([
        apiFetch('/api/notifications?page=1'),
        apiFetch('/api/notifications/unread-count')
      ]);
      var listRes = responses[0];
      var countRes = responses[1];

      if (listRes && listRes.success !== false) {
        state.notifications = Array.isArray(listRes.data) ? listRes.data : [];
      }
      if (countRes && countRes.success !== false) {
        state.unreadCount = Number(countRes.count || (countRes.data && countRes.data.count) || 0);
      } else {
        state.unreadCount = state.notifications.filter(function(n) { return !n.DaDoc; }).length;
      }
      state.loaded = true;
      if (!detail || detail.classList.contains('hidden')) renderNotificationList();
      else {
        setSummaryText();
        setHeaderNotificationCount(state.unreadCount);
      }
    } catch (e) {
      if (!options.silent) setListError('Lỗi tải thông báo');
    } finally {
      state.loading = false;
    }
  }

  async function markHeaderNotificationRead(id) {
    try {
      var res = await apiFetch('/api/notifications/' + encodeURIComponent(id) + '/read', { method: 'PUT' });
      if (!res || res.success === false) return;
      state.notifications.forEach(function(n) {
        if (String(n.MaThongBao) === String(id)) n.DaDoc = true;
      });
      await refreshHeaderUnreadCount();
    } catch (e) {}
  }

  async function openNotificationDetail(id) {
    if (!detail || !title || !content) return;
    list.classList.add('hidden');
    detail.classList.remove('hidden');
    title.textContent = 'Đang tải...';
    if (meta) meta.textContent = '';
    content.textContent = '';
    if (link) {
      link.href = '#';
      link.style.display = 'none';
    }

    try {
      var res = await apiFetch('/api/notifications/' + encodeURIComponent(id));
      if (!res || res.success === false) {
        title.textContent = 'Thông báo';
        content.textContent = (res && res.message) || 'Không tải được thông báo';
        return;
      }
      var n = res.data || {};
      title.textContent = n.TieuDe || 'Thông báo';
      if (meta) meta.textContent = [formatHeaderNotificationDate(n.NgayTao), n.Loai || n.LoaiThongBao || ''].filter(Boolean).join(' • ');
      content.textContent = n.NoiDung || '';
      if (link && n.DuongDan) {
        link.href = n.DuongDan;
        link.style.display = '';
      }
      await markHeaderNotificationRead(id);
    } catch (e) {
      title.textContent = 'Thông báo';
      content.textContent = 'Lỗi tải thông báo';
    }
  }

  async function markAllHeaderNotificationsRead() {
    if (markAll) markAll.disabled = true;
    try {
      var res = await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      if (!res || res.success === false) {
        showToast((res && res.message) || 'Không thể đánh dấu đã đọc', 'error');
        return;
      }
      state.notifications.forEach(function(n) { n.DaDoc = true; });
      state.unreadCount = 0;
      renderNotificationList();
      showToast(res.message || 'Đã đánh dấu tất cả đã đọc', 'success');
      await refreshHeaderNotifications({ silent: true });
    } catch (e) {
      showToast('Lỗi đánh dấu đã đọc', 'error');
    } finally {
      if (markAll) markAll.disabled = state.unreadCount <= 0;
    }
  }

  function openDropdown() {
    popover.classList.add('open');
    dropdown.setAttribute('aria-hidden', 'false');
    bell.setAttribute('aria-expanded', 'true');
    showListView();
    if (!state.loaded) setListLoading();
    refreshHeaderNotifications({ silent: state.loaded });
  }

  function closeDropdown() {
    popover.classList.remove('open');
    dropdown.setAttribute('aria-hidden', 'true');
    bell.setAttribute('aria-expanded', 'false');
  }

  bell.addEventListener('click', function(event) {
    event.stopPropagation();
    if (popover.classList.contains('open')) closeDropdown();
    else openDropdown();
  });

  dropdown.addEventListener('click', function(event) {
    event.stopPropagation();
  });

  list.addEventListener('click', function(event) {
    var item = event.target.closest('[data-notification-id]');
    if (!item) return;
    openNotificationDetail(item.getAttribute('data-notification-id'));
  });

  if (back) back.addEventListener('click', renderNotificationList);
  if (markAll) markAll.addEventListener('click', markAllHeaderNotificationsRead);

  document.addEventListener('click', closeDropdown);
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeDropdown();
  });

  window.refreshHeaderNotifications = function() {
    return refreshHeaderNotifications({ silent: true });
  };

  refreshHeaderNotifications({ silent: true });
  setInterval(function() {
    if (popover.classList.contains('open')) refreshHeaderNotifications({ silent: true });
    else refreshHeaderUnreadCount();
  }, 60000);
}

function renderClientPagination(elementId, meta, loadFunctionName) {
  var nav = document.getElementById(elementId);
  if (!nav) return;
  var totalPages = Number(meta && meta.totalPages || 0);
  var current = Number(meta && meta.page || 1);
  if (totalPages <= 1) {
    nav.style.display = 'none';
    nav.innerHTML = '';
    return;
  }

  var start = Math.max(1, current - 2);
  var end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);

  nav.style.display = '';
  var html = '';
  if (current > 1) html += '<button type="button" onclick="' + loadFunctionName + '(' + (current - 1) + ')">Trước</button>';
  for (var i = start; i <= end; i += 1) {
    html += '<button type="button" class="' + (i === current ? 'active' : '') + '" onclick="' + loadFunctionName + '(' + i + ')">' + i + '</button>';
  }
  if (current < totalPages) html += '<button type="button" onclick="' + loadFunctionName + '(' + (current + 1) + ')">Sau</button>';
  nav.innerHTML = html;
}

function setupStudentSidebarScrollPersistence() {
  if (window.location.pathname.indexOf('/student') !== 0) return;

  var storageKey = 'studentSidebarScrollState';
  var sidebar = document.getElementById('sidebar');
  var nav = sidebar ? sidebar.querySelector('.sidebar-nav') : null;
  if (!sidebar) return;

  function saveSidebarScroll() {
    localStorage.setItem(storageKey, JSON.stringify({
      sidebarTop: sidebar.scrollTop || 0,
      navTop: nav ? nav.scrollTop || 0 : 0
    }));
  }

  function restoreSidebarScroll() {
    var saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (e) {
      saved = { sidebarTop: parseInt(localStorage.getItem(storageKey) || '0', 10), navTop: 0 };
    }

    var sidebarTop = parseInt(saved.sidebarTop || 0, 10);
    var navTop = parseInt(saved.navTop || 0, 10);

    function applyScroll() {
      if (Number.isFinite(sidebarTop)) sidebar.scrollTop = sidebarTop;
      if (nav && Number.isFinite(navTop)) nav.scrollTop = navTop;
    }

    applyScroll();
    requestAnimationFrame(applyScroll);
    setTimeout(applyScroll, 80);
    setTimeout(applyScroll, 250);
  }

  restoreSidebarScroll();
  sidebar.addEventListener('scroll', saveSidebarScroll, { passive: true });
  if (nav) nav.addEventListener('scroll', saveSidebarScroll, { passive: true });
  sidebar.querySelectorAll('a.sidebar-link, a.sidebar-logout').forEach(function(link) {
    link.addEventListener('pointerdown', saveSidebarScroll);
    link.addEventListener('click', saveSidebarScroll);
  });
  window.addEventListener('beforeunload', saveSidebarScroll);
}

// Counter animation for stat numbers
function animateCounter(element, target, duration) {
  duration = duration || 1000;
  var start = 0;
  var startTime = performance.now();
  function update(currentTime) {
    var elapsed = currentTime - startTime;
    var progress = Math.min(elapsed / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    var current = Math.round(start + (target - start) * eased);
    element.textContent = current.toLocaleString('vi-VN');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Auto token check
(function() {
  var path = window.location.pathname;
  var publicPaths = [
    '/',
    '/login',
    '/admin/login',
    '/forgot-password',
    '/admin/forgot-password',
    '/reset-password'
  ];
  if (publicPaths.indexOf(path) >= 0) return;

  var token = getToken();
  if (!token) window.location.href = getLoginPathForCurrentPage();
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('sidebarCollapsed') === '1') {
    document.body.classList.add('sidebar-collapsed');
  }
  syncSidebarToggleIcon();

  // Auto-animate counters
  document.querySelectorAll('[data-count]').forEach(function(el) {
    var target = parseInt(el.dataset.count, 10);
    if (!isNaN(target)) animateCounter(el, target);
  });

  // Create mobile sidebar backdrop
  if (!document.getElementById('sidebar-backdrop')) {
    var backdrop = document.createElement('div');
    backdrop.id = 'sidebar-backdrop';
    backdrop.className = 'sidebar-backdrop';
    backdrop.onclick = closeSidebar;
    document.body.appendChild(backdrop);
  }

  setupStudentSidebarScrollPersistence();
  setupHeaderNotifications();
});

window.addEventListener('resize', syncSidebarToggleIcon);
