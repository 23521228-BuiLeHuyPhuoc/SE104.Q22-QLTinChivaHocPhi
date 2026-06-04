var editingId = null;
var academicYears = [];
var academicYearsLoaded = false;
var semesterSearchTimer = null;
var semesterPage = 1;
var semesterRecords = [];
var SEMESTER_PAGE_LIMIT = '5';

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function asDateInput(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

function formatSemesterDate(value) {
  var dateValue = asDateInput(value);
  if (!dateValue) return '-';
  var parts = dateValue.split('-');
  if (parts.length !== 3) return '-';
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function formatSemesterDateTime(value) {
  if (!value) return '-';
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
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

function getSemesterKindFromRecord(semester) {
  if (!semester) return '1';
  var order = parseInt(semester.ThuTu, 10);
  if (semester.LoaiHocKy === 'Hè' || order === 3) return '3';
  if (order === 2) return '2';
  return '1';
}

function getSemesterKindLabel(semester) {
  var kind = getSemesterKindFromRecord(semester);
  if (kind === '3') return 'Học kỳ hè';
  if (kind === '2') return 'Học kỳ II';
  return 'Học kỳ I';
}

function getSemesterTypePayload() {
  var kind = document.getElementById('hk-loai').value || '1';
  var order = parseInt(kind, 10) || 1;
  return {
    LoaiHocKy: order === 3 ? 'Hè' : 'Chính',
    ThuTu: order
  };
}

function inferSemesterOrder() {
  var type = document.getElementById('hk-loai').value;
  var current = parseInt(document.getElementById('hk-thutu').value, 10);
  var selectedOrder = parseInt(type, 10);
  if (selectedOrder === 1 || selectedOrder === 2 || selectedOrder === 3) return selectedOrder;
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

function getActiveSegmentValue(groupId) {
  var group = document.getElementById(groupId);
  if (!group) return '';
  var active = group.querySelector('.segmented-option.active');
  return active ? active.dataset.value || '' : '';
}

function setActiveSegmentValue(groupId, value) {
  var group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.segmented-option').forEach(function(button) {
    button.classList.toggle('active', (button.dataset.value || '') === value);
  });
}

function getSemesterFilters() {
  var keyword = document.getElementById('semester-keyword');
  var searchScope = document.getElementById('semester-search-scope');
  var dateField = document.getElementById('semester-date-field');
  var dateExact = document.getElementById('semester-date-exact');
  var registrationFinalized = document.getElementById('semester-registration-finalized');
  var tuitionOpen = document.getElementById('semester-tuition-open');
  var exactValue = dateExact ? dateExact.value : '';

  if (dateExact) dateExact.classList.remove('is-invalid');

  return {
    q: keyword ? keyword.value.trim() : '',
    searchScope: searchScope ? searchScope.value : 'semesterCode',
    semesterKind: getActiveSegmentValue('semester-kind-filter'),
    status: getActiveSegmentValue('semester-status-filter'),
    registrationFinalized: registrationFinalized ? registrationFinalized.value : '',
    tuitionOpen: tuitionOpen ? tuitionOpen.value : '',
    dateField: dateField ? dateField.value : 'all',
    dateExact: exactValue,
    limit: SEMESTER_PAGE_LIMIT
  };
}

function buildSemesterQuery(page) {
  var filters = getSemesterFilters();
  if (!filters) return null;

  var params = new URLSearchParams();
  params.set('page', String(page || 1));
  params.set('limit', filters.limit);
  if (filters.q) params.set('q', filters.q);
  if (filters.q && filters.searchScope) params.set('searchScope', filters.searchScope);
  if (filters.semesterKind) params.set('semesterKind', filters.semesterKind);
  if (filters.status) params.set('status', filters.status);
  if (filters.registrationFinalized) params.set('registrationFinalized', filters.registrationFinalized);
  if (filters.tuitionOpen) params.set('tuitionOpen', filters.tuitionOpen);
  if (filters.dateField && filters.dateField !== 'all') params.set('dateField', filters.dateField);
  if (filters.dateExact) params.set('dateExact', filters.dateExact);
  return params;
}

function setSemesterLoading() {
  var body = document.getElementById('semester-list-body');
  if (!body) return;
  body.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Đang tải học kỳ...</span></div>';
}

function getSemesterStatusBadge(status) {
  if (status === 'Đang diễn ra') return 'badge-success';
  if (status === 'Sắp diễn ra' || status === 'Sắp tới') return 'badge-warning';
  return 'badge-secondary';
}

function formatSemesterDetailStatus(condition, yesLabel, noLabel) {
  return condition ? yesLabel : noLabel;
}

function initSemesterRowDetails() {
  if (!window.AdminUI) return;
  var body = document.getElementById('semester-list-body');
  if (!body) return;
  AdminUI.attachRowDetailHandlers({
    root: body,
    rowSelector: '.semester-list-row[data-record-index]',
    getRecord: function(row) {
      var index = parseInt(row.getAttribute('data-record-index'), 10);
      return Number.isFinite(index) ? semesterRecords[index] : null;
    },
    buildDetail: function(record) {
      var yearName = record.NAMHOC && record.NAMHOC.TenNamHoc ? record.NAMHOC.TenNamHoc : (record.TenNamHoc || record.MaNamHoc || '-');
      return {
        title: 'Chi tiết học kỳ ' + (record.MaHocKy || ''),
        rows: [
          { label: 'Mã học kỳ', value: record.MaHocKy },
          { label: 'Tên học kỳ', value: record.TenHocKy },
          { label: 'Năm học', value: yearName },
          { label: 'Loại học kỳ', value: getSemesterKindLabel(record) },
          { label: 'Trạng thái học kỳ', value: record.TrangThai || '-' },
          { label: 'Bắt đầu học kỳ', value: formatSemesterDate(record.NgayBatDau) },
          { label: 'Kết thúc học kỳ', value: formatSemesterDate(record.NgayKetThuc) },
          { label: 'Bắt đầu đăng ký', value: formatSemesterDate(record.NgayBatDauDangKy) },
          { label: 'Hạn đăng ký', value: formatSemesterDate(record.NgayKetThucDangKy) },
          { label: 'Ngày chốt đăng ký', value: formatSemesterDate(record.NgayChotDangKy) },
          { label: 'Trạng thái chốt đăng ký', value: formatSemesterDetailStatus(record.NgayChotDangKy, 'Đã chốt đăng ký', 'Chưa chốt đăng ký') },
          { label: 'Trạng thái mở thu', value: formatSemesterDetailStatus(record.MoThuHocPhi, 'Đang mở thu', 'Chưa mở thu') },
          { label: 'Ngày mở thu học phí', value: formatSemesterDate(record.NgayMoThuHocPhi) },
          { label: 'Hạn đóng học phí', value: formatSemesterDate(record.HanDongHocPhi) },
          { label: 'Số lớp mở', value: record.SoLopMo || 0 },
          { label: 'Số sinh viên đăng ký', value: record.SoSinhVienDangKy || 0 },
          { label: 'Người sửa', value: record.NguoiCapNhatTen || record.NguoiCapNhat || '-' },
          { label: 'Thời điểm sửa', value: formatSemesterDateTime(record.NgayCapNhat) }
        ]
      };
    }
  });
}
function renderSemesterRows(rows) {
  var body = document.getElementById('semester-list-body');
  if (!body) return;

  if (!rows || rows.length === 0) {
    body.innerHTML = '<div class="empty-state"><h4>Không tìm thấy học kỳ</h4><p>Thử đổi học kỳ, trạng thái hoặc khoảng mốc thời gian.</p></div>';
    return;
  }

  body.innerHTML = rows.map(function(s, index) {
    var yearName = s.NAMHOC && s.NAMHOC.TenNamHoc ? s.NAMHOC.TenNamHoc : (s.TenNamHoc || s.MaNamHoc || '-');
    var status = s.TrangThai || '-';
    return [
      '<div class="semester-list-row ui-row-clickable" data-record-index="' + index + '">',
        '<div class="semester-identity">',
          '<div class="semester-meta">',
            '<div class="semester-field"><span class="semester-field-label">Mã</span><span class="semester-field-value mono">' + escapeHtml(s.MaHocKy || '-') + '</span></div>',
            '<div class="semester-field"><span class="semester-field-label">Năm học</span><span class="semester-field-value">' + escapeHtml(yearName) + '</span></div>',
            '<div class="semester-field"><span class="semester-field-label">Học kỳ</span><span class="semester-field-value">' + escapeHtml(getSemesterKindLabel(s)) + '</span></div>',
          '</div>',
        '</div>',
        '<div class="semester-date-grid">',
          '<div class="semester-field"><span class="semester-field-label">Bắt đầu kỳ</span><span class="semester-field-value">' + escapeHtml(formatSemesterDate(s.NgayBatDau)) + '</span></div>',
          '<div class="semester-field"><span class="semester-field-label">Kết thúc kỳ</span><span class="semester-field-value">' + escapeHtml(formatSemesterDate(s.NgayKetThuc)) + '</span></div>',
          '<div class="semester-field"><span class="semester-field-label">Bắt đầu đăng ký</span><span class="semester-field-value">' + escapeHtml(formatSemesterDate(s.NgayBatDauDangKy)) + '</span></div>',
          '<div class="semester-field"><span class="semester-field-label">Hạn đăng ký</span><span class="semester-field-value">' + escapeHtml(formatSemesterDate(s.NgayKetThucDangKy)) + '</span></div>',
          '<div class="semester-field"><span class="semester-field-label">Bắt đầu cứu xét</span><span class="semester-field-value">' + escapeHtml(formatSemesterDate(s.NgayBatDauCuuXet)) + '</span></div>',
          '<div class="semester-field"><span class="semester-field-label">Hạn cứu xét</span><span class="semester-field-value">' + escapeHtml(formatSemesterDate(s.NgayKetThucCuuXet)) + '</span></div>',
          '<div class="semester-field semester-field-wide"><span class="semester-field-label">Hạn học phí</span><span class="semester-field-value">' + escapeHtml(formatSemesterDate(s.HanDongHocPhi)) + '</span></div>',
        '</div>',
        '<div class="semester-state">',
          '<span class="badge ' + getSemesterStatusBadge(status) + '">' + escapeHtml(status) + '</span>',
          '<span class="badge ' + (s.NgayChotDangKy ? 'badge-success' : 'badge-secondary') + '">' + (s.NgayChotDangKy ? 'Đã chốt ĐK' : 'Chưa chốt ĐK') + '</span>',
          '<span class="badge ' + (s.MoThuHocPhi ? 'badge-success' : 'badge-secondary') + '">' + (s.MoThuHocPhi ? 'Đang mở thu' : 'Chưa mở thu') + '</span>',
          '<div class="semester-metrics">',
            '<div class="semester-metric"><span class="semester-metric-value">' + escapeHtml(s.SoLopMo || 0) + '</span><span class="semester-metric-label">Lớp mở</span></div>',
            '<div class="semester-metric"><span class="semester-metric-value">' + escapeHtml(s.SoSinhVienDangKy || 0) + '</span><span class="semester-metric-label">SV đăng ký</span></div>',
          '</div>',
        '</div>',
        '<div class="semester-update">',
          '<div class="semester-field"><span class="semester-field-label">Người sửa</span><span class="semester-field-value">' + escapeHtml(s.NguoiCapNhatTen || s.NguoiCapNhat || '-') + '</span></div>',
          '<div class="semester-field"><span class="semester-field-label">Thời điểm sửa</span><span class="semester-field-value">' + escapeHtml(formatSemesterDateTime(s.NgayCapNhat)) + '</span></div>',
        '</div>',
        '<div class="semester-actions" data-no-row-detail="true">',
          '<button class="btn btn-sm btn-outline" type="button" data-action="edit" data-index="' + index + '">Sửa</button>',
          '<button class="btn btn-sm btn-danger" type="button" data-action="delete" data-id="' + escapeHtml(s.MaHocKy || '') + '">Xóa</button>',
        '</div>',
      '</div>'
    ].join('');
  }).join('');
}

function renderSemesterPagination(meta) {
  var nav = document.getElementById('semester-pagination');
  var info = document.getElementById('semester-pagination-info');
  var count = document.getElementById('semester-card-count');
  if (!nav || !info || !count) return;

  var total = Number(meta && meta.total || 0);
  var page = Number(meta && meta.page || 1);
  var limit = Number(meta && meta.limit || 5);
  var totalPages = Number(meta && meta.totalPages || 0);
  var from = total && semesterRecords.length ? ((page - 1) * limit) + 1 : 0;
  var to = from ? from + semesterRecords.length - 1 : 0;

  count.textContent = total ? from + '-' + to + ' / ' + total + ' bản ghi' : '0 bản ghi';
  info.textContent = totalPages > 0 ? 'Trang ' + page + ' / ' + totalPages : '';

  if (totalPages <= 1) {
    nav.innerHTML = '';
    return;
  }

  var start = Math.max(1, page - 2);
  var end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);

  var html = '';
  html += '<button type="button" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>Trước</button>';
  for (var i = start; i <= end; i += 1) {
    html += '<button type="button" data-page="' + i + '" class="' + (i === page ? 'active' : '') + '">' + i + '</button>';
  }
  html += '<button type="button" data-page="' + (page + 1) + '"' + (page >= totalPages ? ' disabled' : '') + '>Sau</button>';
  nav.innerHTML = html;
}

async function loadSemesters(page) {
  var params = buildSemesterQuery(page || 1);
  if (!params) return;

  semesterPage = Number(page || 1);
  setSemesterLoading();

  try {
    var res = await apiFetch('/api/semesters?' + params.toString());
    if (!res.success) {
      showToast(res.message || 'Không thể tải danh sách học kỳ', 'error');
      semesterRecords = [];
      renderSemesterRows([]);
      renderSemesterPagination({ page: 1, limit: Number(params.get('limit') || 5), total: 0, totalPages: 0 });
      return;
    }

    semesterRecords = Array.isArray(res.data) ? res.data : [];
    renderSemesterRows(semesterRecords);
    renderSemesterPagination(res.pagination || { page: semesterPage, limit: Number(params.get('limit') || 5), total: semesterRecords.length, totalPages: 1 });
  } catch (e) {
    showToast('Lỗi kết nối khi tải danh sách học kỳ', 'error');
  }
}

function applySemesterFilters() {
  loadSemesters(1);
}

function debounceSemesterSearch() {
  clearTimeout(semesterSearchTimer);
  semesterSearchTimer = setTimeout(function() {
    loadSemesters(1);
  }, 350);
}

function resetSemesterFilters() {
  var keyword = document.getElementById('semester-keyword');
  var searchScope = document.getElementById('semester-search-scope');
  var dateField = document.getElementById('semester-date-field');
  var dateExact = document.getElementById('semester-date-exact');
  var registrationFinalized = document.getElementById('semester-registration-finalized');
  var tuitionOpen = document.getElementById('semester-tuition-open');

  if (keyword) keyword.value = '';
  if (searchScope) searchScope.value = 'semesterCode';
  if (registrationFinalized) registrationFinalized.value = '';
  if (tuitionOpen) tuitionOpen.value = '';
  if (dateField) dateField.value = 'all';
  if (dateExact) {
    dateExact.value = '';
    dateExact.classList.remove('is-invalid');
  }
  setActiveSegmentValue('semester-kind-filter', '');
  setActiveSegmentValue('semester-status-filter', '');
  loadSemesters(1);
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

function setSingleDateError(inputId, errorId, message) {
  var inputEl = document.getElementById(inputId);
  var errorEl = document.getElementById(errorId);
  if (!inputEl || !errorEl) return;

  inputEl.classList.toggle('is-invalid', Boolean(message));
  errorEl.textContent = message || '';
  errorEl.classList.toggle('active', Boolean(message));
}

function getStrictDateInputError(inputId, label) {
  var inputEl = document.getElementById(inputId);
  if (!inputEl) return '';

  if (inputEl.validity && inputEl.validity.badInput) {
    return label + ' không hợp lệ';
  }

  var value = inputEl.value.trim();
  if (!value) {
    if (inputEl.checkValidity && !inputEl.checkValidity()) return label + ' không hợp lệ';
    return '';
  }

  var match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return label + ' phải đúng định dạng YYYY-MM-DD';

  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  if (year < 1000 || year > 9999 || month < 1 || month > 12) return label + ' không hợp lệ';

  var date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return label + ' không tồn tại trong lịch';
  }

  return '';
}

function validateDatePair(startId, endId, errorId, message, startLabel, endLabel) {
  var startError = getStrictDateInputError(startId, startLabel || 'Ngày bắt đầu');
  var endError = getStrictDateInputError(endId, endLabel || 'Ngày kết thúc');
  if (startError || endError) {
    setDatePairError(startId, endId, errorId, startError || endError);
    return false;
  }

  var start = document.getElementById(startId).value;
  var end = document.getElementById(endId).value;
  if ((start && !end) || (!start && end)) {
    setDatePairError(startId, endId, errorId, 'Cần nhập đủ ' + (startLabel || 'ngày bắt đầu') + ' và ' + (endLabel || 'ngày kết thúc'));
    return false;
  }
  var hasError = Boolean(start && end && start >= end);
  setDatePairError(startId, endId, errorId, hasError ? message : '');
  return !hasError;
}

function getRegistrationDateRangeError() {
  var termStart = document.getElementById('hk-batdau').value;
  var registrationStart = document.getElementById('hk-batdaudk').value;
  var registrationEnd = document.getElementById('hk-ketthucdk').value;

  if ((registrationStart || registrationEnd) && !termStart) {
    return 'Cần nhập ngày bắt đầu học kỳ trước khi nhập thời gian đăng ký';
  }

  if (termStart && registrationStart && registrationStart >= termStart) {
    return 'Ngày bắt đầu đăng ký phải trước ngày bắt đầu học kỳ';
  }

  if (termStart && registrationEnd && registrationEnd >= termStart) {
    return 'Ngày kết thúc đăng ký phải trước ngày bắt đầu học kỳ';
  }

  return '';
}

function getAppealDateRangeError() {
  var termStart = document.getElementById('hk-batdau').value;
  var registrationEnd = document.getElementById('hk-ketthucdk').value;
  var appealStart = document.getElementById('hk-batdaucx').value;
  var appealEnd = document.getElementById('hk-ketthuccx').value;

  if ((appealStart || appealEnd) && !registrationEnd) {
    return 'Cần nhập hạn đăng ký trước khi nhập thời gian cứu xét';
  }
  if (registrationEnd && appealStart && appealStart <= registrationEnd) {
    return 'Thời gian cứu xét phải bắt đầu sau hạn đăng ký';
  }
  if (termStart && appealEnd && appealEnd >= termStart) {
    return 'Hạn cứu xét phải trước ngày bắt đầu học kỳ';
  }
  return '';
}

function getTuitionDueDateRangeError() {
  var termStart = document.getElementById('hk-batdau').value;
  var termEnd = document.getElementById('hk-ketthuc').value;
  var tuitionDue = document.getElementById('hk-hanhocphi').value;

  if (tuitionDue && (!termStart || !termEnd)) {
    return 'Cần nhập ngày bắt đầu và ngày kết thúc học kỳ trước khi nhập hạn đóng học phí';
  }

  if (termStart && termEnd && tuitionDue && (tuitionDue < termStart || tuitionDue > termEnd)) {
    return 'Hạn đóng học phí phải nằm trong khoảng thời gian học kỳ';
  }

  return '';
}

function validateSemesterDates() {
  var termValid = validateDatePair(
    'hk-batdau',
    'hk-ketthuc',
    'hk-term-date-error',
    'Ngày bắt đầu phải trước ngày kết thúc',
    'Ngày bắt đầu học kỳ',
    'Ngày kết thúc học kỳ'
  );
  var registrationValid = validateDatePair(
    'hk-batdaudk',
    'hk-ketthucdk',
    'hk-registration-date-error',
    'Ngày bắt đầu đăng ký phải trước ngày kết thúc đăng ký',
    'Ngày bắt đầu đăng ký',
    'Ngày kết thúc đăng ký'
  );
  var appealValid = validateDatePair(
    'hk-batdaucx',
    'hk-ketthuccx',
    'hk-appeal-date-error',
    'Ngày bắt đầu cứu xét phải trước hoặc bằng ngày kết thúc cứu xét',
    'Ngày bắt đầu cứu xét',
    'Ngày kết thúc cứu xét'
  );
  if (termValid && registrationValid) {
    var rangeError = getRegistrationDateRangeError();
    if (rangeError) {
      setDatePairError('hk-batdaudk', 'hk-ketthucdk', 'hk-registration-date-error', rangeError);
      registrationValid = false;
    }
  }
  if (termValid && registrationValid && appealValid) {
    var appealRangeError = getAppealDateRangeError();
    if (appealRangeError) {
      setDatePairError('hk-batdaucx', 'hk-ketthuccx', 'hk-appeal-date-error', appealRangeError);
      appealValid = false;
    }
  }
  var tuitionDateError = getStrictDateInputError('hk-hanhocphi', 'Hạn đóng học phí');
  var tuitionError = tuitionDateError || (termValid ? getTuitionDueDateRangeError() : '');
  setSingleDateError('hk-hanhocphi', 'hk-tuition-date-error', tuitionError);
  return termValid && registrationValid && appealValid && !tuitionError;
}

function bindSemesterDateValidation() {
  ['hk-batdau', 'hk-ketthuc', 'hk-batdaudk', 'hk-ketthucdk', 'hk-batdaucx', 'hk-ketthuccx', 'hk-hanhocphi'].forEach(function(id) {
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
    document.getElementById('hk-loai').value = getSemesterKindFromRecord(s);
    syncSemesterOrder();
    document.getElementById('hk-batdau').value = asDateInput(s.NgayBatDau);
    document.getElementById('hk-ketthuc').value = asDateInput(s.NgayKetThuc);
    document.getElementById('hk-batdaudk').value = asDateInput(s.NgayBatDauDangKy);
    document.getElementById('hk-ketthucdk').value = asDateInput(s.NgayKetThucDangKy);
    document.getElementById('hk-batdaucx').value = asDateInput(s.NgayBatDauCuuXet);
    document.getElementById('hk-ketthuccx').value = asDateInput(s.NgayKetThucCuuXet);
    document.getElementById('hk-hanhocphi').value = asDateInput(s.HanDongHocPhi);
    document.getElementById('hk-trangthai').value = s.TrangThai || 'Sắp diễn ra';
  } else {
    document.getElementById('semester-form').reset();
    setAcademicYearValue('');
    document.getElementById('hk-loai').value = '1';
    syncSemesterOrder();
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
  var semesterType = getSemesterTypePayload();
  var data = {
    MaHocKy: document.getElementById('hk-ma').value.trim(),
    TenHocKy: document.getElementById('hk-ten').value.trim(),
    MaNamHoc: document.getElementById('hk-manamhoc').value.trim(),
    LoaiHocKy: semesterType.LoaiHocKy,
    ThuTu: semesterType.ThuTu,
    NgayBatDau: document.getElementById('hk-batdau').value || null,
    NgayKetThuc: document.getElementById('hk-ketthuc').value || null,
    NgayBatDauDangKy: document.getElementById('hk-batdaudk').value || null,
    NgayKetThucDangKy: document.getElementById('hk-ketthucdk').value || null,
    NgayBatDauCuuXet: document.getElementById('hk-batdaucx').value || null,
    NgayKetThucCuuXet: document.getElementById('hk-ketthuccx').value || null,
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
      ? await apiFetch('/api/semesters/' + encodeURIComponent(editingId), { method: 'PUT', body: data })
      : await apiFetch('/api/semesters', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cập nhật học kỳ thành công' : 'Thêm học kỳ thành công', 'success');
      closeModal();
      loadSemesters(editingId ? semesterPage : 1);
    } else {
      showToast(res.message || 'Không thể lưu học kỳ', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteSemester(id) {
  if (!confirm('Bạn có chắc muốn xóa học kỳ này?')) return;
  try {
    var res = await apiFetch('/api/semesters/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa học kỳ', 'success');
      loadSemesters(semesterPage);
    } else {
      showToast(res.message || 'Không thể xóa học kỳ', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function bindSemesterFilters() {
  var keyword = document.getElementById('semester-keyword');
  var searchScope = document.getElementById('semester-search-scope');
  var dateField = document.getElementById('semester-date-field');
  var dateExact = document.getElementById('semester-date-exact');
  var registrationFinalized = document.getElementById('semester-registration-finalized');
  var tuitionOpen = document.getElementById('semester-tuition-open');
  var reset = document.getElementById('semester-filter-reset');
  var pagination = document.getElementById('semester-pagination');
  var listBody = document.getElementById('semester-list-body');

  if (keyword) keyword.addEventListener('input', debounceSemesterSearch);
  [searchScope, registrationFinalized, tuitionOpen, dateField, dateExact].forEach(function(input) {
    if (!input) return;
    input.addEventListener('change', function() { loadSemesters(1); });
  });
  if (reset) reset.addEventListener('click', resetSemesterFilters);

  ['semester-kind-filter', 'semester-status-filter'].forEach(function(groupId) {
    var group = document.getElementById(groupId);
    if (!group) return;
    group.addEventListener('click', function(event) {
      var button = event.target.closest('.segmented-option');
      if (!button) return;
      setActiveSegmentValue(groupId, button.dataset.value || '');
      loadSemesters(1);
    });
  });

  if (pagination) {
    pagination.addEventListener('click', function(event) {
      var button = event.target.closest('button[data-page]');
      if (!button || button.disabled) return;
      var nextPage = parseInt(button.dataset.page, 10);
      if (Number.isFinite(nextPage) && nextPage > 0) loadSemesters(nextPage);
    });
  }

  if (listBody) {
    listBody.addEventListener('click', function(event) {
      var button = event.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'edit') {
        var index = parseInt(button.dataset.index, 10);
        if (semesterRecords[index]) openModal('edit', semesterRecords[index]);
      } else if (button.dataset.action === 'delete') {
        deleteSemester(button.dataset.id);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadAcademicYears();
  bindSemesterFilters();
  initSemesterRowDetails();
  bindSemesterDateValidation();
  loadSemesters(1);
  ['hk-ma', 'hk-ten', 'hk-loai'].forEach(function(id) {
    var input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', syncSemesterOrder);
    input.addEventListener('input', syncSemesterOrder);
  });
});
