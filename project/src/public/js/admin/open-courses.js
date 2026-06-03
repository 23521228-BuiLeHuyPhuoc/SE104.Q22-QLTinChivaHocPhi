var editingOpenCourseId = null;
var editingOpenCourseRecord = null;
var selectedOpenCourse = null;
var openCourseSearchTimer = null;
var openCoursePickerSearchTimer = null;
var openCoursePickerRows = [];

function ocEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openCourseOptionLabel(course) {
  if (!course) return '';
  return (course.MaMonHoc || '') + ' - ' + (course.TenMonHoc || '');
}

function setSelectedOpenCourse(course) {
  selectedOpenCourse = course || null;
  var input = document.getElementById('oc-mamonhoc');
  var summary = document.getElementById('oc-course-summary');
  if (input) input.value = selectedOpenCourse ? selectedOpenCourse.MaMonHoc || '' : '';
  if (!summary) return;

  if (!selectedOpenCourse) {
    summary.innerHTML = '<strong>Chưa chọn môn học</strong><small>Tìm theo mã hoặc tên môn học</small>';
    return;
  }

  summary.innerHTML =
    '<strong>' + ocEscapeHtml(openCourseOptionLabel(selectedOpenCourse)) + '</strong>' +
    '<small>' + ocEscapeHtml((selectedOpenCourse.LoaiMon || '-') + ' | ' + (selectedOpenCourse.TenKhoa || selectedOpenCourse.MaKhoa || '-')) + '</small>';
}

function setOpenCourseSaving(isSaving) {
  var button = document.getElementById('open-course-save-btn');
  var label = button ? button.querySelector('.open-course-save-label') : null;
  if (!button) return;
  button.disabled = !!isSaving;
  if (label) label.textContent = isSaving ? 'Đang lưu...' : 'Lưu';
}

function applyOpenCourseFilters() {
  var params = new URLSearchParams();
  var searchField = document.getElementById('oc-search-field');
  var search = document.getElementById('oc-search');
  var semester = document.getElementById('oc-filter-hocky');
  var faculty = document.getElementById('oc-filter-khoa');
  var status = document.getElementById('oc-filter-trangthai');

  params.set('page', '1');
  if (searchField && searchField.value) params.set('searchField', searchField.value);
  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (semester && semester.value) params.set('MaHocKy', semester.value);
  if (faculty && faculty.value) params.set('MaKhoa', faculty.value);
  if (status && status.value) params.set('TrangThai', status.value);
  window.location.href = '/admin/open-courses?' + params.toString();
}

function debounceOpenCourseSearch() {
  clearTimeout(openCourseSearchTimer);
  openCourseSearchTimer = setTimeout(applyOpenCourseFilters, 350);
}

function openCourseModal(mode, row) {
  editingOpenCourseId = mode === 'edit' && row ? row.id : null;
  editingOpenCourseRecord = editingOpenCourseId ? row : null;
  document.getElementById('open-course-modal-title').textContent = editingOpenCourseId ? 'Sửa môn học mở' : 'Thêm môn học mở';
  document.getElementById('open-course-form').reset();
  document.getElementById('oc-trangthai').value = 'true';
  setOpenCourseSaving(false);

  if (editingOpenCourseId) {
    document.getElementById('oc-hocky').value = row.MaHocKy || '';
    document.getElementById('oc-trangthai').value = row.TrangThai === false ? 'false' : 'true';
    document.getElementById('oc-ghichu').value = row.GhiChu || '';
    setSelectedOpenCourse(row);
  } else {
    var filterSemester = document.getElementById('oc-filter-hocky');
    if (filterSemester && filterSemester.value && filterSemester.value !== 'all') {
      document.getElementById('oc-hocky').value = filterSemester.value;
    }
    setSelectedOpenCourse(null);
  }

  document.getElementById('open-course-modal').classList.add('active');
}

function closeOpenCourseModal() {
  document.getElementById('open-course-modal').classList.remove('active');
}

