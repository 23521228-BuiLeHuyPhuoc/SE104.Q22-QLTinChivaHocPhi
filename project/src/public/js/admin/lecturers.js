var lecturerEditingId = null;
var lecturerSearchTimer = null;
var activeLecturerClassesId = null;
var lecturerSearchCriterionReady = false;

function lecturerValue(id) {
  var element = document.getElementById(id);
  return element ? element.value : '';
}

function lecturerText(id) {
  return lecturerValue(id).trim();
}

function selectedLecturerSemester() {
  return lecturerValue('filter-semester') || lecturerValue('lecturer-hocky') || lecturerValue('lecturer-classes-semester') || '';
}

function setLecturerSelectValue(id, value, fallback) {
  var select = document.getElementById(id);
  if (!select) return;
  var target = value || fallback || '';
  var exists = Array.prototype.some.call(select.options, function(option) { return option.value === String(target); });
  if (exists) select.value = target;
  else if (fallback !== undefined) select.value = fallback || '';
}

function setLecturerReadonly(id, readonly) {
  var field = document.getElementById(id);
  if (!field) return;
  field.readOnly = !!readonly;
  field.toggleAttribute('data-ui-readonly', !!readonly);
  field.classList.toggle('ui-readonly-field', !!readonly);
  if (!readonly) field.removeAttribute('title');
}

function getLecturerSearchField() {
  var criterion = document.getElementById('lecturer-search-field') || document.querySelector('.ui-search-criterion-select');
  var input = document.getElementById('search-input');
  return (criterion && criterion.value) || (input && input.dataset.searchField) || 'all';
}

function applyLecturerFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input');
  var semester = document.getElementById('filter-semester');
  var faculty = document.getElementById('filter-faculty');
  var status = document.getElementById('filter-status');

  params.set('page', '1');
  if (search && search.value.trim()) params.set('search', search.value.trim());
  params.set('searchField', getLecturerSearchField());
  if (semester && semester.value) params.set('MaHocKy', semester.value);
  if (faculty && faculty.value) params.set('MaKhoa', faculty.value);
  if (status && status.value) params.set('status', status.value);
  navigatePageContent('/admin/lecturers?' + params.toString());
}

function debounceLecturerSearch() {
  clearTimeout(lecturerSearchTimer);
  lecturerSearchTimer = setTimeout(applyLecturerFilters, 400);
}

