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

function runSearchOnEnter(event, callback) {
  if (!event || event.key !== 'Enter') return;
  event.preventDefault();
  if (typeof callback === 'function') callback(event);
}

function escapeClientRegex(value) {
  return String(value || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\$&');
}

function createClientSearchRegex(value) {
  var keyword = String(value || '').trim();
  if (!keyword) return null;
  try {
    return new RegExp(keyword, 'i');
  } catch (e) {
    return new RegExp(escapeClientRegex(keyword), 'i');
  }
}

function clientRegexMatches(value, regex) {
  if (!regex) return true;
  regex.lastIndex = 0;
  return regex.test(String(value == null ? '' : value));
}

function showToast(message, type) {');
}

function createClientSearchRegex(value) {
  var keyword = String(value || '').trim();
  if (!keyword) return null;
  try {
    return new RegExp(keyword, 'i');
  } catch (e) {
    return new RegExp(escapeClientRegex(keyword), 'i');
  }
}

function clientRegexMatches(value, regex) {
  if (!regex) return true;
  regex.lastIndex = 0;
  return regex.test(String(value == null ? '' : value));
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

var AdminUI = (function() {
  var detailModalId = 'admin-ui-detail-modal';
  var pickerModalId = 'admin-ui-record-picker-modal';
  var readonlyNoticeReady = false;
  var activePicker = null;
  var pickerSearchTimer = null;

  function resolveElement(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target;
  }

  function clearElement(element) {
    if (!element) return;
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function createTextElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function normalizeSearchOptions(options) {
    return asArray(options).map(function(option) {
      if (typeof option === 'string') return { value: option, label: option };
      return {
        value: option.value,
        label: option.label || option.text || option.value
      };
    }).filter(function(option) { return option.value !== undefined && option.value !== null; });
  }

  function createHiddenSearchField(input, name) {
    if (!name || !input || !input.parentElement) return null;
    var hidden = input.parentElement.querySelector('input[type="hidden"][data-ui-search-hidden="1"][name="' + name + '"]');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = name;
      hidden.dataset.uiSearchHidden = '1';
      input.parentElement.appendChild(hidden);
    }
    return hidden;
  }

  function createSearchCriterionControl(config) {
    config = config || {};
    var input = resolveElement(config.input || config.inputSelector);
    if (!input) return null;

    var container = resolveElement(config.container) || input.closest('.search-box') || input.parentElement;
    if (!container) return null;

    var existing = container.querySelector('.ui-search-criterion-select');
    if (existing) return existing;

    var options = normalizeSearchOptions(config.options);
    if (!options.length) return null;

    container.classList.add('search-box-with-criterion');
    var select = document.createElement('select');
    select.className = config.className || 'form-control ui-search-criterion-select';
    select.setAttribute('aria-label', config.label || 'Tiêu chí tìm kiếm');
    if (config.id) select.id = config.id;
    if (config.name) select.name = config.name;

    options.forEach(function(option) {
      var item = document.createElement('option');
      item.value = option.value;
      item.textContent = option.label;
      select.appendChild(item);
    });

    select.value = config.value || input.getAttribute('data-search-field') || options[0].value;
    container.insertBefore(select, input);

    function syncSearchField() {
      input.dataset.searchField = select.value;
      var hidden = createHiddenSearchField(input, config.hiddenInputName);
      if (hidden) hidden.value = select.value;
      if (typeof config.onChange === 'function') config.onChange(select.value, select, input);
      try {
        input.dispatchEvent(new CustomEvent('admin-ui:search-field-change', {
          bubbles: true,
          detail: { field: select.value, select: select }
        }));
      } catch (e) {}
    }

    select.addEventListener('change', syncSearchField);
    syncSearchField();
    return select;
  }

  function getDetailModal() {
    var overlay = document.getElementById(detailModalId);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = detailModalId;
      overlay.className = 'modal-overlay admin-ui-modal-overlay';

      var modal = document.createElement('div');
      modal.className = 'modal modal-wide admin-ui-detail-modal';

      var header = document.createElement('div');
      header.className = 'modal-header';
      var title = document.createElement('h2');
      title.className = 'admin-ui-detail-title';
      var close = document.createElement('button');
      close.className = 'modal-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Đóng');
      close.textContent = '×';
      close.addEventListener('click', closeDetailModal);
      header.appendChild(title);
      header.appendChild(close);

      var body = document.createElement('div');
      body.className = 'modal-body admin-ui-detail-body';

      var footer = document.createElement('div');
      footer.className = 'modal-footer admin-ui-detail-footer';
      var footerClose = document.createElement('button');
      footerClose.className = 'btn btn-outline';
      footerClose.type = 'button';
      footerClose.textContent = 'Đóng';
      footerClose.addEventListener('click', closeDetailModal);
      footer.appendChild(footerClose);

      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      overlay.addEventListener('click', function(event) {
        if (event.target === overlay) closeDetailModal();
      });
      document.body.appendChild(overlay);
    }

    return {
      overlay: overlay,
      title: overlay.querySelector('.admin-ui-detail-title'),
      body: overlay.querySelector('.admin-ui-detail-body'),
      footer: overlay.querySelector('.admin-ui-detail-footer')
    };
  }

  function normalizeDetailRows(config) {
    if (Array.isArray(config.rows)) return config.rows;
    var data = config.data || {};
    return Object.keys(data).map(function(key) {
      return { label: key, value: data[key] };
    });
  }

  function setDetailValue(container, value) {
    if (value instanceof Node) {
      container.appendChild(value);
      return;
    }
    if (Array.isArray(value)) {
      container.textContent = value.filter(Boolean).join(', ') || '-';
      return;
    }
    if (value === null || value === undefined || value === '') {
      container.textContent = '-';
      return;
    }
    container.textContent = String(value);
  }

  function showDetailModal(config) {
    config = config || {};
    var modal = getDetailModal();
    modal.title.textContent = config.title || 'Chi tiết bản ghi';
    clearElement(modal.body);

    if (typeof config.render === 'function') {
      var rendered = config.render(config.data || {}, modal.body);
      if (rendered instanceof Node) modal.body.appendChild(rendered);
      else if (typeof rendered === 'string') modal.body.innerHTML = rendered;
    } else {
      var rows = normalizeDetailRows(config).filter(function(row) { return row && row.hidden !== true; });
      if (!rows.length) {
        modal.body.appendChild(createTextElement('div', 'empty-state', 'Không có dữ liệu chi tiết'));
      } else {
        var grid = document.createElement('div');
        grid.className = 'detail-grid admin-ui-detail-grid';
        rows.forEach(function(row) {
          var item = document.createElement('div');
          item.className = 'admin-ui-detail-item';
          item.appendChild(createTextElement('strong', '', row.label || row.key || '-'));
          var value = createTextElement('span', row.className || '', '');
          if (typeof row.render === 'function') setDetailValue(value, row.render(config.data || {}, row));
          else setDetailValue(value, row.value);
          item.appendChild(value);
          grid.appendChild(item);
        });
        modal.body.appendChild(grid);
      }
    }

    modal.overlay.classList.add('active');
    return modal.overlay;
  }

  function closeDetailModal() {
    var modal = document.getElementById(detailModalId);
    if (modal) modal.classList.remove('active');
  }

  function parseRecordFromRow(row) {
    if (!row) return null;
    var raw = row.getAttribute('data-record');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function attachRowDetailHandlers(config) {
    config = config || {};
    var root = resolveElement(config.root || config.table) || document;
    if (!root || root.dataset && root.dataset.uiRowDetailReady === '1') return root;
    if (root.dataset) root.dataset.uiRowDetailReady = '1';
    var rowSelector = config.rowSelector || 'tbody tr[data-record]';

    root.addEventListener('click', function(event) {
      if (event.target.closest('button,a,input,select,textarea,label,.table-actions,[data-no-row-detail]')) return;
      var row = event.target.closest(rowSelector);
      if (!row || (root !== document && !root.contains(row))) return;
      var record = typeof config.getRecord === 'function' ? config.getRecord(row, event) : parseRecordFromRow(row);
      if (!record) return;
      var detailConfig = typeof config.buildDetail === 'function'
        ? config.buildDetail(record, row, event)
        : { title: config.title || 'Chi tiết bản ghi', data: record, rows: config.rows };
      if (detailConfig) showDetailModal(detailConfig);
    });

    root.querySelectorAll(rowSelector).forEach(function(row) {
      row.classList.add('ui-row-clickable');
    });
    return root;
  }

  function isReadonlyField(element) {
    if (!element || !element.matches) return false;
    if (!element.matches('input, textarea, select, .form-control, [data-ui-readonly]')) return false;
    return element.disabled || element.readOnly || element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('data-ui-readonly');
  }

  function readonlyMessage(element) {
    return element.getAttribute('data-readonly-message') ||
      element.getAttribute('data-disabled-message') ||
      element.getAttribute('title') ||
      'Trường này không được sửa.';
  }

  function markReadonlyFields(root) {
    root = root || document;
    root.querySelectorAll('input.form-control, textarea.form-control, select.form-control, [data-ui-readonly]').forEach(function(element) {
      if (isReadonlyField(element)) {
        element.classList.add('ui-readonly-field');
        if (!element.getAttribute('title')) element.setAttribute('title', readonlyMessage(element));
      }
    });
  }

  function initReadonlyNotices(root) {
    markReadonlyFields(root || document);
    if (readonlyNoticeReady) return;
    readonlyNoticeReady = true;
    document.addEventListener('pointerdown', function(event) {
      var field = event.target.closest('input, textarea, select, .form-control, [data-ui-readonly]');
      if (!isReadonlyField(field)) return;
      if (field.matches('button, [type="button"], [type="submit"], [type="reset"]')) return;
      showToast(readonlyMessage(field), 'info');
    }, true);
  }

  function mapPickerItem(config, item) {
    if (typeof config.mapItem === 'function') return config.mapItem(item) || {};
    return {
      value: item && (item.value || item.id || item.MaMonHoc || item.MaGiangVien || item.MaPhong || item.MaKhoa || item.MaNganh),
      label: item && (item.label || item.name || item.TenMonHoc || item.HoTen || item.TenPhong || item.TenKhoa || item.TenNganh),
      meta: item && (item.meta || item.MaMonHoc || item.MaGiangVien || item.MaPhong || '')
    };
  }

  function getPickerModal() {
    var overlay = document.getElementById(pickerModalId);
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = pickerModalId;
    overlay.className = 'modal-overlay admin-ui-modal-overlay';
    overlay.innerHTML = '<div class="modal admin-ui-record-picker-modal">' +
      '<div class="modal-header"><div><h2 class="admin-ui-picker-title">Ch\u1ecdn b\u1ea3n ghi</h2><p class="admin-ui-picker-subtitle"></p></div><button class="modal-close" type="button" aria-label="\u0110\u00f3ng">×</button></div>' +
      '<div class="modal-body"><div class="search-box admin-ui-picker-search"><input type="search" class="form-control" autocomplete="off"></div><div class="admin-ui-picker-results"></div></div>' +
      '<div class="modal-footer"><button class="btn btn-outline admin-ui-picker-close" type="button">\u0110\u00f3ng</button></div>' +
    '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(event) {
      if (event.target === overlay || event.target.closest('.modal-close,.admin-ui-picker-close')) closeRecordPicker();
      var option = event.target.closest('[data-picker-index]');
      if (option && activePicker) selectPickerItem(Number(option.getAttribute('data-picker-index')));
    });

    var search = overlay.querySelector('.admin-ui-picker-search input');
    search.addEventListener('keydown', function(event) {
      runSearchOnEnter(event, function() {
        clearTimeout(pickerSearchTimer);
        pickerSearchTimer = setTimeout(renderPickerResults, 250);
      });
    });
    return overlay;
  }

  function getLocalPickerItems(config, search) {
    var items = asArray(config.items);
    var regex = createClientSearchRegex(search);
    if (!regex) return items;
    return items.filter(function(item) {
      var mapped = mapPickerItem(config, item);
      return [mapped.value, mapped.label, mapped.meta].some(function(value) {
        return clientRegexMatches(value, regex);
      });
    });
  }

  async function loadPickerItems(config, search) {
    if (typeof config.loadItems === 'function') return await config.loadItems(search || '');
    if (config.endpoint) {
      var params = new URLSearchParams(config.params || {});
      if (search) params.set(config.searchParam || 'search', search);
      var separator = config.endpoint.indexOf('?') >= 0 ? '&' : '?';
      var res = await apiFetch(config.endpoint + separator + params.toString());
      if (!res || res.success === false) throw new Error((res && res.message) || 'Không tải được danh sách');
      return Array.isArray(res.data) ? res.data : [];
    }
    return getLocalPickerItems(config, search);
  }

  async function renderPickerResults() {
    if (!activePicker) return;
    var overlay = getPickerModal();
    var search = overlay.querySelector('.admin-ui-picker-search input');
    var results = overlay.querySelector('.admin-ui-picker-results');
    var keyword = search ? search.value.trim() : '';
    results.innerHTML = '<div class="admin-ui-picker-state">Đang tải...</div>';

    try {
      var items = await loadPickerItems(activePicker, keyword);
      activePicker.loadedItems = asArray(items);
      clearElement(results);
      if (!activePicker.loadedItems.length) {
        results.appendChild(createTextElement('div', 'admin-ui-picker-state', activePicker.emptyText || 'Không có bản ghi phù hợp'));
        return;
      }
      activePicker.loadedItems.forEach(function(item, index) {
        var mapped = mapPickerItem(activePicker, item);
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'admin-ui-picker-option';
        button.setAttribute('data-picker-index', String(index));
        button.disabled = !!mapped.disabled;
        button.appendChild(createTextElement('span', 'admin-ui-picker-option-label', mapped.label || mapped.value || '-'));
        if (mapped.meta) button.appendChild(createTextElement('small', 'admin-ui-picker-option-meta', mapped.meta));
        if (mapped.badge) button.appendChild(createTextElement('span', 'badge ' + (mapped.badgeClass || 'badge-secondary'), mapped.badge));
        results.appendChild(button);
      });
    } catch (e) {
      clearElement(results);
      results.appendChild(createTextElement('div', 'admin-ui-picker-state text-error', e.message || 'Không tải được danh sách'));
    }
  }

  function openRecordPicker(config) {
    activePicker = config || {};
    activePicker.loadedItems = [];
    var overlay = getPickerModal();
    overlay.querySelector('.admin-ui-picker-title').textContent = activePicker.title || 'Chọn bản ghi';
    overlay.querySelector('.admin-ui-picker-subtitle').textContent = activePicker.subtitle || '';
    var search = overlay.querySelector('.admin-ui-picker-search input');
    search.placeholder = activePicker.searchPlaceholder || 'Tìm kiếm...';
    search.value = '';
    overlay.classList.add('active');
    search.focus();
    renderPickerResults();
    return overlay;
  }

  function closeRecordPicker() {
    var overlay = document.getElementById(pickerModalId);
    if (overlay) overlay.classList.remove('active');
    activePicker = null;
  }

  function selectPickerItem(index) {
    if (!activePicker || !activePicker.loadedItems) return;
    var item = activePicker.loadedItems[index];
    var mapped = mapPickerItem(activePicker, item);
    if (mapped.disabled) return;
    if (typeof activePicker.onSelect === 'function') activePicker.onSelect(item, mapped);
    if (activePicker.select) setSelectPickerValue(activePicker.select, mapped.value, mapped.label);
    closeRecordPicker();
  }

  function setSelectPickerValue(select, value, label) {
    select = resolveElement(select);
    if (!select) return;
    var exists = Array.prototype.some.call(select.options, function(option) { return option.value === String(value); });
    if (!exists) select.add(new Option(label || value, value, true, true));
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function selectedOptionLabel(select) {
    if (!select || select.selectedIndex < 0) return '';
    return select.options[select.selectedIndex].textContent || '';
  }

  function attachRecordPicker(config) {
    config = config || {};
    var select = resolveElement(config.select);
    if (!select || select.dataset.uiRecordPickerReady === '1') return null;
    select.dataset.uiRecordPickerReady = '1';
    select.classList.add('record-picker-native-select');

    var control = document.createElement('div');
    control.className = 'record-picker-control';
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'record-picker-trigger';
    trigger.innerHTML = '<span class="record-picker-trigger-value"></span><span class="material-symbols-rounded" aria-hidden="true">search</span>';
    control.appendChild(trigger);
    select.parentElement.insertBefore(control, select.nextSibling);

    function syncTrigger() {
      var value = trigger.querySelector('.record-picker-trigger-value');
      if (!value) return;
      value.textContent = selectedOptionLabel(select) || config.placeholder || 'Chọn bản ghi';
      value.classList.toggle('empty', !select.value);
    }

    trigger.addEventListener('click', function() {
      openRecordPicker(Object.assign({}, config, { select: select }));
    });
    select.addEventListener('change', syncTrigger);
    syncTrigger();
    return control;
  }

  return {
    createSearchCriterionControl: createSearchCriterionControl,
    enhanceSearchBox: createSearchCriterionControl,
    showDetailModal: showDetailModal,
    closeDetailModal: closeDetailModal,
    attachRowDetailHandlers: attachRowDetailHandlers,
    initReadonlyNotices: initReadonlyNotices,
    markReadonlyFields: markReadonlyFields,
    openRecordPicker: openRecordPicker,
    closeRecordPicker: closeRecordPicker,
    attachRecordPicker: attachRecordPicker,
    setSelectPickerValue: setSelectPickerValue
  };
})();

window.AdminUI = AdminUI;

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
  AdminUI.initReadonlyNotices(document);
});

window.addEventListener('resize', syncSidebarToggleIcon);
