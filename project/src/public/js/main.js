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
  var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  var token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  var fetchOpts = {
    method: opts.method || 'GET',
    headers: headers
  };
  if (opts.body) fetchOpts.body = JSON.stringify(opts.body);

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
  if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
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
  if (sidebar) {
    sidebar.classList.toggle('open');
    if (backdrop) {
      backdrop.classList.toggle('active', sidebar.classList.contains('open'));
    }
  }
}

function closeSidebar() {
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '--';
  return Number(amount || 0).toLocaleString('vi-VN') + ' đ';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN');
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
  if (path === '/login' || path === '/admin/login' || path === '/') return;

  var token = getToken();
  if (!token) window.location.href = getLoginPathForCurrentPage();
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
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
});
