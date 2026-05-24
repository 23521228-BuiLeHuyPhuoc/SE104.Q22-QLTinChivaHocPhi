var searchTimer;
var editMode = false;
var editId = null;

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
  var search = document.getElementById('search-input').value;
  var hk = document.getElementById('filter-hocky').value;
  var result = document.getElementById('filter-result').value;
  var url = '/admin/completed-courses?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (hk) url += '&MaHocKy=' + encodeURIComponent(hk);
  if (result) url += '&KetQua=' + encodeURIComponent(result);
  window.location.href = url;
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
  var passedCredits = Object.keys(passedCourses).reduce(function(sum, key) {
    return sum + Number(passedCourses[key] || 0);
  }, 0);

  var studentName = rows[0] && rows[0].SINHVIEN ? rows[0].SINHVIEN.HoTen : '-';
  var courseRows = rows.map(function(c) {
    var course = c.MONHOC || {};
    var semester = c.HOCKY ? c.HOCKY.TenHocKy + (c.HOCKY.NAMHOC && c.HOCKY.NAMHOC.TenNamHoc ? ' - ' + c.HOCKY.NAMHOC.TenNamHoc : '') : c.MaHocKy;
    var updater = c.TAIKHOAN ? (c.TAIKHOAN.HoTen || c.TAIKHOAN.TenDangNhap) : '-';
    var record = completedEscapeHtml(JSON.stringify(c));
    return '<tr>' +
      '<td class="mono">' + completedEscapeHtml(c.MaMonHoc || '-') + '</td>' +
      '<td>' + completedEscapeHtml(course.TenMonHoc || '-') + '</td>' +
      '<td>' + completedEscapeHtml(c.MaLop || '-') + '</td>' +
      '<td>' + completedEscapeHtml(semester || '-') + '</td>' +
      '<td>' + (c.LanHoc || 1) + '</td>' +
      '<td><span class="badge ' + (c.KetQua === 'qua_mon' ? 'badge-success' : 'badge-error') + '">' + resultLabel(c.KetQua) + '</span></td>' +
      '<td>' + completedEscapeHtml(updater) + '</td>' +
      '<td>' + (c.NgayCapNhat ? formatDate(c.NgayCapNhat) : '-') + '</td>' +
      '<td class="table-actions">' +
        '<button class="btn btn-sm btn-outline" type="button" data-record="' + record + '" onclick="closeCompletedCourseDetail(); openModal(\'edit\', JSON.parse(this.dataset.record))">Sửa</button>' +
        '<button class="btn btn-sm btn-danger" type="button" onclick="deleteCompletedCourse(' + c.id + ')">Xóa</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  content.innerHTML =
    '<div class="detail-grid">' +
      '<div><strong>MSSV</strong><span>' + completedEscapeHtml(maSv) + '</span></div>' +
      '<div><strong>Họ tên</strong><span>' + completedEscapeHtml(studentName) + '</span></div>' +
      '<div><strong>Số lượt học</strong><span>' + rows.length + '</span></div>' +
      '<div><strong>Qua môn</strong><span>' + passedCount + '</span></div>' +
      '<div><strong>Rớt</strong><span>' + failedCount + '</span></div>' +
      '<div><strong>Tín chỉ tích lũy</strong><span>' + passedCredits + '</span></div>' +
    '</div>' +
    '<div class="table-container mt-3"><table class="data-table"><thead><tr>' +
      '<th>Mã môn</th><th>Tên môn</th><th>Lớp</th><th>Học kỳ</th><th>Lần</th><th>Kết quả</th><th>Sửa bởi</th><th>Sửa lúc</th><th>Thao tác</th>' +
    '</tr></thead><tbody>' + (courseRows || '<tr><td colspan="9"><div class="empty-state">Sinh viên chưa có môn đã học</div></td></tr>') + '</tbody></table></div>';
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
