var editingId = null;
var searchTimer;

function courseEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function syncCredits() {
  var type = document.getElementById('mh-loai').value;
  var lessons = parseInt(document.getElementById('mh-sotiet').value, 10) || 0;
  var divisor = type === 'TH' ? 30 : 15;
  document.getElementById('mh-tc').value = Math.max(1, Math.floor(lessons / divisor) || 1);
}

document.addEventListener('DOMContentLoaded', function() {
  var type = document.getElementById('mh-loai');
  var lessons = document.getElementById('mh-sotiet');
  if (type) type.addEventListener('change', syncCredits);
  if (lessons) lessons.addEventListener('input', syncCredits);
});

function openModal(mode, c) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa môn học' : 'Thêm môn học';
  document.getElementById('mh-ma').disabled = mode === 'edit';

  if (mode === 'edit' && c) {
    editingId = c.MaMonHoc;
    document.getElementById('mh-ma').value = c.MaMonHoc || '';
    document.getElementById('mh-ten').value = c.TenMonHoc || '';
    document.getElementById('mh-makhoa').value = c.MaKhoa || '';
    document.getElementById('mh-loai').value = c.LoaiMon || 'LT';
    document.getElementById('mh-sotiet').value = c.SoTiet || 45;
    document.getElementById('mh-tc').value = c.SoTinChi || 3;
    document.getElementById('mh-mota').value = c.MoTa || '';
  } else {
    document.getElementById('course-form').reset();
    document.getElementById('mh-loai').value = 'LT';
    document.getElementById('mh-sotiet').value = 45;
    syncCredits();
  }

  document.getElementById('course-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('course-modal').classList.remove('active');
}

async function saveCourse() {
  var data = {
    MaMonHoc: document.getElementById('mh-ma').value.trim(),
    TenMonHoc: document.getElementById('mh-ten').value.trim(),
    MaKhoa: document.getElementById('mh-makhoa').value,
    LoaiMon: document.getElementById('mh-loai').value,
    SoTiet: parseInt(document.getElementById('mh-sotiet').value, 10),
    MoTa: document.getElementById('mh-mota').value.trim() || null
  };

  try {
    var res = editingId
      ? await apiFetch('/api/courses/' + editingId, { method: 'PUT', body: data })
      : await apiFetch('/api/courses', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cập nhật môn học thành công' : 'Thêm môn học thành công', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu môn học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteCourse(id) {
  if (!confirm('Bạn có chắc muốn xóa môn học này?')) return;
  try {
    var res = await apiFetch('/api/courses/' + id, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa môn học', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa môn học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function applyCourseFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input').value.trim();
  var faculty = document.getElementById('faculty-filter').value;
  var type = document.getElementById('type-filter').value;
  params.set('page', '1');
  if (search) params.set('search', search);
  if (faculty) params.set('MaKhoa', faculty);
  if (type) params.set('LoaiMon', type);
  window.location.href = '/admin/courses?' + params.toString();
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyCourseFilters, 400);
}

async function exportCourses() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input').value.trim();
  var faculty = document.getElementById('faculty-filter').value;
  var type = document.getElementById('type-filter').value;
  if (search) params.set('search', search);
  if (faculty) params.set('MaKhoa', faculty);
  if (type) params.set('LoaiMon', type);
  var headers = {};
  var token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  var response = await fetch('/api/courses/export?' + params.toString(), { headers: headers });
  if (!response.ok) {
    showToast('Không thể xuất Excel', 'error');
    return;
  }
  var blob = await response.blob();
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = 'courses.xls';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function closeCourseDetail() {
  document.getElementById('course-detail-modal').classList.remove('active');
}

async function openCourseDetail(id) {
  var modal = document.getElementById('course-detail-modal');
  var content = document.getElementById('course-detail-content');
  modal.classList.add('active');
  content.textContent = 'Đang tải...';
  try {
    var res = await apiFetch('/api/courses/' + encodeURIComponent(id));
    if (!res.success) throw new Error(res.message || 'Không tải được chi tiết');
    var c = res.data || {};
    var prereqs = (c.prerequisites || []).map(function(item) {
      return '<li><span class="mono">' + courseEscapeHtml(item.MaMonDieuKien) + '</span> - ' + courseEscapeHtml(item.TenMonDieuKien) + ' (' + courseEscapeHtml(item.LoaiDieuKien) + ')</li>';
    }).join('');
    var classes = (c.openedClasses || []).map(function(item) {
      return '<tr><td class="mono">' + courseEscapeHtml(item.MaLop) + '</td><td>' + courseEscapeHtml(item.TenLop) + '</td><td>' + courseEscapeHtml(item.GiangVien || '-') + '</td><td>' + courseEscapeHtml((item.TenHocKy || item.MaHocKy || '-') + (item.TenNamHoc ? ' - ' + item.TenNamHoc : '')) + '</td></tr>';
    }).join('');
    var curricula = (c.curricula || []).map(function(item) {
      return '<li>' + courseEscapeHtml(item.TenNganh || item.MaNganh) + ' - HK ' + courseEscapeHtml(item.HocKyDuKien) + ' - ' + (item.BatBuoc ? 'Bắt buộc' : 'Tự chọn') + '</li>';
    }).join('');
    content.innerHTML =
      '<div class="detail-grid">' +
        '<div><strong>Mã môn</strong><span>' + courseEscapeHtml(c.MaMonHoc) + '</span></div>' +
        '<div><strong>Tên môn</strong><span>' + courseEscapeHtml(c.TenMonHoc) + '</span></div>' +
        '<div><strong>Khoa</strong><span>' + courseEscapeHtml(c.TenKhoa || c.MaKhoa) + '</span></div>' +
        '<div><strong>Tín chỉ</strong><span>' + Number(c.SoTinChi || 0) + '</span></div>' +
      '</div>' +
      '<h4>Môn điều kiện</h4><ul>' + (prereqs || '<li>Không có</li>') + '</ul>' +
      '<h4>Chương trình đào tạo</h4><ul>' + (curricula || '<li>Chưa gắn vào chương trình</li>') + '</ul>' +
      '<h4>Lớp đã mở</h4><div class="table-container"><table class="data-table"><thead><tr><th>Mã lớp</th><th>Tên lớp</th><th>Giảng viên</th><th>Học kỳ</th></tr></thead><tbody>' + (classes || '<tr><td colspan="4"><div class="empty-state">Chưa mở lớp</div></td></tr>') + '</tbody></table></div>';
  } catch (error) {
    content.textContent = error.message || 'Không tải được chi tiết';
  }
}
