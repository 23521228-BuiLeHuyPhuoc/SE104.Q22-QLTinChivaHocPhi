(function() {
  var selectedAvatarFile = null;
  var currentStudent = null;
  var lastLockedToastAt = 0;

  function setAvatarPreview(url, name) {
    var img = document.getElementById('profile-avatar-img');
    var initials = document.getElementById('profile-avatar-initials');
    var fallback = (name || 'SV').trim().charAt(0).toUpperCase() || 'SV';

    if (url) {
      img.src = url;
      img.classList.remove('hidden');
      initials.classList.add('hidden');
      return;
    }

    img.removeAttribute('src');
    img.classList.add('hidden');
    initials.textContent = fallback;
    initials.classList.remove('hidden');
  }

  function updatePageAvatars(url, name) {
    var fallback = (name || 'SV').trim().charAt(0).toUpperCase() || 'SV';
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
        setAvatarPreview(avatarUrl, currentStudent && currentStudent.HoTen);
        updatePageAvatars(avatarUrl, currentStudent && currentStudent.HoTen);
        showToast(res.message || 'Cập nhật ảnh đại diện thành công', 'success');
      } else {
        showToast(res.message || 'Không thể tải ảnh đại diện', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối khi tải ảnh đại diện', 'error');
    } finally {
      if (button) {
        button.disabled = true;
        button.textContent = 'Tải lên Cloudinary';
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
      setAvatarPreview(URL.createObjectURL(file), currentStudent && currentStudent.HoTen);
      if (button) button.disabled = false;
    });
  }

  function bindLockedFields() {
    document.querySelectorAll('.profile-locked-field').forEach(function(field) {
      field.addEventListener('click', function() {
        var now = Date.now();
        if (now - lastLockedToastAt < 600) return;
        lastLockedToastAt = now;
        var label = field.getAttribute('data-lock-label') || 'Thông tin này';
        showToast(label + ' không được phép chỉnh sửa. Vui lòng liên hệ phòng đào tạo nếu cần thay đổi.', 'info');
      });
    });
  }

  async function saveProfile() {
    var button = document.getElementById('btn-save-profile');
    var sdt = document.getElementById('p-sdt').value.trim();
    var gioiTinh = document.getElementById('p-gioitinh').value;
    var diaChi = document.getElementById('p-diachi').value.trim();

    if (!diaChi) {
      showToast('Địa chỉ liên hệ không được để trống', 'error');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Đang lưu...';
    }

    try {
      var res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: {
          Sdt: sdt,
          GioiTinh: gioiTinh,
          DiaChiLienHe: diaChi
        }
      });

      if (res.success) {
        currentStudent = res.data && res.data.student ? res.data.student : currentStudent;
        showToast(res.message || 'Cập nhật hồ sơ cá nhân thành công', 'success');
      } else {
        showToast(res.message || 'Không thể cập nhật hồ sơ cá nhân', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối khi cập nhật hồ sơ', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Lưu thay đổi';
      }
    }
  }

  function bindProfileSave() {
    var button = document.getElementById('btn-save-profile');
    if (button) button.addEventListener('click', saveProfile);
  }

  function profileEscapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#039;');
  }

  function renderBeneficiaries(student) {
    var box = document.getElementById('profile-beneficiaries');
    if (!box) return;

    var rows = student && student.DOITUONGSINHVIEN ? student.DOITUONGSINHVIEN : [];
    if (!rows.length) {
      box.innerHTML = '<div class=empty-state>Chưa thuộc đối tượng ưu tiên nào</div>';
      return;
    }

    box.innerHTML = rows.map(function(row) {
      var dt = row.DOITUONG || {};
      return [
        '<div class=beneficiary-readonly-item>',
        '<strong>' + profileEscapeHtml(dt.MaDoiTuong || row.MaDoiTuong || '-') + ' - ' + profileEscapeHtml(dt.TenDoiTuong || '-') + '</strong>',
        '<small>Tỉ lệ giảm: ' + profileEscapeHtml(Number(dt.TiLeGiamHocPhi || 0)) + '%</small>',
        '<small>Độ ưu tiên: ' + profileEscapeHtml(dt.DoUuTien || '-') + '</small>',
        dt.MoTa ? '<small>Mô tả: ' + profileEscapeHtml(dt.MoTa) + '</small>' : '',
        row.GhiChu ? '<small>Ghi chú SV: ' + profileEscapeHtml(row.GhiChu) + '</small>' : '',
        '</div>'
      ].join('');
    }).join('');
  }

  async function loadProfile() {
    try {
      var meRes = await apiFetch('/api/auth/me');
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('profile-form').classList.remove('hidden');

      if (meRes.success && meRes.data.student) {
        var s = meRes.data.student;
        currentStudent = s;
        document.getElementById('p-mssv').value = s.MaSv || '';
        document.getElementById('p-hoten').value = s.HoTen || '';
        document.getElementById('p-email').value = s.Email || '';
        document.getElementById('p-sdt').value = s.Sdt || '';
        document.getElementById('p-ngaysinh').value = s.NgaySinh ? new Date(s.NgaySinh).toLocaleDateString('vi-VN') : '';
        document.getElementById('p-gioitinh').value = s.GioiTinh || 'Nam';
        document.getElementById('p-cmnd').value = s.Cccd || '';
        document.getElementById('p-dantoc').value = (s.DANTOC ? s.DANTOC.TenDanToc : s.MaDanToc) || '';
        document.getElementById('p-diachi').value = s.DiaChiLienHe || '';
        document.getElementById('p-nganh').value = (s.NGANHHOC ? s.NGANHHOC.TenNganh : '') || '';
        document.getElementById('p-khoa').value = (s.NGANHHOC && s.NGANHHOC.KHOA ? s.NGANHHOC.KHOA.TenKhoa : '') || '';
        document.getElementById('p-trangthai').value = s.TrangThai || '';
        document.getElementById('p-khoahoc').value = s.NgayNhapHoc ? new Date(s.NgayNhapHoc).getFullYear() : '';
        setAvatarPreview(s.AnhDaiDien || (meRes.data.user && meRes.data.user.AnhDaiDien), s.HoTen);
        renderBeneficiaries(s);
      }
    } catch (e) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('profile-form').classList.remove('hidden');
    }
  }

  bindAvatarUpload();
  bindLockedFields();
  bindProfileSave();
  loadProfile();
})();
