var searchTimer;
var curriculumTimer;
var editMode = false;
var editId = null;
var editingCurriculumId = null;

function escapeMajorHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAdminDateTime(value) {
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

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var s = document.getElementById('search-input').value.trim();
  var k = document.getElementById('filter-khoa').value;
  var searchField = document.getElementById('major-search-field').value;
  var params = new URLSearchParams({ page: '1' });
  if (s) params.set('search', s);
  if (searchField && searchField !== 'all') params.set('searchField', searchField);
  if (k) params.set('MaKhoa', k);
  navigatePageContent('/admin/majors?' + params.toString());
}

function setMajorCodeReadonly(isReadonly) {
  var input = document.getElementById('maj-ma');
  input.readOnly = isReadonly;
  input.classList.toggle('ui-readonly-field', isReadonly);
  if (window.AdminUI) AdminUI.markReadonlyFields(document.getElementById('major-form'));
}

function openModal(mode, data) {
  editMode = mode === 'edit';
  editId = editMode ? data.MaNganh : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa ngành' : 'Thêm ngành';
  document.getElementById('maj-ma').value = editMode ? data.MaNganh : '';
  setMajorCodeReadonly(editMode);
  document.getElementById('maj-ten').value = editMode ? data.TenNganh : '';
  document.getElementById('maj-khoa').value = editMode ? data.MaKhoa : '';
  document.getElementById('maj-tinchi').value = editMode ? (data.SoTinChiToiThieu || 120) : 120;
  document.getElementById('maj-thoigian').value = editMode ? (data.ThoiGianDaoTao || 4) : 4;
  document.getElementById('maj-mota').value = editMode ? (data.MoTa || '') : '';
  document.getElementById('major-modal').classList.add('active');
}

function closeModal() { document.getElementById('major-modal').classList.remove('active'); }

async function saveMajor() {
  var body = {
    MaNganh: document.getElementById('maj-ma').value.trim(),
    TenNganh: document.getElementById('maj-ten').value.trim(),
    MaKhoa: document.getElementById('maj-khoa').value,
    SoTinChiToiThieu: document.getElementById('maj-tinchi').value,
    ThoiGianDaoTao: document.getElementById('maj-thoigian').value,
    MoTa: document.getElementById('maj-mota').value.trim()
  };
  if (!body.MaNganh || !body.TenNganh || !body.MaKhoa) { showToast('Vui lòng nhập đầy đủ thông tin', 'error'); return; }
  if (!Number.isInteger(Number(body.SoTinChiToiThieu)) || Number(body.SoTinChiToiThieu) <= 0) { showToast('Số tín chỉ tối thiểu phải là số nguyên dương', 'error'); return; }
  if (!Number.isFinite(Number(body.ThoiGianDaoTao)) || Number(body.ThoiGianDaoTao) <= 0) { showToast('Thời gian đào tạo phải lớn hơn 0', 'error'); return; }
  var url = editMode ? '/api/majors/' + editId : '/api/majors';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}

async function deleteMajor(id) {
  if (!confirm('Xóa ngành "' + id + '"?')) return;
  var res = await apiFetch('/api/majors/' + id, { method: 'DELETE' });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}

