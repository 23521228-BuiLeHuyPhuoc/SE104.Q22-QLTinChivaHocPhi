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
  return value === 'qua_mon' ? 'Qua mon' : 'Rot';
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
  document.getElementById('modal-title').textContent = editMode ? 'Sua mon da hoc' : 'Them mon da hoc';
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
      '<td class="table-actions"><button class="btn btn-sm btn-outline" type="button" data-record="' + record + '" onclick="closeCompletedCourseDetail(); openModal(\'edit\', JSON.parse(this.dataset.record))">Sua</button><button class="btn btn-sm btn-danger" type="button" onclick="deleteCompletedCourse(' + c.id + ')">Xoa</button></td>' +
    '</tr>';
  }).join('');

  content.innerHTML =
    '<div class="detail-grid"><div><strong>MSSV</strong><span>' + completedEscapeHtml(maSv) + '</span></div><div><strong>Ho ten</strong><span>' + completedEscapeHtml(studentName) + '</span></div><div><strong>So luot hoc</strong><span>' + rows.length + '</span></div><div><strong>Qua mon</strong><span>' + passedCount + '</span></div><div><strong>Rot</strong><span>' + failedCount + '</span></div><div><strong>Tin chi tich luy</strong><span>' + passedCredits + '</span></div></div>' +
    '<div class="table-container mt-3"><table class="data-table"><thead><tr><th>Ma mon</th><th>Ten mon</th><th>Loai</th><th>TC</th><th>Lop</th><th>Hoc ky</th><th>Ket qua</th><th>Sua boi</th><th>Thao tac</th></tr></thead><tbody>' + (courseRows || '<tr><td colspan="9"><div class="empty-state">Sinh vien chua co mon da hoc</div></td></tr>') + '</tbody></table></div>';
}

async function openCompletedCourseDetail(maSv) {
  var modal = document.getElementById('completed-course-detail-modal');
  var content = document.getElementById('completed-course-detail-content');
  if (!modal || !content) return;
  modal.classList.add('active');
  content.textContent = 'Dang tai...';
  try {
    var res = await apiFetch('/api/completed-courses?MaSv=' + encodeURIComponent(maSv) + '&all=true');
    if (!res || res.success === false) throw new Error((res && res.message) || 'Khong tai duoc mon da hoc');
    renderCompletedCourseDetail(maSv, res.data || []);
  } catch (error) {
    content.textContent = error.message || 'Khong tai duoc mon da hoc';
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
    showToast('Vui long nhap MSSV, ma mon, hoc ky va ket qua', 'error');
    return;
  }
  var url = editMode ? '/api/completed-courses/' + editId : '/api/completed-courses';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Loi', 'error');
  }
}

async function deleteCompletedCourse(id) {
  if (!confirm('Xoa mon da hoc nay?')) return;
  var res = await apiFetch('/api/completed-courses/' + id, { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Loi', 'error');
  }
}

function openImportModal() {
  importRows = [];
  document.getElementById('import-preview').innerHTML = '<tr><td colspan="5"><div class="empty-state">Chon file CSV/TSV tu Excel de xem truoc</div></td></tr>';
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
          return '<tr><td>' + completedEscapeHtml(row.MSSV || row.MaSv) + '</td><td>' + completedEscapeHtml(row.MaMonHoc) + '</td><td>' + completedEscapeHtml(row.Hocky || row.HocKy || row.MaHocKy) + '</td><td>' + completedEscapeHtml(row.KetQua) + '</td><td>Cho xac nhan</td></tr>';
        }).join('') || '<tr><td colspan="5"><div class="empty-state">File khong co du lieu</div></td></tr>';
      });
    });
  }
});

async function confirmImport() {
  if (!importRows.length) {
    showToast('Chua co du lieu import', 'error');
    return;
  }
  var preview = await apiFetch('/api/completed-courses/batch', { method: 'POST', body: { items: importRows, preview: true } });
  if (!preview.success) {
    showToast('Du lieu import con loi', 'error');
    document.getElementById('import-preview').innerHTML = (preview.errors || []).map(function(error) {
      return '<tr><td>' + completedEscapeHtml(error.row.MaSv) + '</td><td>' + completedEscapeHtml(error.row.MaMonHoc) + '</td><td>' + completedEscapeHtml(error.row.MaHocKy) + '</td><td>' + completedEscapeHtml(error.row.KetQua) + '</td><td>' + completedEscapeHtml(error.message) + '</td></tr>';
    }).join('');
    return;
  }
  var res = await apiFetch('/api/completed-courses/batch', { method: 'POST', body: { items: importRows } });
  if (res.success) {
    showToast(res.message || 'Import thanh cong', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Import that bai', 'error');
  }
}

function openClassGradeModal() {
  classRosterRows = [];
  document.getElementById('class-roster').innerHTML = '<tr><td colspan="4"><div class="empty-state">Chua tai danh sach</div></td></tr>';
  document.getElementById('class-grade-modal').classList.add('active');
}

function closeClassGradeModal() {
  document.getElementById('class-grade-modal').classList.remove('active');
}

async function loadClassRoster() {
  var maLop = document.getElementById('bulk-class').value;
  var maHocKy = document.getElementById('bulk-semester').value;
  if (!maLop || !maHocKy) {
    showToast('Vui long chon lop va hoc ky', 'error');
    return;
  }
  var res = await apiFetch('/api/completed-courses/class-roster?MaLop=' + encodeURIComponent(maLop) + '&MaHocKy=' + encodeURIComponent(maHocKy));
  classRosterRows = res.data || [];
  document.getElementById('class-roster').innerHTML = classRosterRows.map(function(row, index) {
    return '<tr><td class="mono">' + completedEscapeHtml(row.MaSv) + '</td><td>' + completedEscapeHtml(row.HoTen) + '</td><td>' + completedEscapeHtml(row.MaMonHoc) + '</td><td><select class="form-control" data-index="' + index + '"><option value="qua_mon">Qua mon</option><option value="rot">Rot</option></select></td></tr>';
  }).join('') || '<tr><td colspan="4"><div class="empty-state">Lop chua co sinh vien dang ky</div></td></tr>';
}

async function saveClassGrades() {
  if (!classRosterRows.length) {
    showToast('Chua co danh sach de luu', 'error');
    return;
  }
  var maHocKy = document.getElementById('bulk-semester').value;
  var items = classRosterRows.map(function(row, index) {
    var select = document.querySelector('#class-roster select[data-index="' + index + '"]');
    return { MaSv: row.MaSv, MaMonHoc: row.MaMonHoc, MaHocKy: maHocKy, MaLop: row.MaLop, KetQua: select ? select.value : 'qua_mon' };
  });
  var res = await apiFetch('/api/completed-courses/batch', { method: 'POST', body: { items: items } });
  if (res.success) {
    showToast(res.message || 'Luu thanh cong', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Khong the luu dong loat', 'error');
  }
}
