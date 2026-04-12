/* ==========================================
   MAIN.JS - Client-side JavaScript
   Shared utilities for all SSR pages
   ========================================== */

// ==========================================
// Token Management
// ==========================================
function getToken() {
  var match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? match[1] : null;
}

function clearToken() {
  document.cookie = 'token=; path=/; max-age=0; SameSite=Strict';
}

// ==========================================
// API Fetch Helper
// ==========================================
async function apiFetch(url, options) {
  var opts = options || {};
  var headers = { 'Content-Type': 'application/json' };
  var token = getToken();
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  var fetchOpts = {
    method: opts.method || 'GET',
    headers: headers
  };
  if (opts.body) {
    fetchOpts.body = JSON.stringify(opts.body);
  }
  var res = await fetch(url, fetchOpts);

  // Handle 401 - redirect to login
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    return { success: false, message: 'Phiên đăng nhập hết hạn' };
  }

  return await res.json();
}

// ==========================================
// Toast Notifications
// ==========================================
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
  toast.innerHTML = '<span>' + message + '</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>';
  container.appendChild(toast);

  setTimeout(function() {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

// ==========================================
// Theme Toggle
// ==========================================
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);

  var icon = document.getElementById('theme-icon');
  if (icon) {
    icon.textContent = next === 'dark' ? '🌙' : '☀️';
  }
}

// Apply saved theme on load
(function() {
  var saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    var icon = document.getElementById('theme-icon');
    if (icon) {
      icon.textContent = saved === 'dark' ? '🌙' : '☀️';
    }
  }
})();

// ==========================================
// Sidebar Toggle (Mobile)
// ==========================================
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

// ==========================================
// Format Helpers
// ==========================================
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '--';
  return parseInt(amount).toLocaleString('vi-VN') + 'đ';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

// ==========================================
// Check Auth on Protected Pages
// ==========================================
(function() {
  var path = window.location.pathname;
  if (path === '/login' || path === '/') return;

  var token = getToken();
  if (!token) {
    window.location.href = '/login';
  }
})();