function selectCurriculumMajor(id, name) {
  var select = document.getElementById('curriculum-major');
  if (!select) return;
  if (!Array.prototype.some.call(select.options, function(option) { return option.value === id; })) {
    select.add(new Option(id + (name ? ' - ' + name : ''), id, true, true));
  }
  select.value = id;
  var title = document.getElementById('curriculum-title');
  if (title) title.textContent = 'Chương trình đào tạo' + (name ? ' - ' + name : '');
  loadCurriculum();
  var card = select.closest('.card');
  if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function debounceCurriculumSearch() {
  clearTimeout(curriculumTimer);
  curriculumTimer = setTimeout(loadCurriculum, 350);
}

async function loadCurriculum() {
  var tbody = document.getElementById('curriculum-list');
  var major = document.getElementById('curriculum-major').value;
  if (!major) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state">Chọn ngành để quản lý chương trình</div></td></tr>';
    return;
  }
  var params = new URLSearchParams();
  params.set('MaNganh', major);
  [['HocKyDuKien', 'curriculum-semester'], ['LoaiMon', 'curriculum-type'], ['valid', 'curriculum-valid'], ['search', 'curriculum-search']].forEach(function(pair) {
    var el = document.getElementById(pair[1]);
    if (el && el.value) params.set(pair[0], el.value);
  });
  tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state">Đang tải...</div></td></tr>';
  var res = await apiFetch('/api/majors/curriculum/items?' + params.toString());
  var rows = res.data || [];
  tbody.innerHTML = rows.map(function(row) {
    var conds = (row.conditions || []).map(function(c) { return c.MaMonDieuKien + ' (' + c.LoaiDieuKien + ')'; }).join(', ') || '-';
    var errors = (row.violations || []).map(function(v) { return v.MaMonDieuKien + ': ' + v.message; }).join('; ');
    var record = escapeMajorHtml(JSON.stringify(row));
    return '<tr class="' + (row.isValid ? '' : 'row-error') + '">' +
      '<td class="mono">' + escapeMajorHtml(row.MaMonHoc) + '</td>' +
      '<td><strong>' + escapeMajorHtml(row.TenMonHoc) + '</strong>' + (errors ? '<small class="text-error">' + escapeMajorHtml(errors) + '</small>' : '') + '</td>' +
      '<td>' + escapeMajorHtml(row.LoaiMon || '-') + '</td>' +
      '<td>' + Number(row.SoTinChi || 0) + '</td>' +
      '<td>' + Number(row.HocKyDuKien || 1) + '</td>' +
      '<td><span class="badge ' + (row.BatBuoc ? 'badge-primary' : 'badge-secondary') + '">' + (row.BatBuoc ? 'Bắt buộc' : 'Tự chọn') + '</span></td>' +
      '<td>' + escapeMajorHtml(conds) + '</td>' +
      '<td><span class="badge ' + (row.isValid ? 'badge-success' : 'badge-error') + '">' + (row.isValid ? 'Hợp lệ' : 'Có lỗi') + '</span></td>' +
      '<td class="table-actions"><button class="btn btn-sm btn-outline" type="button" data-record="' + record + '" onclick="openCurriculumModal(\'edit\', JSON.parse(this.dataset.record))">Sửa</button><button class="btn btn-sm btn-danger" type="button" onclick="deleteCurriculumItem(' + row.id + ')">Gỡ</button></td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="9"><div class="empty-state">Chưa có môn trong chương trình</div></td></tr>';
}

async function loadCourseOptions(search) {
  var list = document.getElementById('ctdt-course-options');
  var params = new URLSearchParams({ all: 'true', searchField: 'all', TrangThai: 'true' });
  if (search && search.trim()) params.set('search', search.trim());
  var res = await apiFetch('/api/courses?' + params.toString());
  list.innerHTML = (res.data || []).map(function(c) {
    return '<option value="' + escapeMajorHtml(c.MaMonHoc) + '">' + escapeMajorHtml(c.TenMonHoc || '') + '</option>';
  }).join('');
}

function openCurriculumModal(mode, row) {
  editingCurriculumId = mode === 'edit' && row ? row.id : null;
  document.getElementById('curriculum-modal-title').textContent = editingCurriculumId ? 'Sửa môn trong chương trình' : 'Thêm môn vào chương trình';
  document.getElementById('ctdt-major').value = row ? row.MaNganh : (document.getElementById('curriculum-major').value || '');
  document.getElementById('ctdt-course').value = row ? row.MaMonHoc : '';
  document.getElementById('ctdt-course').disabled = !!editingCurriculumId;
  document.getElementById('ctdt-semester').value = row ? row.HocKyDuKien : 1;
  document.getElementById('ctdt-required').value = row && row.BatBuoc === false ? 'false' : 'true';
  document.getElementById('ctdt-active').value = row && row.TrangThai === false ? 'false' : 'true';
  document.getElementById('ctdt-note').value = row ? (row.GhiChu || '') : '';
  loadCourseOptions('');
  document.getElementById('curriculum-modal').classList.add('active');
}

function closeCurriculumModal() {
  document.getElementById('curriculum-modal').classList.remove('active');
}

async function saveCurriculumItem() {
  var body = {
    MaNganh: document.getElementById('ctdt-major').value,
    MaMonHoc: document.getElementById('ctdt-course').value.trim(),
    HocKyDuKien: document.getElementById('ctdt-semester').value,
    BatBuoc: document.getElementById('ctdt-required').value === 'true',
    TrangThai: document.getElementById('ctdt-active').value === 'true',
    GhiChu: document.getElementById('ctdt-note').value.trim()
  };
  var url = editingCurriculumId ? '/api/majors/curriculum/items/' + editingCurriculumId : '/api/majors/curriculum/items';
  var res = await apiFetch(url, { method: editingCurriculumId ? 'PUT' : 'POST', body: body });
  if (res.success) {
    showToast(res.message || 'Đã lưu chương trình', 'success');
    closeCurriculumModal();
    document.getElementById('curriculum-major').value = body.MaNganh;
    loadCurriculum();
  } else {
    showToast(res.message || 'Không thể lưu chương trình', 'error');
  }
}

async function deleteCurriculumItem(id) {
  if (!confirm('Gỡ môn này khỏi chương trình?')) return;
  var res = await apiFetch('/api/majors/curriculum/items/' + id, { method: 'DELETE' });
  if (res.success) {
    showToast(res.message || 'Đã gỡ môn', 'success');
    loadCurriculum();
  } else {
    showToast(res.message || 'Không thể gỡ môn', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var courseInput = document.getElementById('ctdt-course');
  if (courseInput) {
    var scheduleCourseOptionsLoad = function() {
      clearTimeout(curriculumTimer);
      curriculumTimer = setTimeout(function() { loadCourseOptions(courseInput.value); }, 250);
    };
    courseInput.addEventListener('input', scheduleCourseOptionsLoad);
    courseInput.addEventListener('keydown', function(event) {
      runSearchOnEnter(event, scheduleCourseOptionsLoad);
    });
  }

  if (window.AdminUI) {
    AdminUI.attachRowDetailHandlers({
      rowSelector: 'tbody tr[data-record]',
      title: 'Chi tiết ngành học',
      buildDetail: function(record) {
        return {
          title: 'Chi tiết ngành ' + (record.MaNganh || ''),
          rows: [
            { label: 'Mã ngành', value: record.MaNganh },
            { label: 'Tên ngành', value: record.TenNganh },
            { label: 'Khoa', value: record.KHOA ? record.KHOA.TenKhoa : record.MaKhoa },
            { label: 'Số tín chỉ tối thiểu', value: record.SoTinChiToiThieu || 120 },
            { label: 'Thời gian đào tạo', value: record.ThoiGianDaoTao ? record.ThoiGianDaoTao + ' năm' : '4 năm' },
            { label: 'Số sinh viên', value: record._count ? record._count.SINHVIEN : 0 },
            { label: 'Mô tả', value: record.MoTa },
            { label: 'Sửa bởi', value: record.NguoiCapNhatTen || record.NguoiCapNhat || '-' },
            { label: 'Sửa lúc', value: formatAdminDateTime(record.NgayCapNhat) }
          ]
        };
      }
    });
  }
});
