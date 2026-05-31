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
});

window.addEventListener('resize', syncSidebarToggleIcon);
