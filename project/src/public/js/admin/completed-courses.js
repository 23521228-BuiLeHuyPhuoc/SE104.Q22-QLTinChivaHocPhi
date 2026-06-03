var searchTimer;
var editMode = false;
var editId = null;
var importRows = [];
var importPreviewValid = false;

function completedEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resultLabel(value) {
  return value === 'qua_mon' ? 'Qua môn' : 'Rớt';
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var params = new URLSearchParams();
  params.set('page', '1');
  [['search', 'search-input'], ['searchField', 'search-field'], ['MaHocKy', 'filter-hocky'], ['KetQua', 'filter-result']].forEach(function(pair) {
    var el = document.getElementById(pair[1]);
    if (el && el.value) params.set(pair[0], el.value);
  });
  window.location.href = '/admin/completed-courses?' + params.toString();
}

function notifyCompletedLockedField() {
  showToast('Khong duoc phep sua MSSV, mon hoc, hoc ky hoac lan hoc. Hay xoa va them lai neu nhap sai.', 'error');
}

function setCompletedLockedFields(locked) {
  ['cc-masv', 'cc-mamonhoc', 'cc-mahocky', 'cc-lanhoc'].forEach(function(id) {
    var field = document.getElementById(id);
    if (!field) return;
    field.dataset.locked = locked ? 'true' : 'false';
    field.readOnly = !!locked && field.tagName !== 'SELECT';
    field.classList.toggle('is-locked', !!locked);
  });
}