async function saveOpenCourse() {
  var data = {
    MaHocKy: document.getElementById('oc-hocky').value,
    MaMonHoc: document.getElementById('oc-mamonhoc').value,
    TrangThai: document.getElementById('oc-trangthai').value === 'true',
    GhiChu: document.getElementById('oc-ghichu').value.trim()
  };

  if (!data.MaHocKy || !data.MaMonHoc) {
    showToast('Vui lòng chọn học kỳ và môn học', 'error');
    return;
  }

  try {
    setOpenCourseSaving(true);
    var url = editingOpenCourseId ? '/api/open-courses/' + encodeURIComponent(editingOpenCourseId) : '/api/open-courses';
    var method = editingOpenCourseId ? 'PUT' : 'POST';
    var res = await apiFetch(url, { method: method, body: data });
    if (res.success) {
      showToast(res.message || 'Đã lưu môn học mở', 'success');
      closeOpenCourseModal();
      setTimeout(function() { window.location.reload(); }, 400);
    } else {
      showToast(res.message || 'Không thể lưu môn học mở', 'error');
      setOpenCourseSaving(false);
    }
  } catch (e) {
    setOpenCourseSaving(false);
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteOpenCourse(id) {
  if (!id || !confirm('Bạn có chắc muốn xóa môn học mở này?')) return;
  try {
    var res = await apiFetch('/api/open-courses/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Đã xóa môn học mở', 'success');
      setTimeout(function() { window.location.reload(); }, 400);
    } else {
      showToast(res.message || 'Không thể xóa môn học mở', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function openOpenCoursePicker() {
  var semester = document.getElementById('oc-hocky').value;
  if (!semester) {
    showToast('Vui lòng chọn học kỳ trước', 'error');
    return;
  }
  var modal = document.getElementById('open-course-picker-modal');
  var search = document.getElementById('open-course-picker-search');
  if (search) search.value = '';
  modal.classList.add('active');
  loadOpenCoursePickerResults();
}

function closeOpenCoursePicker() {
  document.getElementById('open-course-picker-modal').classList.remove('active');
}

function debounceOpenCoursePickerSearch() {
  clearTimeout(openCoursePickerSearchTimer);
  openCoursePickerSearchTimer = setTimeout(loadOpenCoursePickerResults, 300);
}

async function loadOpenCoursePickerResults() {
  var tbody = document.getElementById('open-course-picker-results');
  var semester = document.getElementById('oc-hocky').value;
  var search = document.getElementById('open-course-picker-search');
  if (!tbody) return;
  if (!semester) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Chọn học kỳ trước</div></td></tr>';
    return;
  }
  tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Đang tải...</div></td></tr>';

  try {
    var params = new URLSearchParams({ all: 'true', MaHocKy: semester });
    if (search && search.value.trim()) params.set('search', search.value.trim());
    var faculty = document.getElementById('oc-filter-khoa');
    if (faculty && faculty.value) params.set('MaKhoa', faculty.value);
    var res = await apiFetch('/api/open-courses/available?' + params.toString());
    if (!res.success) throw new Error(res.message || 'Không tải được danh sách môn học');
    openCoursePickerRows = res.data || [];
    if (!openCoursePickerRows.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Không có môn học phù hợp</div></td></tr>';
      return;
    }
    tbody.innerHTML = openCoursePickerRows.map(function(course, index) {
      return '<tr>' +
        '<td class="mono">' + ocEscapeHtml(course.MaMonHoc) + '</td>' +
        '<td>' + ocEscapeHtml(course.TenMonHoc) + '</td>' +
        '<td>' + ocEscapeHtml(course.LoaiMon || '-') + '</td>' +
        '<td>' + ocEscapeHtml(course.TenKhoa || course.MaKhoa || '-') + '</td>' +
        '<td><button class="btn btn-sm btn-primary" type="button" data-index="' + index + '" onclick="selectOpenCourseFromPicker(Number(this.dataset.index))">Chọn</button></td>' +
      '</tr>';
    }).join('');
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">' + ocEscapeHtml(error.message || 'Không tải được môn học') + '</div></td></tr>';
  }
}

function selectOpenCourseFromPicker(index) {
  var course = openCoursePickerRows[index];
  if (!course) return;
  setSelectedOpenCourse(course);
  closeOpenCoursePicker();
}

function closeOpenCourseDetail() {
  document.getElementById('open-course-detail-modal').classList.remove('active');
}

async function openOpenCourseDetail(id) {
  var modal = document.getElementById('open-course-detail-modal');
  var content = document.getElementById('open-course-detail-content');
  modal.classList.add('active');
  content.textContent = 'Đang tải...';
  try {
    var res = await apiFetch('/api/open-courses/' + encodeURIComponent(id));
    if (!res.success) throw new Error(res.message || 'Không tải được chi tiết');
    var item = res.data || {};
    content.innerHTML =
      '<div class="detail-grid">' +
        '<div><strong>Học kỳ</strong><span>' + ocEscapeHtml((item.TenHocKy || item.MaHocKy || '-') + (item.TenNamHoc ? ' - ' + item.TenNamHoc : '')) + '</span></div>' +
        '<div><strong>Mã môn</strong><span class="mono">' + ocEscapeHtml(item.MaMonHoc || '-') + '</span></div>' +
        '<div><strong>Tên môn</strong><span>' + ocEscapeHtml(item.TenMonHoc || '-') + '</span></div>' +
        '<div><strong>Loại môn</strong><span>' + ocEscapeHtml(item.LoaiMon || '-') + '</span></div>' +
        '<div><strong>Khoa</strong><span>' + ocEscapeHtml(item.TenKhoa || item.MaKhoa || '-') + '</span></div>' +
        '<div><strong>Số tiết</strong><span>' + ocEscapeHtml(item.SoTiet || '-') + '</span></div>' +
        '<div><strong>Tín chỉ</strong><span>' + Number(item.SoTinChi || 0) + '</span></div>' +
        '<div><strong>Lớp mở</strong><span>' + Number(item.SoLopMo || 0) + '</span></div>' +
        '<div><strong>Trạng thái</strong><span>' + (item.TrangThai === false ? 'Tạm dừng' : 'Đang mở') + '</span></div>' +
        '<div><strong>Cập nhật</strong><span>' + ocEscapeHtml(item.NgayCapNhat ? new Date(item.NgayCapNhat).toLocaleDateString('vi-VN') : '-') + '</span></div>' +
      '</div>' +
      '<div class="detail-note">' + ocEscapeHtml(item.GhiChu || 'Không có ghi chú') + '</div>';
  } catch (error) {
    content.textContent = error.message || 'Không tải được chi tiết';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var semester = document.getElementById('oc-hocky');
  if (semester) {
    semester.addEventListener('change', function() {
      if (!editingOpenCourseRecord || semester.value !== editingOpenCourseRecord.MaHocKy) {
        setSelectedOpenCourse(null);
      }
    });
  }

  document.addEventListener('keydown', function(event) {
    if (event.key !== 'Escape') return;
    ['open-course-picker-modal', 'open-course-detail-modal', 'open-course-modal'].forEach(function(id) {
      var modal = document.getElementById(id);
      if (modal && modal.classList.contains('active')) modal.classList.remove('active');
    });
  });
});
