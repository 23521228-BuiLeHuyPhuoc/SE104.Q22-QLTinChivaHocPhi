var editingId = null;
var selectedStudentAvatarFile = null;
var selectedStudentsImportFile = null;
var allMajors = [];
var allEthnicities = [];
var allBeneficiaries = [];
var currentStudentBeneficiaryIds = [];

function asDateInput(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

function studentEscapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#039;');
}

function normalizeStudentEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeStudentPhone(value) {
  return String(value || '').trim().replace(/[\s().-]/g, '');
}

function isValidStudentEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isValidStudentPhone(value) {
  var phone = normalizeStudentPhone(value);
  return /^0\d{9}$/.test(phone) || /^\+84\d{9}$/.test(phone);
}

function normalizeStudentCompareText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase();
}

function isEthnicMinorityBeneficiaryOption(beneficiary) {
  var text = normalizeStudentCompareText([beneficiary && beneficiary.TenDoiTuong, beneficiary && beneficiary.MoTa].filter(Boolean).join(' '));
  return text.indexOf('dan toc thieu so') >= 0;
}

function getSelectedEthnicityOption() {
  var select = document.getElementById('sv-dantoc');
  var code = select ? select.value : '';
  return allEthnicities.find(function(item) { return item.MaDanToc === code; }) || null;
}

function getSelectedMinorityBeneficiaryOptions() {
  var selected = new Set(getSelectedStudentBeneficiaryIds());
  return allBeneficiaries.filter(function(item) {
    return selected.has(item.MaDoiTuong) && isEthnicMinorityBeneficiaryOption(item);
  });
}

function getEthnicMinorityBeneficiaryError() {
  var ethnicity = getSelectedEthnicityOption();
  var minorityBeneficiaries = getSelectedMinorityBeneficiaryOptions();
  if (!ethnicity || !minorityBeneficiaries.length || ethnicity.LaDanTocThieuSo === true) return '';

  var beneficiaryNames = minorityBeneficiaries
    .map(function(item) { return item.TenDoiTuong || item.MaDoiTuong; })
    .join(', ');
  return '\u0110\u1ed1i t\u01b0\u1ee3ng "' + beneficiaryNames + '" ch\u1ec9 \u00e1p d\u1ee5ng cho sinh vi\u00ean thu\u1ed9c d\u00e2n t\u1ed9c thi\u1ec3u s\u1ed1. D\u00e2n t\u1ed9c hi\u1ec7n t\u1ea1i l\u00e0 "' + (ethnicity.TenDanToc || ethnicity.MaDanToc) + '".';
}

function validateEthnicMinorityBeneficiarySelection(showError) {
  var message = getEthnicMinorityBeneficiaryError();
  if (!message) return true;
  if (showError) showToast(message, 'error');
  return false;
}

(async function loadMajors() {
  try {
    var res = await apiFetch('/api/students/majors');
    if (!res.success) return;

    allMajors = res.data || [];
    var select = document.getElementById('sv-nganh');
    if (select) {
      allMajors.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m.MaNganh;
        opt.textContent = m.TenNganh + (m.TenKhoa ? ' (' + m.TenKhoa + ')' : '');
        select.appendChild(opt);
      });
    }

    initFacultyMajorFilters();
  } catch (e) {}
})();

(async function loadEthnicities() {
  try {
    var res = await apiFetch('/api/students/ethnicities');
    if (!res.success) return;

    allEthnicities = res.data || [];
    var select = document.getElementById('sv-dantoc');
    if (select) {
      select.onchange = function() { validateEthnicMinorityBeneficiarySelection(true); };
    }
    allEthnicities.forEach(function(e) {
      var opt = document.createElement('option');
      opt.value = e.MaDanToc;
      opt.textContent = e.TenDanToc;
      opt.dataset.minority = e.LaDanTocThieuSo === true ? 'true' : 'false';
      if (select) select.appendChild(opt);
    });
  } catch (e) {}
})();

(async function loadProvinces() {
  try {
    var res = await apiFetch('/api/students/provinces');
    if (!res.success) return;

    var select = document.getElementById('sv-tinh');
    res.data.forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.MaTinh;
      opt.textContent = p.TenTinh;
      select.appendChild(opt);
    });
  } catch (e) {}
})();