function openModal(mode, data) {
  editMode = mode === 'edit';
  editId = editMode ? data.id : null;
  setCompletedLockedFields(editMode);
  document.getElementById('modal-title').textContent = editMode ? 'Sửa môn đã học' : 'Thêm môn đã học';
  document.getElementById('cc-masv').value = editMode ? (data.MaSv || (data.SINHVIEN ? data.SINHVIEN.MaSv : '')) : '';
  document.getElementById('cc-mamonhoc').value = editMode ? (data.MaMonHoc || (data.MONHOC ? data.MONHOC.MaMonHoc : '')) : '';
  document.getElementById('cc-mahocky').value = editMode ? (data.MaHocKy || (data.HOCKY ? data.HOCKY.MaHocKy : '')) : '';
  document.getElementById('cc-malop').value = editMode ? (data.MaLop || '') : '';
  document.getElementById('cc-lanhoc').value = editMode ? (data.LanHoc || 1) : 1;
  document.getElementById('cc-ketqua').value = editMode ? (data.KetQua || 'qua_mon') : 'qua_mon';
  document.getElementById('cc-ghichu').value = editMode ? (data.GhiChu || '') : '';
  document.getElementById('completed-course-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('completed-course-modal').classList.remove('active');
}

function closeCompletedCourseDetail() {
  var modal = document.getElementById('completed-course-detail-modal');
  if (modal) modal.classList.remove('active');
}

function renderCompletedCourseDetail(maSv, rows) {
  var content = document.getElementById('completed-course-detail-content');
  if (!content) return;
  var passedCourses = {};
  var passedCount = 0;
  var failedCount = 0;
  rows.forEach(function(row) {
    if (row.KetQua === 'qua_mon') {
      passedCount += 1;
      passedCourses[row.MaMonHoc] = Number(row.MONHOC && row.MONHOC.SoTinChi || 0);
    } else if (row.KetQua === 'rot') {
      failedCount += 1;
    }
  });
  var passedCredits = Object.keys(passedCourses).reduce(function(sum, key) { return sum + Number(passedCourses[key] || 0); }, 0);
  var studentName = rows[0] && rows[0].SINHVIEN ? rows[0].SINHVIEN.HoTen : '-';
  var courseRows = rows.map(function(c) {
    var course = c.MONHOC || {};
    var semester = c.HOCKY ? c.HOCKY.TenHocKy + (c.HOCKY.NAMHOC && c.HOCKY.NAMHOC.TenNamHoc ? ' - ' + c.HOCKY.NAMHOC.TenNamHoc : '') : c.MaHocKy;
    var updater = c.TAIKHOAN ? (c.TAIKHOAN.HoTen || c.TAIKHOAN.TenDangNhap) : '-';
    var record = completedEscapeHtml(JSON.stringify(c));
    return '<tr>' +
      '<td class="mono">' + completedEscapeHtml(c.MaMonHoc || '-') + '</td>' +
      '<td>' + completedEscapeHtml(course.TenMonHoc || '-') + '<small>' + completedEscapeHtml((course.KHOA && course.KHOA.TenKhoa) || '') + '</small></td>' +
      '<td>' + completedEscapeHtml(course.LoaiMon || '-') + '</td>' +
      '<td>' + Number(course.SoTinChi || 0) + '</td>' +
      '<td>' + completedEscapeHtml(c.MaLop || '-') + '</td>' +
      '<td>' + completedEscapeHtml(semester || '-') + '</td>' +
      '<td><span class="badge ' + (c.KetQua === 'qua_mon' ? 'badge-success' : 'badge-error') + '">' + resultLabel(c.KetQua) + '</span></td>' +
      '<td>' + completedEscapeHtml(updater) + '</td>' +
      '<td class="table-actions"><button class="btn btn-sm btn-outline" type="button" data-record="' + record + '" onclick="closeCompletedCourseDetail(); openModal(\'edit\', JSON.parse(this.dataset.record))">Sửa</button><button class="btn btn-sm btn-danger" type="button" onclick="deleteCompletedCourse(' + c.id + ')">Xóa</button></td>' +
    '</tr>';
  }).join('');

  content.innerHTML =
    '<div class="detail-grid"><div><strong>MSSV</strong><span>' + completedEscapeHtml(maSv) + '</span></div><div><strong>Họ tên</strong><span>' + completedEscapeHtml(studentName) + '</span></div><div><strong>Số lượt học</strong><span>' + rows.length + '</span></div><div><strong>Qua môn</strong><span>' + passedCount + '</span></div><div><strong>Rớt</strong><span>' + failedCount + '</span></div><div><strong>Tín chỉ tích lũy</strong><span>' + passedCredits + '</span></div></div>' +
    '<div class="table-container mt-3"><table class="data-table"><thead><tr><th>Mã môn</th><th>Tên môn</th><th>Loại</th><th>TC</th><th>Lớp</th><th>Học kỳ</th><th>Kết quả</th><th>Sửa bởi</th><th>Thao tác</th></tr></thead><tbody>' + (courseRows || '<tr><td colspan="9"><div class="empty-state">Sinh viên chưa có môn đã học</div></td></tr>') + '</tbody></table></div>';
}

async function openCompletedCourseDetail(maSv) {
  var modal = document.getElementById('completed-course-detail-modal');
  var content = document.getElementById('completed-course-detail-content');
  if (!modal || !content) return;
  modal.classList.add('active');
  content.textContent = 'Đang tải...';
  try {
    var res = await apiFetch('/api/completed-courses?MaSv=' + encodeURIComponent(maSv) + '&all=true');
    if (!res || res.success === false) throw new Error((res && res.message) || 'Không tải được môn đã học');
    renderCompletedCourseDetail(maSv, res.data || []);
  } catch (error) {
    content.textContent = error.message || 'Không tải được môn đã học';
  }
}

async function saveCompletedCourse() {
  var body = {
    MaSv: document.getElementById('cc-masv').value.trim(),
    MaMonHoc: document.getElementById('cc-mamonhoc').value.trim(),
    MaHocKy: document.getElementById('cc-mahocky').value,
    MaLop: document.getElementById('cc-malop').value.trim() || null,
    LanHoc: document.getElementById('cc-lanhoc').value || 1,
    KetQua: document.getElementById('cc-ketqua').value,
    GhiChu: document.getElementById('cc-ghichu').value.trim()
  };
  if (editMode) {
    body = {
      MaLop: document.getElementById('cc-malop').value.trim() || null,
      KetQua: document.getElementById('cc-ketqua').value,
      GhiChu: document.getElementById('cc-ghichu').value.trim()
    };
  }
  var attemptNumber = Number(body.LanHoc);
  if (!editMode && (!Number.isInteger(attemptNumber) || attemptNumber <= 0)) {
    showToast('Lan hoc phai la so nguyen duong', 'error');
    return;
  }
  if ((!editMode && (!body.MaSv || !body.MaMonHoc || !body.MaHocKy)) || !body.KetQua) {
    showToast('Vui lòng nhập MSSV, mã môn, học kỳ và kết quả', 'error');
    return;
  }
  var url = editMode ? '/api/completed-courses/' + editId : '/api/completed-courses';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

async function deleteCompletedCourse(id) {
  if (!confirm('Xóa môn đã học này?')) return;
  var res = await apiFetch('/api/completed-courses/' + id, { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

function renderImportResult(rows, errors) {
  var errorMap = {};
  (errors || []).forEach(function(error) {
    errorMap[error.index] = error.message || 'Dong khong hop le';
  });
  document.getElementById('import-preview').innerHTML = (rows || []).map(function(row, index) {
    var failed = Boolean(errorMap[index]);
    return '<tr class="' + (failed ? 'import-row-failed' : 'import-row-success') + '">' +
      '<td>' + completedEscapeHtml(row.MaSv || row.MSSV || '') + '</td>' +
      '<td>' + completedEscapeHtml(row.MaMonHoc || '') + '</td>' +
      '<td>' + completedEscapeHtml(row.MaHocKy || row.HocKy || row.Hocky || '') + '</td>' +
      '<td>' + completedEscapeHtml(row.KetQua || '') + '</td>' +
      '<td>' + completedEscapeHtml(failed ? errorMap[index] : 'Hop le') + '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="5"><div class="empty-state">File khong co du lieu</div></td></tr>';
}

async function uploadCompletedImportFile(previewOnly) {
  var input = document.getElementById('import-file');
  var selected = input && input.files ? input.files[0] : null;
  if (!selected) {
    showToast('Chua chon file import', 'error');
    return null;
  }
  var form = new FormData();
  form.append('file', selected);
  form.append('preview', previewOnly ? 'true' : 'false');
  return await apiFetch('/api/completed-courses/import', { method: 'POST', body: form });
}

function openImportModal() {
  importRows = [];
  importPreviewValid = false;
  var file = document.getElementById('import-file');
  if (file) file.value = '';
  document.getElementById('import-preview').innerHTML = '<tr><td colspan="5"><div class="empty-state">Chon file Excel/CSV de kiem tra truoc khi import</div></td></tr>';
  document.getElementById('import-modal').classList.add('active');
}

async function confirmImport() {
  if (!importRows.length || !importPreviewValid) {
    showToast('Chua co du lieu hop le de import', 'error');
    return;
  }
  var res = await uploadCompletedImportFile(false);
  if (res && res.success) {
    renderImportResult(res.data || importRows, []);
    showToast(res.message || 'Import thanh cong', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    renderImportResult(importRows, (res && res.errors) || [{ index: 0, message: (res && res.message) || 'Import that bai' }]);
    showToast((res && res.message) || 'Import that bai', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var file = document.getElementById('import-file');
  if (file) {
    file.addEventListener('change', async function() {
      if (!file.files[0]) return;
      document.getElementById('import-preview').innerHTML = '<tr><td colspan="5"><div class="empty-state">Dang kiem tra file...</div></td></tr>';
      var preview = await uploadCompletedImportFile(true);
      importRows = preview && Array.isArray(preview.data) ? preview.data : [];
      importPreviewValid = Boolean(preview && preview.success);
      renderImportResult(importRows, preview ? preview.errors : [{ index: 0, message: 'Khong doc duoc file' }]);
    });
  }

  ['cc-masv', 'cc-mamonhoc', 'cc-mahocky', 'cc-lanhoc'].forEach(function(id) {
    var field = document.getElementById(id);
    if (!field) return;
    ['focus', 'mousedown', 'keydown'].forEach(function(eventName) {
      field.addEventListener(eventName, function(event) {
        if (field.dataset.locked === 'true') {
          if (eventName !== 'focus') event.preventDefault();
          notifyCompletedLockedField();
        }
      });
    });
  });
});
