function setAuthMessage(id, message, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || '';
  el.classList.add('visible');
  el.classList.toggle('success', type === 'success');
}

function clearAuthMessage(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible', 'success');
}

function setButtonLoading(btn, loadingText) {
  var oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = loadingText;
  return function resetButton() {
    btn.disabled = false;
    btn.textContent = oldText;
  };
}

async function postJson(url, body) {
  var res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function handleLogin(e) {
  e.preventDefault();

  const form = document.getElementById('login-form');
  const btn = document.getElementById('btn-login');
  const apiPath = form.dataset.api || '/api/auth/login';
  const expectedRole = form.dataset.role || 'student';
  const resetButton = setButtonLoading(btn, 'Đang đăng nhập...');
  clearAuthMessage('login-error');

  try {
    const data = await postJson(apiPath, {
      username: document.getElementById('username').value,
      password: document.getElementById('password').value
    });

    if (data.success) {
      const userRole = data.data.user.Role;
      if (expectedRole === 'admin' && userRole !== 'admin') {
        throw new Error('Tài khoản không phù hợp với cổng đăng nhập này');
      }
      if (expectedRole === 'student' && userRole !== 'student') {
        throw new Error('Tài khoản không phù hợp với cổng đăng nhập này');
      }

      document.cookie = 'token=' + data.data.token + '; path=/; max-age=86400; SameSite=Strict';
      window.location.href = userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard';
      return false;
    }

    setAuthMessage('login-error', data.message || 'Đăng nhập thất bại');
  } catch (err) {
    setAuthMessage('login-error', err.message || 'Lỗi kết nối server');
  }

  resetButton();
  return false;
}

async function handleRegister(e) {
  e.preventDefault();

  var form = document.getElementById('register-form');
  var btn = document.getElementById('btn-register');
  var role = form.dataset.role || 'student';
  var apiPath = form.dataset.api || (role === 'admin' ? '/api/auth/admin/register' : '/api/auth/student/register');
  var password = document.getElementById('password').value;
  var confirmPassword = document.getElementById('confirm-password').value;
  clearAuthMessage('register-error');

  if (password !== confirmPassword) {
    setAuthMessage('register-error', 'Mật khẩu nhập lại không khớp');
    return false;
  }

  var body = { password: password };
  if (role === 'admin') {
    body.username = document.getElementById('username').value.trim();
    body.HoTen = document.getElementById('full-name').value.trim();
    body.Email = document.getElementById('email').value.trim();
    body.Sdt = document.getElementById('phone').value.trim();
    body.ChucVu = document.getElementById('position').value.trim();
    body.PhongBan = document.getElementById('department').value.trim();
  } else {
    body.username = document.getElementById('username').value.trim();
    body.HoTen = document.getElementById('full-name').value.trim();
    body.Email = document.getElementById('email').value.trim();
    body.Sdt = document.getElementById('phone').value.trim();
  }

  var resetButton = setButtonLoading(btn, 'Đang đăng ký...');
  try {
    var data = await postJson(apiPath, body);
    if (data.success) {
      setAuthMessage('register-error', data.message || 'Đăng ký thành công', 'success');
      form.reset();
    } else {
      setAuthMessage('register-error', data.message || 'Không thể đăng ký');
    }
  } catch (err) {
    setAuthMessage('register-error', err.message || 'Lỗi kết nối server');
  }
  resetButton();
  return false;
}

async function handleForgotPassword(e) {
  e.preventDefault();

  var form = document.getElementById('forgot-form');
  var btn = document.getElementById('btn-forgot');
  var resetButton = setButtonLoading(btn, 'Đang gửi...');
  clearAuthMessage('forgot-error');

  try {
    var data = await postJson(form.dataset.api || '/api/auth/forgot-password', {
      identifier: document.getElementById('identifier').value.trim(),
      role: form.dataset.role || 'student'
    });
    if (data.success) {
      setAuthMessage('forgot-error', data.message || 'Đã gửi email đặt lại mật khẩu', 'success');
    } else {
      setAuthMessage('forgot-error', data.message || 'Không thể gửi email đặt lại mật khẩu');
    }
  } catch (err) {
    setAuthMessage('forgot-error', err.message || 'Lỗi kết nối server');
  }

  resetButton();
  return false;
}

async function handleResetPassword(e) {
  e.preventDefault();

  var form = document.getElementById('reset-form');
  var btn = document.getElementById('btn-reset');
  var newPassword = document.getElementById('new-password').value;
  var confirmPassword = document.getElementById('confirm-password').value;
  clearAuthMessage('reset-error');

  if (newPassword !== confirmPassword) {
    setAuthMessage('reset-error', 'Mật khẩu nhập lại không khớp');
    return false;
  }

  var resetButton = setButtonLoading(btn, 'Đang cập nhật...');
  try {
    var data = await postJson(form.dataset.api || '/api/auth/reset-password', {
      token: document.getElementById('reset-token').value,
      newPassword: newPassword
    });
    if (data.success) {
      setAuthMessage('reset-error', data.message || 'Đặt lại mật khẩu thành công', 'success');
      form.reset();
    } else {
      setAuthMessage('reset-error', data.message || 'Không thể đặt lại mật khẩu');
    }
  } catch (err) {
    setAuthMessage('reset-error', err.message || 'Lỗi kết nối server');
  }

  resetButton();
  return false;
}
