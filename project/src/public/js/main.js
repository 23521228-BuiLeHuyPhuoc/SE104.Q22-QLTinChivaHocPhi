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
  if (icon) icon.textContent = theme === 'dark' ? 'Tối' : 'Sáng';
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
  if (sidebar) sidebar.classList.toggle('open');
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '--';
  return Number(amount || 0).toLocaleString('vi-VN') + ' đ';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

(function() {
  var path = window.location.pathname;
  if (path === '/login' || path === '/admin/login' || path === '/') return;

  var token = getToken();
  if (!token) window.location.href = getLoginPathForCurrentPage();
})();