(async function loadBeneficiaries() {
  var box = document.getElementById('sv-doituong');

  try {
    var page = 1;
    var totalPages = 1;
    var rows = [];

    do {
      var res = await apiFetch('/api/beneficiaries?page=' + page);
      if (!res.success) throw new Error(res.message || 'Không thể tải đối tượng ưu tiên');

      rows = rows.concat(res.data || []);
      totalPages = res.pagination && res.pagination.totalPages ? Number(res.pagination.totalPages) : 1;
      page += 1;
    } while (page <= totalPages);

    allBeneficiaries = rows;
    renderStudentBeneficiaries();
  } catch (e) {
    if (box) {
      box.innerHTML = '<div class="empty-state">Không tải được đối tượng ưu tiên</div>';
    }
  }
})();

async function loadWards(provinceId, selectedWardId) {
  try {
    var select = document.getElementById('sv-phuongxa');
    select.innerHTML = '<option value="">Chọn Phường/Xã</option>';
    if (!provinceId) return;

    var res = await apiFetch('/api/students/provinces/' + provinceId + '/districts');
    if (!res.success) return;

    res.data.forEach(function(w) {
      var opt = document.createElement('option');
      opt.value = w.MaPhuongXa;
      opt.textContent = w.TenPhuongXa + (w.KhuVuc ? ' (' + w.KhuVuc + ')' : '');
      if (selectedWardId && w.MaPhuongXa === selectedWardId) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  } catch (e) {}
}

function getCurrentQueryValue(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function initFacultyMajorFilters() {
  var facultySelect = document.getElementById('filter-faculty');
  var majorSelect = document.getElementById('filter-major');
  if (!facultySelect || !majorSelect) return;

  var selectedFaculty = getCurrentQueryValue('MaKhoa');
  var selectedMajor = getCurrentQueryValue('MaNganh');
  var facultyMap = {};

  allMajors.forEach(function(m) {
    if (m.MaKhoa && !facultyMap[m.MaKhoa]) {
      facultyMap[m.MaKhoa] = m.TenKhoa || m.MaKhoa;
    }
  });

  Object.keys(facultyMap).sort().forEach(function(maKhoa) {
    var opt = document.createElement('option');
    opt.value = maKhoa;
    opt.textContent = facultyMap[maKhoa];
    if (selectedFaculty === maKhoa) opt.selected = true;
    facultySelect.appendChild(opt);
  });

  renderMajorFilterOptions(selectedFaculty, selectedMajor);
}

function renderMajorFilterOptions(maKhoa, selectedMajor) {
  var majorSelect = document.getElementById('filter-major');
  if (!majorSelect) return;

  majorSelect.innerHTML = '<option value="">Tất cả ngành</option>';
  allMajors
    .filter(function(m) { return !maKhoa || m.MaKhoa === maKhoa; })
    .forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m.MaNganh;
      opt.textContent = m.TenNganh;
      if (selectedMajor === m.MaNganh) opt.selected = true;
      majorSelect.appendChild(opt);
    });
}

function onFacultyFilterChange() {
  var faculty = document.getElementById('filter-faculty').value;
  renderMajorFilterOptions(faculty, '');
  applyFilters();
}

async function onProvinceChange() {
  var provinceId = document.getElementById('sv-tinh').value;
  await loadWards(provinceId);
}

function getStudentBeneficiaryIds(sv) {
  return (sv && sv.DOITUONGSINHVIEN ? sv.DOITUONGSINHVIEN : [])
    .map(function(row) { return row.MaDoiTuong || (row.DOITUONG && row.DOITUONG.MaDoiTuong); })
    .filter(Boolean);
}

function getSelectedStudentBeneficiaryIds() {
  var box = document.getElementById('sv-doituong');
  if (!box) return [];

  return Array.prototype.slice.call(box.querySelectorAll('input[type="checkbox"]:checked'))
    .map(function(input) { return input.value; })
    .filter(Boolean);
}

function formatBeneficiaryOption(beneficiary) {
  var discount = Number(beneficiary.TiLeGiamHocPhi || 0);
  var status = beneficiary.TrangThai === false ? ' - Ngưng áp dụng' : '';
  return beneficiary.MaDoiTuong + ' - ' + beneficiary.TenDoiTuong + ' (' + discount + '%)' + status;
}

function renderStudentBeneficiaries(sv) {
  var box = document.getElementById('sv-doituong');
  if (!box) return;

  if (sv !== undefined) currentStudentBeneficiaryIds = getStudentBeneficiaryIds(sv);
  var selectedSet = new Set(currentStudentBeneficiaryIds);

  box.innerHTML = '';
  if (!allBeneficiaries.length) {
    box.innerHTML = '<div class="empty-state">Chưa có đối tượng ưu tiên</div>';
    return;
  }

  allBeneficiaries.forEach(function(beneficiary, index) {
    var checkboxId = 'sv-doituong-' + index;
    var item = document.createElement('label');
    item.className = 'student-beneficiary-check';
    item.setAttribute('for', checkboxId);

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = checkboxId;
    input.value = beneficiary.MaDoiTuong;
    input.checked = selectedSet.has(beneficiary.MaDoiTuong);
    input.addEventListener('change', function() {
      validateEthnicMinorityBeneficiarySelection(true);
    });

    var text = document.createElement('span');
    text.className = 'student-beneficiary-check-text';
    text.textContent = formatBeneficiaryOption(beneficiary);

    item.appendChild(input);
    item.appendChild(text);
    box.appendChild(item);
  });
}

function setStudentAvatarPreview(url, name) {
  var img = document.getElementById('sv-avatar-img');
  var initials = document.getElementById('sv-avatar-initials');
  if (!img || !initials) return;

  var fallback = (name || 'SV').trim().charAt(0).toUpperCase() || 'SV';
  if (url) {
    img.src = url;
    img.classList.remove('hidden');
    initials.classList.add('hidden');
  } else {
    img.removeAttribute('src');
    img.classList.add('hidden');
    initials.textContent = fallback;
    initials.classList.remove('hidden');
  }
}

function resetStudentAvatarInput() {
  selectedStudentAvatarFile = null;
  var input = document.getElementById('sv-avatar-input');
  var button = document.getElementById('btn-upload-student-avatar');
  if (input) input.value = '';
  if (button) button.disabled = true;
}

function bindStudentAvatarInput() {
  var input = document.getElementById('sv-avatar-input');
  var button = document.getElementById('btn-upload-student-avatar');
  if (!input) return;

  input.addEventListener('change', function() {
    var file = input.files && input.files[0];
    selectedStudentAvatarFile = null;
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

    selectedStudentAvatarFile = file;
    setStudentAvatarPreview(URL.createObjectURL(file), document.getElementById('sv-hoten').value);
    if (button) button.disabled = !editingId;
  });
}

async function uploadStudentAvatar() {
  if (!editingId) {
    showToast('Vui lòng lưu sinh viên trước khi cập nhật ảnh', 'error');
    return;
  }

  if (!selectedStudentAvatarFile) {
    showToast('Vui lòng chọn ảnh đại diện', 'error');
    return;
  }

  var button = document.getElementById('btn-upload-student-avatar');
  if (button) {
    button.disabled = true;
    button.textContent = 'Đang tải...';
  }

  try {
    var formData = new FormData();
    formData.append('avatar', selectedStudentAvatarFile);
    var res = await apiFetch('/api/students/' + encodeURIComponent(editingId) + '/avatar', {
      method: 'POST',
      body: formData
    });

    if (res.success) {
      showToast(res.message || 'Cập nhật ảnh đại diện thành công', 'success');
      selectedStudentAvatarFile = null;
      setStudentAvatarPreview(res.data && res.data.avatarUrl, document.getElementById('sv-hoten').value);
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể cập nhật ảnh đại diện', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối khi tải ảnh đại diện', 'error');
  } finally {
    if (button) {
      button.disabled = true;
      button.textContent = 'Cập nhật ảnh';
    }
    var input = document.getElementById('sv-avatar-input');
    if (input) input.value = '';
  }
}

function switchSvTab(clickedBtn) {
  var tabs = document.querySelectorAll('.modal-tabs .tab-btn');
  var panes = document.querySelectorAll('.tab-content .tab-pane');
  
  tabs.forEach(function(btn) {
    btn.classList.remove('active');
    btn.style.borderBottomColor = 'transparent';
    btn.style.color = 'var(--text-color, #374151)';
    btn.style.fontWeight = 'normal';
  });
  panes.forEach(function(pane) {
    pane.style.display = 'none';
  });

  clickedBtn.classList.add('active');
  clickedBtn.style.borderBottomColor = 'var(--primary-color, #0ea5e9)';
  clickedBtn.style.color = 'var(--primary-color, #0ea5e9)';
  clickedBtn.style.fontWeight = '600';

  var tabId = clickedBtn.getAttribute('data-tab');
  var targetPane = document.getElementById(tabId);
  if (targetPane) targetPane.style.display = 'block';
}

function openModal(mode, sv) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa sinh viên' : 'Thêm sinh viên';
  document.getElementById('sv-mssv').disabled = mode === 'edit';

  if (mode === 'edit' && sv) {
    editingId = sv.MaSv;
    document.getElementById('sv-mssv').value = sv.MaSv || '';
    document.getElementById('sv-hoten').value = sv.HoTen || '';
    document.getElementById('sv-email').value = sv.Email || '';
    document.getElementById('sv-sdt').value = sv.Sdt || '';
    document.getElementById('sv-ngaysinh').value = asDateInput(sv.NgaySinh);
    document.getElementById('sv-gioitinh').value = sv.GioiTinh || 'Nam';
    document.getElementById('sv-cmnd').value = sv.Cccd || '';
    document.getElementById('sv-dantoc').value = sv.MaDanToc || '';
    document.getElementById('sv-diachi').value = sv.DiaChiLienHe || '';
    document.getElementById('sv-nganh').value = sv.MaNganh || '';
    resetStudentAvatarInput();
    setStudentAvatarPreview(sv.AnhDaiDien, sv.HoTen);
    renderStudentBeneficiaries(sv);
    document.getElementById('sv-trangthai').value = sv.TrangThai || 'Đang học';

    if (sv.PHUONGXA) {
      document.getElementById('sv-tinh').value = sv.PHUONGXA.MaTinh || '';
      loadWards(sv.PHUONGXA.MaTinh, sv.MaPhuongXa);
    } else {
      document.getElementById('sv-tinh').value = '';
      document.getElementById('sv-phuongxa').innerHTML = '<option value="">Chọn Phường/Xã</option>';
    }
  } else {
    document.getElementById('student-form').reset();
    document.getElementById('sv-dantoc').value = '';
    renderStudentBeneficiaries(null);
    resetStudentAvatarInput();
    setStudentAvatarPreview('', '');
    document.getElementById('sv-tinh').value = '';
    document.getElementById('sv-phuongxa').innerHTML = '<option value="">Chọn Phường/Xã</option>';
    document.getElementById('sv-trangthai').value = 'Đang học';
  }

  // Reset to first tab
  var firstTabBtn = document.querySelector('.modal-tabs .tab-btn[data-tab="sv-tab-personal"]');
  if (firstTabBtn) switchSvTab(firstTabBtn);

  document.getElementById('student-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('student-modal').classList.remove('active');
}

async function saveStudent() {
  var email = normalizeStudentEmail(document.getElementById('sv-email').value);
  var phone = normalizeStudentPhone(document.getElementById('sv-sdt').value);
  var data = {
    MaSv: document.getElementById('sv-mssv').value.trim(),
    HoTen: document.getElementById('sv-hoten').value.trim(),
    Email: email || null,
    Sdt: phone || null,
    NgaySinh: document.getElementById('sv-ngaysinh').value,
    GioiTinh: document.getElementById('sv-gioitinh').value,
    Cccd: document.getElementById('sv-cmnd').value.trim() || null,
    MaDanToc: document.getElementById('sv-dantoc').value,
    MaPhuongXa: document.getElementById('sv-phuongxa').value,
    DiaChiLienHe: document.getElementById('sv-diachi').value.trim() || null,
    MaNganh: document.getElementById('sv-nganh').value,
    TrangThai: document.getElementById('sv-trangthai').value,
    MaDoiTuongs: getSelectedStudentBeneficiaryIds()
  };

  if (!data.Cccd || !data.MaDanToc || !data.DiaChiLienHe || !data.MaPhuongXa) {
    showToast('CCCD, dân tộc, địa chỉ liên hệ và phường/xã là bắt buộc', 'error');
    return;
  }

  if (data.Email && !isValidStudentEmail(data.Email)) {
    showToast('Email sinh viên không hợp lệ', 'error');
    return;
  }

  if (data.Sdt && !isValidStudentPhone(data.Sdt)) {
    showToast('Số điện thoại phải có 10 chữ số bắt đầu bằng 0 hoặc dùng định dạng +84', 'error');
    return;
  }

  if (!validateEthnicMinorityBeneficiarySelection(true)) {
    return;
  }

  try {
    var res = editingId
      ? await apiFetch('/api/students/' + editingId, { method: 'PUT', body: data })
      : await apiFetch('/api/students', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cập nhật sinh viên thành công' : 'Thêm sinh viên thành công', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu sinh viên', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteStudent(maSv) {
  if (!confirm('Bạn có chắc muốn xóa sinh viên ' + maSv + '?')) return;
  try {
    var res = await apiFetch('/api/students/' + maSv, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa sinh viên', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa sinh viên', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var searchField = document.getElementById('student-search-field') ? document.getElementById('student-search-field').value : 'all';
  var status = document.getElementById('filter-status').value;
  var faculty = document.getElementById('filter-faculty') ? document.getElementById('filter-faculty').value : '';
  var major = document.getElementById('filter-major') ? document.getElementById('filter-major').value : '';
  var url = '/admin/students?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (searchField && searchField !== 'all') url += '&searchField=' + encodeURIComponent(searchField);
  if (status) url += '&status=' + encodeURIComponent(status);
  if (faculty) url += '&MaKhoa=' + encodeURIComponent(faculty);
  if (major) url += '&MaNganh=' + encodeURIComponent(major);
  navigatePageContent(url);
}

async function exportStudents() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input').value;
  var searchField = document.getElementById('student-search-field') ? document.getElementById('student-search-field').value : 'all';
  var status = document.getElementById('filter-status').value;
  var faculty = document.getElementById('filter-faculty') ? document.getElementById('filter-faculty').value : '';
  var major = document.getElementById('filter-major') ? document.getElementById('filter-major').value : '';

  if (search) params.set('search', search);
  if (searchField && searchField !== 'all') params.set('searchField', searchField);
  if (status) params.set('TrangThai', status);
  if (faculty) params.set('MaKhoa', faculty);
  if (major) params.set('MaNganh', major);

  var query = params.toString();
  var url = '/api/students/export' + (query ? '?' + query : '');

  try {
    var token = getToken();
    var res = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    });

    if (res.status === 401) {
      showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
      clearToken();
      window.location.href = '/admin/login';
      return;
    }

    if (!res.ok) {
      showToast('Không thể xuất Excel', 'error');
      return;
    }

    var blob = await res.blob();
    var downloadUrl = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'danh-sach-sinh-vien.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (e) {
    showToast('Lỗi kết nối khi xuất Excel', 'error');
  }
}

function onImportStudentsFileChange() {
  var input = document.getElementById('students-import-input');
  var result = document.getElementById('students-import-result');
  selectedStudentsImportFile = input && input.files ? input.files[0] : null;

  if (result) {
    result.classList.toggle('hidden', !selectedStudentsImportFile);
    result.innerHTML = selectedStudentsImportFile
      ? [
          '<div class=card><div class=card-body>',
          '<h3>Nhập danh sách sinh viên</h3>',
          '<p>Đã chọn file: <strong>' + studentEscapeHtml(selectedStudentsImportFile.name) + '</strong></p>',
          '<button class=btn type=button onclick=importStudents()>Xác nhận nhập</button>',
          '</div></div>'
        ].join('')
      : '';
  }
}

async function importStudents() {
  if (!selectedStudentsImportFile) {
    showToast('Vui lòng chọn file Excel', 'error');
    return;
  }

  var result = document.getElementById('students-import-result');
  if (result) {
    result.classList.remove('hidden');
    result.innerHTML = '<div class=card><div class=card-body>Đang nhập dữ liệu...</div></div>';
  }

  try {
    var formData = new FormData();
    formData.append('file', selectedStudentsImportFile);
    var res = await apiFetch('/api/students/import', {
      method: 'POST',
      body: formData
    });

    if (res.success) {
      var data = res.data || {};
      var html = [
        '<div class=card><div class=card-body>',
        '<h3>Kết quả nhập Excel</h3>',
        '<p>Thành công: <strong>' + Number(data.successCount || 0) + '</strong> | Lỗi: <strong>' + Number(data.errorCount || 0) + '</strong></p>'
      ].join('');

      if (data.errors && data.errors.length) {
        html += '<table class=data-table><thead><tr><th>Dòng</th><th>MSSV</th><th>Lý do lỗi</th></tr></thead><tbody>';
        data.errors.forEach(function(error) {
          html += '<tr>';
          html += '<td>' + studentEscapeHtml(error.row || '-') + '</td>';
          html += '<td>' + studentEscapeHtml(error.MaSv || '-') + '</td>';
          html += '<td>' + studentEscapeHtml(error.reason || '-') + '</td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
      }

      html += '</div></div>';
      if (result) result.innerHTML = html;
      showToast(res.message || 'Nhập Excel hoàn tất', 'success');
      if (!data.errorCount && data.successCount) {
        setTimeout(function() { location.reload(); }, 800);
      }
    } else {
      showToast(res.message || 'Không thể nhập Excel', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối khi nhập Excel', 'error');
  } finally {
    var input = document.getElementById('students-import-input');
    if (input) input.value = '';
    selectedStudentsImportFile = null;
  }
}

function formatStudentDetailDate(value) {
  if (!value) return '-';
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
}

function buildStudentDetail(record) {
  var major = record.NGANHHOC || {};
  var faculty = major.KHOA || {};
  var ethnicity = record.DANTOC || {};
  var ward = record.PHUONGXA || {};
  var beneficiaries = (record.DOITUONGSINHVIEN || [])
    .map(function(item) { return item.DOITUONG ? item.DOITUONG.TenDoiTuong : item.MaDoiTuong; })
    .filter(Boolean)
    .join(', ');

  return {
    title: 'Chi tiết sinh viên ' + (record.MaSv || ''),
    rows: [
      { label: 'MSSV', value: record.MaSv },
      { label: 'Họ tên', value: record.HoTen },
      { label: 'Giới tính', value: record.GioiTinh },
      { label: 'Ngày sinh', value: formatStudentDetailDate(record.NgaySinh) },
      { label: 'Email', value: record.Email },
      { label: 'Số điện thoại', value: record.Sdt },
      { label: 'Ngành', value: major.TenNganh || record.MaNganh },
      { label: 'Khoa', value: faculty.TenKhoa || major.MaKhoa },
      { label: 'Dân tộc', value: ethnicity.TenDanToc || record.MaDanToc },
      { label: 'Phường/xã', value: ward.TenPhuongXa || record.MaPhuongXa },
      { label: 'Địa chỉ liên hệ', value: record.DiaChiLienHe },
      { label: 'Đối tượng ưu tiên', value: beneficiaries },
      { label: 'Trạng thái', value: record.TrangThai },
      { label: 'Sửa bởi', value: record.NguoiCapNhatTen || record.NguoiCapNhat },
      { label: 'Sửa lúc', value: formatStudentDetailDate(record.NgayCapNhat) }
    ]
  };
}

function initStudentRowDetails() {
  if (!window.AdminUI) return;
  AdminUI.attachRowDetailHandlers({ table: 'table.students-table', rowSelector: 'tbody tr[data-record]', buildDetail: buildStudentDetail });
}

bindStudentAvatarInput();
initStudentRowDetails();
