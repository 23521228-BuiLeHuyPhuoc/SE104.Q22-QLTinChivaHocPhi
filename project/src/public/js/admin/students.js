var editingId = null;
var selectedStudentAvatarFile = null;
var selectedStudentsImportFile = null;
var allMajors = [];

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

    var select = document.getElementById('sv-dantoc');
    res.data.forEach(function(e) {
      var opt = document.createElement('option');
      opt.value = e.MaDanToc;
      opt.textContent = e.TenDanToc;
      select.appendChild(opt);
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

function renderStudentBeneficiaries(sv) {
  var box = document.getElementById('student-beneficiaries-current');
  if (!box) return;

  var rows = sv && sv.DOITUONGSINHVIEN ? sv.DOITUONGSINHVIEN : [];
  if (!rows.length) {
    box.innerHTML = '<div class=empty-state>Chưa thuộc đối tượng ưu tiên nào</div>';
    return;
  }

  box.innerHTML = rows.map(function(row) {
    var dt = row.DOITUONG || {};
    return [
      '<div class=beneficiary-readonly-item>',
      '<strong>' + (dt.MaDoiTuong || row.MaDoiTuong || '-') + ' - ' + (dt.TenDoiTuong || '-') + '</strong>',
      '<small>Tỉ lệ giảm: ' + Number(dt.TiLeGiamHocPhi || 0) + '%</small>',
      '<small>Độ ưu tiên: ' + (dt.DoUuTien || '-') + '</small>',
      '</div>'
    ].join('');
  }).join('');
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

  document.getElementById('student-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('student-modal').classList.remove('active');
}

async function saveStudent() {
  var data = {
    MaSv: document.getElementById('sv-mssv').value.trim(),
    HoTen: document.getElementById('sv-hoten').value.trim(),
    Email: document.getElementById('sv-email').value.trim() || null,
    Sdt: document.getElementById('sv-sdt').value.trim() || null,
    NgaySinh: document.getElementById('sv-ngaysinh').value,
    GioiTinh: document.getElementById('sv-gioitinh').value,
    Cccd: document.getElementById('sv-cmnd').value.trim() || null,
    MaDanToc: document.getElementById('sv-dantoc').value,
    MaPhuongXa: document.getElementById('sv-phuongxa').value,
    DiaChiLienHe: document.getElementById('sv-diachi').value.trim() || null,
    MaNganh: document.getElementById('sv-nganh').value,
    TrangThai: document.getElementById('sv-trangthai').value
  };

  if (!data.Cccd || !data.MaDanToc || !data.DiaChiLienHe || !data.MaPhuongXa) {
    showToast('CCCD, dân tộc, địa chỉ liên hệ và phường/xã là bắt buộc', 'error');
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
  var status = document.getElementById('filter-status').value;
  var faculty = document.getElementById('filter-faculty') ? document.getElementById('filter-faculty').value : '';
  var major = document.getElementById('filter-major') ? document.getElementById('filter-major').value : '';
  var url = '/admin/students?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (status) url += '&status=' + encodeURIComponent(status);
  if (faculty) url += '&MaKhoa=' + encodeURIComponent(faculty);
  if (major) url += '&MaNganh=' + encodeURIComponent(major);
  window.location.href = url;
}

async function exportStudents() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input').value;
  var status = document.getElementById('filter-status').value;
  var faculty = document.getElementById('filter-faculty') ? document.getElementById('filter-faculty').value : '';
  var major = document.getElementById('filter-major') ? document.getElementById('filter-major').value : '';

  if (search) params.set('search', search);
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
  AdminUI.attachRowDetailHandlers({ table: '#students-table', rowSelector: 'tr[data-record]', buildDetail: buildStudentDetail });
}

bindStudentAvatarInput();
initStudentRowDetails();
