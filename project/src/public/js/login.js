async function handleLogin(e) {
  e.preventDefault();

  const form = document.getElementById('login-form');
  const btn = document.getElementById('btn-login');
  const errorEl = document.getElementById('login-error');
  const apiPath = form.dataset.api || '/api/auth/login';
  const expectedRole = form.dataset.role || 'student';
  const defaultButtonText = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';
  errorEl.classList.remove('visible');

  try {
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
      })
    });
    const data = await res.json();

    if (data.success) {
      const userRole = data.data.user.Role;
      if (expectedRole === 'admin' && userRole !== 'admin') {
        throw new Error('Tài khoản này không có quyền đăng nhập admin');
      }
      if (expectedRole === 'student' && userRole !== 'student') {
        throw new Error('Vui lòng đăng nhập admin tại /admin/login');
      }

      document.cookie = 'token=' + data.data.token + '; path=/; max-age=86400; SameSite=Strict';
      window.location.href = userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard';
      return false;
    }

    errorEl.textContent = data.message || 'Đăng nhập thất bại';
    errorEl.classList.add('visible');
  } catch (err) {
    errorEl.textContent = err.message || 'Lỗi kết nối server';
    errorEl.classList.add('visible');
  }

  btn.disabled = false;
  btn.textContent = defaultButtonText;
  return false;
}
