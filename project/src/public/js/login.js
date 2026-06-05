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

function syncPasswordToggle(button, input) {
  var isVisible = input.type === 'text';
  var icon = button.querySelector('.material-symbols-rounded');
  button.setAttribute('aria-label', isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  button.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
  if (icon) icon.textContent = isVisible ? 'visibility_off' : 'visibility';
}

function setupPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach(function(button) {
    var input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;
    syncPasswordToggle(button, input);
    button.addEventListener('click', function() {
      input.type = input.type === 'password' ? 'text' : 'password';
      syncPasswordToggle(button, input);
      input.focus();
    });
  });
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

      document.cookie = 'token=' + data.data.token + '; path=/; max-age=86400; SameSite=Lax';
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

document.addEventListener('DOMContentLoaded', setupPasswordToggles);

async function handleForgotPassword(e) {
  e.preventDefault();

  var form = document.getElementById('forgot-form');
  var btn = document.getElementById('btn-forgot');
  var resetButton = setButtonLoading(btn, 'Đang gửi...');
  var identifier = document.getElementById('identifier').value.trim();
  var role = form.dataset.role || 'student';
  clearAuthMessage('forgot-error');

  try {
    var data = await postJson(form.dataset.api || '/api/auth/forgot-password', {
      identifier: identifier,
      role: role
    });
    if (data.success) {
      setAuthMessage('forgot-error', data.message || 'Đã gửi mã OTP đặt lại mật khẩu', 'success');
      var resetPath = data.data && data.data.resetPath
        ? data.data.resetPath
        : '/reset-password?identifier=' + encodeURIComponent(identifier) + '&role=' + encodeURIComponent(role);
      window.setTimeout(function() {
        window.location.href = resetPath;
      }, 900);
    } else {
      setAuthMessage('forgot-error', data.message || 'Không thể gửi mã OTP đặt lại mật khẩu');
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
  var identifier = document.getElementById('reset-identifier').value.trim();
  var otp = document.getElementById('reset-otp').value.trim();
  var role = document.getElementById('reset-role').value || 'student';
  var newPassword = document.getElementById('new-password').value;
  var confirmPassword = document.getElementById('confirm-password').value;
  clearAuthMessage('reset-error');

  if (newPassword !== confirmPassword) {
    setAuthMessage('reset-error', 'Mật khẩu nhập lại không khớp');
    return false;
  }

  if (newPassword.length < 6) {
    setAuthMessage('reset-error', 'Mật khẩu phải có ít nhất 6 ký tự');
    return false;
  }

  var resetButton = setButtonLoading(btn, 'Đang cập nhật...');
  try {
    var data = await postJson(form.dataset.api || '/api/auth/reset-password', {
      identifier: identifier,
      otp: otp,
      role: role,
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
