async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-login');
  const errorEl = document.getElementById('login-error');
  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';
  errorEl.classList.remove('visible');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
      })
    });
    const data = await res.json();
    if (data.success) {
      // Store token in cookie via server
      document.cookie = 'token=' + data.data.token + '; path=/; max-age=86400; SameSite=Strict';
      // Redirect based on role
      if (data.data.user.Role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/student/dashboard';
      }
    } else {
      errorEl.textContent = data.message || 'Đăng nhập thất bại';
      errorEl.classList.add('visible');
    }
  } catch (err) {
    errorEl.textContent = 'Lỗi kết nối server';
    errorEl.classList.add('visible');
  }
  btn.disabled = false;
  btn.textContent = 'Đăng nhập';
}
