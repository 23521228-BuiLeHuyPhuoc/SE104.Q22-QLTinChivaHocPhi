(function() {
  var selectedAvatarFile = null;
  var currentAdmin = null;

  function getInitials(name) {
    return (name || 'AD').trim().charAt(0).toUpperCase() || 'AD';
  }

  function setAvatarPreview(url, name) {
    var img = document.getElementById('profile-avatar-img');
    var initials = document.getElementById('profile-avatar-initials');
    if (!img || !initials) return;

    if (url) {
      img.src = url;
      img.classList.remove('hidden');
      initials.classList.add('hidden');
      return;
    }

    img.removeAttribute('src');
    img.classList.add('hidden');
    initials.textContent = getInitials(name);
    initials.classList.remove('hidden');
  }

  function updatePageAvatars(url, name) {
    var fallback = getInitials(name);
    document.querySelectorAll('.user-avatar, .sidebar-user .avatar').forEach(function(el) {
      if (el.tagName && el.tagName.toLowerCase() === 'img') {
        el.src = url;
      } else if (url) {
        var img = document.createElement('img');
        img.className = el.className + ' avatar-image';
        img.src = url;
        img.alt = name || 'Avatar';
        el.replaceWith(img);
      } else {
        el.textContent = fallback;
      }
    });
  }

  async function uploadAvatar() {
    if (!selectedAvatarFile) {
      showToast('Vui lòng chọn ảnh đại diện', 'error');
      return;
    }

    var button = document.getElementById('btn-upload-avatar');
    if (button) {
      button.disabled = true;
      button.textContent = 'Đang tải...';
    }

    try {
      var formData = new FormData();
      formData.append('avatar', selectedAvatarFile);
      var res = await apiFetch('/api/auth/avatar', {
        method: 'POST',
        body: formData
      });

      if (res.success) {
        var avatarUrl = res.data && res.data.avatarUrl;
        selectedAvatarFile = null;
        setAvatarPreview(avatarUrl, currentAdmin && currentAdmin.HoTen);
        updatePageAvatars(avatarUrl, currentAdmin && currentAdmin.HoTen);
        showToast(res.message || 'Cập nhật ảnh đại diện thành công', 'success');
      } else {
        showToast(res.message || 'Không thể tải ảnh đại diện', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối khi tải ảnh đại diện', 'error');
    } finally {
      if (button) {
        button.disabled = true;
        button.textContent = 'Cập nhật ảnh';
      }
      var input = document.getElementById('avatar-input');
      if (input) input.value = '';
    }
  }

  function bindAvatarUpload() {
    var input = document.getElementById('avatar-input');
    var button = document.getElementById('btn-upload-avatar');
    if (button) button.addEventListener('click', uploadAvatar);
    if (!input) return;

    input.addEventListener('change', function() {
      var file = input.files && input.files[0];
      selectedAvatarFile = null;
      if (button) button.disabled = true;
      if (!file) return;

      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
        showToast('Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF', 'error');
        input.value = '';
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        showToast('Ảnh đại diện không được vượt quá 3MB', 'error');
        input.value = '';
        return;
      }

      selectedAvatarFile = file;
      setAvatarPreview(URL.createObjectURL(file), currentAdmin && currentAdmin.HoTen);
      if (button) button.disabled = false;
    });
  }

  async function saveProfile() {
    var button = document.getElementById('btn-save-profile');
    var body = {
      HoTen: document.getElementById('p-hoten').value.trim(),
      Email: document.getElementById('p-email').value.trim(),
      Sdt: document.getElementById('p-sdt').value.trim(),
      PhongBan: document.getElementById('p-phongban').value.trim()
    };
    if (!body.HoTen || !body.Email) {
      showToast('Vui long nhap ho ten va email', 'error');
      return;
    }
    if (button) button.disabled = true;
    try {
      var res = await apiFetch('/api/auth/profile', { method: 'PUT', body: body });
      if (res.success) {
        showToast(res.message || 'Da cap nhat ho so', 'success');
        if (res.data && res.data.admin) currentAdmin = res.data.admin;
      } else {
        showToast(res.message || 'Khong the cap nhat ho so', 'error');
      }
    } catch (e) {
      showToast('Loi ket noi khi cap nhat ho so', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function bindProfileSave() {
    var button = document.getElementById('btn-save-profile');
    if (button) button.addEventListener('click', saveProfile);
  }

  async function loadProfile() {
    try {
      var meRes = await apiFetch('/api/auth/me');
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('admin-profile-form').classList.remove('hidden');

      if (meRes.success) {
        var user = meRes.data.user || {};
        var admin = meRes.data.admin || {};
        currentAdmin = {
          HoTen: admin.HoTen || user.HoTen || user.username || 'Admin',
          AnhDaiDien: admin.AnhDaiDien || user.AnhDaiDien || ''
        };

        document.getElementById('p-username').value = user.username || '';
        document.getElementById('p-hoten').value = admin.HoTen || currentAdmin.HoTen || '';
        document.getElementById('p-email').value = admin.Email || '';
        document.getElementById('p-sdt').value = admin.Sdt || '';
        document.getElementById('p-chucvu').value = admin.ChucVu || user.ChucVu || '';
        document.getElementById('p-phongban').value = admin.PhongBan || '';
        if (window.AdminUI) AdminUI.initReadonlyNotices(document);
        setAvatarPreview(currentAdmin.AnhDaiDien, currentAdmin.HoTen);
      }
    } catch (e) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('admin-profile-form').classList.remove('hidden');
    }
  }

  bindAvatarUpload();
  bindProfileSave();
  loadProfile();
})();
