var editingId = null;
var academicYears = [];
var academicYearsLoaded = false;

function asDateInput(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

function getAcademicYearLabel(year) {
  if (!year) return '';
  var code = year.MaNamHoc || '';
  var name = year.TenNamHoc || code;
  return name && code && name !== code ? name + ' (' + code + ')' : name;
}

function renderAcademicYearOptions(selectedValue) {
  var select = document.getElementById('hk-manamhoc');
  if (!select) return;

  var currentValue = selectedValue !== undefined ? selectedValue : select.value;
  select.innerHTML = '';

  var placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = academicYearsLoaded ? 'Chọn năm học' : 'Đang tải năm học...';
  select.appendChild(placeholder);

  var hasCurrentValue = false;
  academicYears.forEach(function(year) {
    if (!year.MaNamHoc) return;
    var option = document.createElement('option');
    option.value = year.MaNamHoc;
    option.textContent = getAcademicYearLabel(year);
    if (year.MaNamHoc === currentValue) hasCurrentValue = true;
    select.appendChild(option);
  });

  if (currentValue && !hasCurrentValue) {
    var currentOption = document.createElement('option');
    currentOption.value = currentValue;
    currentOption.textContent = currentValue + ' (hiện tại)';
    select.appendChild(currentOption);
  }

  select.value = currentValue || '';
}

async function loadAcademicYears(selectedValue) {
  var select = document.getElementById('hk-manamhoc');
  if (select && !academicYearsLoaded && academicYears.length === 0) {
    renderAcademicYearOptions(selectedValue);
  }

  try {
    var res = await apiFetch('/api/semesters/years');
    academicYearsLoaded = true;
    if (res.success && Array.isArray(res.data)) {
      academicYears = res.data;
      renderAcademicYearOptions(selectedValue !== undefined ? selectedValue : (select ? select.value : ''));
      return;
    }

    renderAcademicYearOptions(selectedValue !== undefined ? selectedValue : (select ? select.value : ''));
    showToast(res.message || 'Không thể tải danh sách năm học', 'error');
  } catch (e) {
    academicYearsLoaded = true;
    renderAcademicYearOptions(selectedValue !== undefined ? selectedValue : (select ? select.value : ''));
    showToast('Lỗi kết nối khi tải năm học', 'error');
  }
}

function setAcademicYearValue(value) {
  renderAcademicYearOptions(value || '');
  if (!academicYearsLoaded) loadAcademicYears(value || '');
}

function inferSemesterOrder() {
  var type = document.getElementById('hk-loai').value;
  var current = parseInt(document.getElementById('hk-thutu').value, 10);
  if (type === 'Hè') return 3;
  if (current === 1 || current === 2) return current;

  var text = [
    document.getElementById('hk-ma').value,
    document.getElementById('hk-ten').value
  ].join(' ').toLowerCase();
  if (/(^|\D)(2|ii)(\D|$)/.test(text) || text.indexOf('hk2') >= 0) return 2;
  return 1;
}

function syncSemesterOrder() {
  var orderInput = document.getElementById('hk-thutu');
  if (orderInput) orderInput.value = inferSemesterOrder();
}

function setDatePairError(startId, endId, errorId, message) {
  var startEl = document.getElementById(startId);
  var endEl = document.getElementById(endId);
  var errorEl = document.getElementById(errorId);
  if (!startEl || !endEl || !errorEl) return;

  startEl.classList.toggle('is-invalid', Boolean(message));
  endEl.classList.toggle('is-invalid', Boolean(message));
  errorEl.textContent = message || '';
  errorEl.classList.toggle('active', Boolean(message));
}

function validateDatePair(startId, endId, errorId, message) {
  var start = document.getElementById(startId).value;
  var end = document.getElementById(endId).value;
  var hasError = Boolean(start && end && start >= end);
  setDatePairError(startId, endId, errorId, hasError ? message : '');
  return !hasError;
}

function validateSemesterDates() {
  var termValid = validateDatePair(
    'hk-batdau',
    'hk-ketthuc',
    'hk-term-date-error',
    'Ngày bắt đầu phải trước ngày kết thúc'
  );
  var registrationValid = validateDatePair(
    'hk-batdaudk',
    'hk-ketthucdk',
    'hk-registration-date-error',
    'Ngày bắt đầu đăng ký phải trước ngày kết thúc đăng ký'
  );
  return termValid && registrationValid;
}

function bindSemesterDateValidation() {
  ['hk-batdau', 'hk-ketthuc', 'hk-batdaudk', 'hk-ketthucdk'].forEach(function(id) {
    var input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', validateSemesterDates);
    input.addEventListener('change', validateSemesterDates);
  });
}

function openModal(mode, s) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa học kỳ' : 'Thêm học kỳ';
  document.getElementById('hk-ma').disabled = mode === 'edit';

  if (mode === 'edit' && s) {
    editingId = s.MaHocKy;
    document.getElementById('hk-ma').value = s.MaHocKy || '';
    document.getElementById('hk-ten').value = s.TenHocKy || '';
    setAcademicYearValue(s.MaNamHoc || '');
    document.getElementById('hk-loai').value = s.LoaiHocKy || 'Chính';
    document.getElementById('hk-thutu').value = s.ThuTu || 1;
    document.getElementById('hk-batdau').value = asDateInput(s.NgayBatDau);
    document.getElementById('hk-ketthuc').value = asDateInput(s.NgayKetThuc);
    document.getElementById('hk-batdaudk').value = asDateInput(s.NgayBatDauDangKy);
    document.getElementById('hk-ketthucdk').value = asDateInput(s.NgayKetThucDangKy);
    document.getElementById('hk-hanhocphi').value = asDateInput(s.HanDongHocPhi);
    document.getElementById('hk-trangthai').value = s.TrangThai || 'Sắp diễn ra';
  } else {
    document.getElementById('semester-form').reset();
    setAcademicYearValue('');
    document.getElementById('hk-loai').value = 'Chính';
    document.getElementById('hk-thutu').value = 1;
    document.getElementById('hk-trangthai').value = 'Sắp diễn ra';
  }

  validateSemesterDates();
  document.getElementById('semester-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('semester-modal').classList.remove('active');
}

async function saveSemester() {
  syncSemesterOrder();
  var data = {
    MaHocKy: document.getElementById('hk-ma').value.trim(),
    TenHocKy: document.getElementById('hk-ten').value.trim(),
    MaNamHoc: document.getElementById('hk-manamhoc').value.trim(),
    LoaiHocKy: document.getElementById('hk-loai').value,
    ThuTu: parseInt(document.getElementById('hk-thutu').value, 10) || 1,
    NgayBatDau: document.getElementById('hk-batdau').value || null,
    NgayKetThuc: document.getElementById('hk-ketthuc').value || null,
    NgayBatDauDangKy: document.getElementById('hk-batdaudk').value || null,
    NgayKetThucDangKy: document.getElementById('hk-ketthucdk').value || null,
    HanDongHocPhi: document.getElementById('hk-hanhocphi').value || null,
    TrangThai: document.getElementById('hk-trangthai').value
  };

  if (!data.MaHocKy || !data.TenHocKy || !data.MaNamHoc) {
    showToast('Vui lòng nhập đầy đủ mã học kỳ, tên học kỳ và năm học', 'error');
    return;
  }
  if (!validateSemesterDates()) {
    showToast('Vui lòng kiểm tra lại các mốc ngày', 'error');
    return;
  }

  try {
    var res = editingId
      ? await apiFetch('/api/semesters/' + editingId, { method: 'PUT', body: data })
      : await apiFetch('/api/semesters', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cập nhật học kỳ thành công' : 'Thêm học kỳ thành công', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu học kỳ', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadAcademicYears();
  bindSemesterDateValidation();
  ['hk-ma', 'hk-ten', 'hk-loai'].forEach(function(id) {
    var input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', syncSemesterOrder);
    input.addEventListener('input', syncSemesterOrder);
  });
});

async function deleteSemester(id) {
  if (!confirm('Bạn có chắc muốn xóa học kỳ này?')) return;
  try {
    var res = await apiFetch('/api/semesters/' + id, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa học kỳ', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa học kỳ', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}
