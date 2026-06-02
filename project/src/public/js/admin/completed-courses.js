var searchTimer;
var editMode = false;
var editId = null;
var importRows = [];
var classRosterRows = [];

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
  [['search', 'search-input'], ['MaHocKy', 'filter-hocky'], ['KetQua', 'filter-result'], ['MaKhoa', 'filter-khoa'], ['LoaiMon', 'filter-loai'], ['SoTinChi', 'filter-tinchi']].forEach(function(pair) {
    var el = document.getElementById(pair[1]);
    if (el && el.value) params.set(pair[0], el.value);
  });
  window.location.href = '/admin/completed-courses?' + params.toString();
}

function openModal(mode, data) {
  editMode = mode === 'edit';
  editId = editMode ? data.id : null;
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
  if (!body.MaSv || !body.MaMonHoc || !body.MaHocKy || !body.KetQua) {
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

function openImportModal() {
  importRows = [];
  document.getElementById('import-preview').innerHTML = '<tr><td colspan="5"><div class="empty-state">Chọn file CSV/TSV từ Excel để xem trước</div></td></tr>';
  document.getElementById('import-modal').classList.add('active');
}

function closeImportModal() {
  document.getElementById('import-modal').classList.remove('active');
}

function parseDelimitedText(text) {
  var lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(function(line) { return line.trim(); });
  if (!lines.length) return [];
  var delimiter = lines[0].indexOf('\t') >= 0 ? '\t' : ',';
  var headers = lines[0].split(delimiter).map(function(item) { return item.trim(); });
  return lines.slice(1).map(function(line) {
    var values = line.split(delimiter);
    return headers.reduce(function(row, header, index) {
      row[header] = (values[index] || '').trim();
      return row;
    }, {});
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var file = document.getElementById('import-file');
  if (file) {
    file.addEventListener('change', function() {
      var selected = file.files[0];
      if (!selected) return;
      selected.text().then(function(text) {
        importRows = parseDelimitedText(text);
        document.getElementById('import-preview').innerHTML = importRows.slice(0, 20).map(function(row) {
          return '<tr><td>' + completedEscapeHtml(row.MSSV || row.MaSv) + '</td><td>' + completedEscapeHtml(row.MaMonHoc) + '</td><td>' + completedEscapeHtml(row.Hocky || row.HocKy || row.MaHocKy) + '</td><td>' + completedEscapeHtml(row.KetQua) + '</td><td>Chờ xác nhận</td></tr>';
        }).join('') || '<tr><td colspan="5"><div class="empty-state">File không có dữ liệu</div></td></tr>';
      });
    });
  }
});

async function confirmImport() {
  if (!importRows.length) {
    showToast('Chưa có dữ liệu import', 'error');
    return;
  }
  var preview = await apiFetch('/api/completed-courses/batch', { method: 'POST', body: { items: importRows, preview: true } });
  if (!preview.success) {
    showToast('Dữ liệu import còn lỗi', 'error');
    document.getElementById('import-preview').innerHTML = (preview.errors || []).map(function(error) {
      return '<tr><td>' + completedEscapeHtml(error.row.MaSv) + '</td><td>' + completedEscapeHtml(error.row.MaMonHoc) + '</td><td>' + completedEscapeHtml(error.row.MaHocKy) + '</td><td>' + completedEscapeHtml(error.row.KetQua) + '</td><td>' + completedEscapeHtml(error.message) + '</td></tr>';
    }).join('');
    return;
  }
  var res = await apiFetch('/api/completed-courses/batch', { method: 'POST', body: { items: importRows } });
  if (res.success) {
    showToast(res.message || 'Import thành công', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Import thất bại', 'error');
  }
}

function openClassGradeModal() {
  classRosterRows = [];
  document.getElementById('class-roster').innerHTML = '<tr><td colspan="4"><div class="empty-state">Chưa tải danh sách</div></td></tr>';
  document.getElementById('class-grade-modal').classList.add('active');
}

function closeClassGradeModal() {
  document.getElementById('class-grade-modal').classList.remove('active');
}

async function loadClassRoster() {
  var maLop = document.getElementById('bulk-class').value;
  var maHocKy = document.getElementById('bulk-semester').value;
  if (!maLop || !maHocKy) {
    showToast('Vui lòng chọn lớp và học kỳ', 'error');
    return;
  }
  var res = await apiFetch('/api/completed-courses/class-roster?MaLop=' + encodeURIComponent(maLop) + '&MaHocKy=' + encodeURIComponent(maHocKy));
  classRosterRows = res.data || [];
  document.getElementById('class-roster').innerHTML = classRosterRows.map(function(row, index) {
    return '<tr><td class="mono">' + completedEscapeHtml(row.MaSv) + '</td><td>' + completedEscapeHtml(row.HoTen) + '</td><td>' + completedEscapeHtml(row.MaMonHoc) + '</td><td><select class="form-control" data-index="' + index + '"><option value="qua_mon">Qua môn</option><option value="rot">Rớt</option></select></td></tr>';
  }).join('') || '<tr><td colspan="4"><div class="empty-state">Lớp chưa có sinh viên đăng ký</div></td></tr>';
}

async function saveClassGrades() {
  if (!classRosterRows.length) {
    showToast('Chưa có danh sách để lưu', 'error');
    return;
  }
  var maHocKy = document.getElementById('bulk-semester').value;
  var items = classRosterRows.map(function(row, index) {
    var select = document.querySelector('#class-roster select[data-index="' + index + '"]');
    return { MaSv: row.MaSv, MaMonHoc: row.MaMonHoc, MaHocKy: maHocKy, MaLop: row.MaLop, KetQua: select ? select.value : 'qua_mon' };
  });
  var res = await apiFetch('/api/completed-courses/batch', { method: 'POST', body: { items: items } });
  if (res.success) {
    showToast(res.message || 'Lưu thành công', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Không thể lưu đồng loạt', 'error');
  }
}