function escapeLecturerHtml(value) {
  return String(value === undefined || value === null || value === '' ? '-' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatLecturerDate(value) {
  if (!value) return '-';
  var date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('vi-VN');
}

function normalizeLegacyTitle(lecturer) {
  var title = String(lecturer.HocHamHocVi || '');
  var rank = lecturer.HocHam || '';
  var degree = lecturer.HocVi || '';
  if (!rank) {
    if (title.indexOf('PGS') >= 0) rank = 'PGS';
    else if (title.indexOf('GS') >= 0) rank = 'GS';
  }
  if (!degree) {
    if (title.indexOf('ThS') >= 0) degree = 'ThS';
    else if (title.indexOf('TS') >= 0) degree = 'TS';
    else if (title.indexOf('KS') >= 0) degree = 'KS';
    else if (title.indexOf('CN') >= 0) degree = 'CN';
  }
  return { HocHam: rank, HocVi: degree };
}

function buildLecturerTitle(rank, degree) {
  return [rank, degree].filter(Boolean).join('.') || '-';
}

function isValidLecturerEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function openLecturerModal(mode, lecturer) {
  var isEdit = mode === 'edit';
  lecturerEditingId = null;
  document.getElementById('lecturer-modal-title').textContent = isEdit ? 'Sửa giảng viên' : 'Thêm giảng viên';
  setLecturerReadonly('lecturer-ma', isEdit);

  if (isEdit && lecturer) {
    var titles = normalizeLegacyTitle(lecturer);
    lecturerEditingId = lecturer.MaGiangVien;
    setLecturerSelectValue('lecturer-hocky', lecturer.MaHocKy, selectedLecturerSemester());
    document.getElementById('lecturer-ma').value = lecturer.MaGiangVien || '';
    document.getElementById('lecturer-hoten').value = lecturer.HoTen || '';
    setLecturerSelectValue('lecturer-hocham', titles.HocHam, '');
    setLecturerSelectValue('lecturer-hocvi', titles.HocVi, '');
    document.getElementById('lecturer-khoa').value = lecturer.MaKhoa || '';
    document.getElementById('lecturer-email').value = lecturer.Email || '';
    document.getElementById('lecturer-sdt').value = lecturer.Sdt || '';
    document.getElementById('lecturer-trangthai').value = lecturer.TrangThai === false ? 'false' : 'true';
    document.getElementById('lecturer-mota').value = lecturer.MoTa || '';
  } else {
    document.getElementById('lecturer-form').reset();
    setLecturerSelectValue('lecturer-hocky', selectedLecturerSemester(), '');
    document.getElementById('lecturer-trangthai').value = 'true';
  }

  var modal = document.getElementById('lecturer-modal');
  if (window.AdminUI) {
    AdminUI.markReadonlyFields(modal);
    AdminUI.initReadonlyNotices(modal);
  }
  modal.classList.add('active');
}

function closeLecturerModal() {
  document.getElementById('lecturer-modal').classList.remove('active');
}

async function saveLecturer() {
  var data = {
    MaHocKy: lecturerValue('lecturer-hocky'),
    MaGiangVien: lecturerText('lecturer-ma'),
    HoTen: lecturerText('lecturer-hoten'),
    HocHam: lecturerValue('lecturer-hocham') || null,
    HocVi: lecturerValue('lecturer-hocvi') || null,
    MaKhoa: lecturerValue('lecturer-khoa') || null,
    Email: lecturerText('lecturer-email'),
    Sdt: lecturerText('lecturer-sdt') || null,
    TrangThai: lecturerValue('lecturer-trangthai') === 'true',
    MoTa: lecturerText('lecturer-mota') || null
  };

  if (!data.MaHocKy) {
    showToast('Vui lòng chọn học kỳ áp dụng', 'error');
    return;
  }
  if (!data.MaGiangVien || !data.HoTen) {
    showToast('Vui lòng nhập mã giảng viên và họ tên', 'error');
    return;
  }
  if (!isValidLecturerEmail(data.Email)) {
    showToast('Email giảng viên không được thiếu và phải hợp lệ', 'error');
    return;
  }

  try {
    var res = lecturerEditingId
      ? await apiFetch('/api/lecturers/' + encodeURIComponent(lecturerEditingId), { method: 'PUT', body: data })
      : await apiFetch('/api/lecturers', { method: 'POST', body: data });

    if (res.success) {
      showToast(res.message || 'Đã lưu giảng viên', 'success');
      closeLecturerModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu giảng viên', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteLecturer(id) {
  if (!confirm('Bạn có chắc muốn xóa giảng viên này?')) return;
  try {
    var res = await apiFetch('/api/lecturers/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Đã xóa giảng viên', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa giảng viên', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function setLecturerClassesState(message) {
  var body = document.getElementById('lecturer-classes-body');
  if (!body) return;
  body.innerHTML = '<tr><td colspan="5"><div class="empty-state">' + escapeLecturerHtml(message) + '</div></td></tr>';
}

function renderLecturerClasses(rows) {
  var body = document.getElementById('lecturer-classes-body');
  if (!body) return;
  if (!rows || !rows.length) {
    setLecturerClassesState('Không có lớp trong học kỳ này');
    return;
  }
  body.innerHTML = rows.map(function(row) {
    var course = [row.MaMonHoc, row.TenMonHoc].filter(Boolean).join(' - ');
    return '<tr>' +
      '<td class="mono">' + escapeLecturerHtml(row.MaLop) + '</td>' +
      '<td>' + escapeLecturerHtml(course || row.TenLop) + '</td>' +
      '<td>' + escapeLecturerHtml(row.PhongHocDisplay) + '</td>' +
      '<td>' + escapeLecturerHtml(row.LichHocDisplay) + '</td>' +
      '<td>' + escapeLecturerHtml(row.SoLuongDaDangKy || 0) + '</td>' +
      '</tr>';
  }).join('');
}

async function loadLecturerClasses(lecturerId, semesterId) {
  if (!lecturerId) return;
  setLecturerClassesState('Đang tải dữ liệu...');
  try {
    var params = new URLSearchParams();
    if (semesterId) params.set('MaHocKy', semesterId);
    var res = await apiFetch('/api/lecturers/' + encodeURIComponent(lecturerId) + '/classes?' + params.toString());
    if (!res.success) {
      setLecturerClassesState(res.message || 'Không thể tải danh sách lớp');
      return;
    }
    renderLecturerClasses(res.data || []);
  } catch (e) {
    setLecturerClassesState('Lỗi kết nối');
  }
}

function openLecturerClasses(lecturerId) {
  activeLecturerClassesId = lecturerId;
  document.getElementById('lecturer-classes-title').textContent = 'Lớp giảng dạy của ' + lecturerId;
  setLecturerSelectValue('lecturer-classes-semester', selectedLecturerSemester(), '');
  document.getElementById('lecturer-classes-modal').classList.add('active');
  loadLecturerClasses(activeLecturerClassesId, lecturerValue('lecturer-classes-semester'));
}

function reloadLecturerClasses() {
  loadLecturerClasses(activeLecturerClassesId, lecturerValue('lecturer-classes-semester'));
}

function closeLecturerClassesModal() {
  document.getElementById('lecturer-classes-modal').classList.remove('active');
  activeLecturerClassesId = null;
}

function buildLecturerDetail(record) {
  return {
    title: 'Chi tiết giảng viên ' + (record.MaGiangVien || ''),
    data: record,
    rows: [
      { label: 'Mã giảng viên', value: record.MaGiangVien },
      { label: 'Họ tên', value: record.HoTen },
      { label: 'Học hàm', value: record.HocHam },
      { label: 'Học vị', value: record.HocVi },
      { label: 'Học hàm/học vị', value: buildLecturerTitle(record.HocHam, record.HocVi) },
      { label: 'Học kỳ', value: record.HocKyLabel || record.MaHocKy },
      { label: 'Khoa', value: record.KHOA ? record.KHOA.TenKhoa : record.MaKhoa },
      { label: 'Email', value: record.Email },
      { label: 'Số điện thoại', value: record.Sdt },
      { label: 'Lớp dạy', value: (record.ClassCount || 0) + ' lớp' },
      { label: 'Trạng thái', value: record.TrangThai === false ? 'Tạm khóa' : 'Đang dạy' },
      { label: 'Mô tả', value: record.MoTa },
      { label: 'Sửa bởi', value: record.NguoiCapNhatTen || record.NguoiCapNhat },
      { label: 'Sửa lúc', value: formatLecturerDate(record.NgayCapNhat) }
    ]
  };
}

function initLecturerPage() {
  if (window.AdminUI && !lecturerSearchCriterionReady) {
    lecturerSearchCriterionReady = true;
    var input = document.getElementById('search-input');
    var criterion = AdminUI.createSearchCriterionControl({
      input: input,
      id: 'lecturer-search-field',
      value: input ? input.dataset.searchField : 'all',
      options: [
        { value: 'all', label: 'Tất cả' },
        { value: 'MaGiangVien', label: 'Mã GV' },
        { value: 'HoTen', label: 'Họ tên' },
        { value: 'Khoa', label: 'Khoa' },
        { value: 'Email', label: 'Email' },
        { value: 'MaHocKy', label: 'Học kỳ' }
      ]
    });
    if (criterion) criterion.addEventListener('change', applyLecturerFilters);
    AdminUI.initReadonlyNotices(document);
    AdminUI.attachRowDetailHandlers({ table: '#lecturers-table', buildDetail: buildLecturerDetail });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLecturerPage);
else initLecturerPage();
