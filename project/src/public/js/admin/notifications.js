var editMode = false;
var editId = null;

function notificationSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function applyFilters() {
  var loai = document.getElementById('filter-loai').value;
  var nguon = document.getElementById('filter-nguon').value;
  var params = new URLSearchParams();
  if (loai) params.set('Loai', loai);
  if (nguon) params.set('Nguon', nguon);
  var query = params.toString();
  var url = '/admin/notifications' + (query ? '?' + query : '');
  window.location.href = url;
}

function getDefaultManualType(category) {
  if (category === 'tai_chinh') return 'han_thu_hoc_phi';
  if (category === 'hoc_vu') return 'han_dang_ky_hoc_phan';
  return 'han_he_thong';
}

function syncNotificationTypeByCategory() {
  var category = document.getElementById('notif-loai').value;
  var type = document.getElementById('notif-loai-thongbao');
  if (!type || editMode) return;
  type.value = getDefaultManualType(category);
}

function isAutoNotification(data) {
  return data && data.LoaiThongBao && String(data.LoaiThongBao).indexOf('auto_') === 0;
}

function parseTarget(target) {
  if (!target || target === 'Tất cả') return { type: 'all', value: '' };
  if (target === 'Sinh viên') return { type: 'student', value: '' };
  if (target === 'Quản trị viên' || target === 'Admin') return { type: 'admin', value: '' };
  if (target.indexOf('Khoa:') === 0) return { type: 'faculty', value: target.slice(5) };
  if (target.indexOf('Ngành:') === 0) return { type: 'major', value: target.slice(6) };
  return { type: 'all', value: '' };
}

function syncNotificationTarget() {
  var type = document.getElementById('notif-target-type').value;
  var facultyGroup = document.getElementById('notif-faculty-group');
  var majorGroup = document.getElementById('notif-major-group');
  if (facultyGroup) facultyGroup.classList.toggle('hidden', type !== 'faculty' && type !== 'major');
  if (majorGroup) majorGroup.classList.toggle('hidden', type !== 'major');
}

function filterNotificationMajors() {
  var faculty = document.getElementById('notif-faculty');
  var major = document.getElementById('notif-major');
  if (!faculty || !major) return;
  var selectedFaculty = faculty.value;
  Array.prototype.forEach.call(major.options, function(option) {
    if (!option.value) {
      option.hidden = false;
      return;
    }
    option.hidden = !!selectedFaculty && option.getAttribute('data-faculty') !== selectedFaculty;
  });
  if (major.selectedOptions[0] && major.selectedOptions[0].hidden) major.value = '';
}

function openModal(mode, data) {
  data = data || {};
  if (mode === 'edit' && isAutoNotification(data)) {
    showToast('Thông báo tự động được tạo theo sự kiện, không chỉnh sửa thủ công', 'error');
    return;
  }
  editMode = mode === 'edit';
  editId = editMode ? data.MaThongBao : null;
  var target = parseTarget(editMode ? data.DOITUONG : 'Tất cả');

  document.getElementById('modal-title').textContent = editMode ? 'Sửa thông báo' : 'Tạo thông báo';
  document.getElementById('notif-tieude').value = editMode ? data.TieuDe : '';
  document.getElementById('notif-noidung').value = editMode ? data.NoiDung : '';
  document.getElementById('notif-loai').value = editMode ? data.Loai : 'chung';
  document.getElementById('notif-loai-thongbao').value = editMode ? (data.LoaiThongBao || getDefaultManualType(data.Loai)) : getDefaultManualType('chung');
  document.getElementById('notif-target-type').value = target.type;
  document.getElementById('notif-faculty').value = target.type === 'faculty' ? target.value : '';
  filterNotificationMajors();
  document.getElementById('notif-major').value = target.type === 'major' ? target.value : '';
  document.getElementById('notif-ghim').checked = editMode ? !!data.GhimTop : false;
  document.getElementById('notif-hethan').value = editMode && data.NgayHetHan ? new Date(data.NgayHetHan).toISOString().split('T')[0] : '';
  document.getElementById('notif-duongdan').value = editMode ? (data.DuongDan || '') : '';
  syncNotificationTarget();
  document.getElementById('notif-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('notif-modal').classList.remove('active');
}

function closePreviewModal() {
  document.getElementById('notif-preview-modal').classList.remove('active');
}

function buildNotificationBody() {
  var targetType = document.getElementById('notif-target-type').value;
  var targetValue = '';
  var doituong = 'Tất cả';
  if (targetType === 'student') doituong = 'Sinh viên';
  if (targetType === 'admin') doituong = 'Quản trị viên';
  if (targetType === 'faculty') {
    targetValue = document.getElementById('notif-faculty').value;
    doituong = targetValue ? 'Khoa:' + targetValue : '';
  }
  if (targetType === 'major') {
    targetValue = document.getElementById('notif-major').value;
    doituong = targetValue ? 'Ngành:' + targetValue : '';
  }

  return {
    TieuDe: document.getElementById('notif-tieude').value.trim(),
    NoiDung: document.getElementById('notif-noidung').value.trim(),
    Loai: document.getElementById('notif-loai').value,
    LoaiThongBao: document.getElementById('notif-loai-thongbao').value,
    DOITUONG: doituong,
    targetType: targetType,
    targetValue: targetValue,
    MaKhoa: targetType === 'faculty' ? targetValue : '',
    MaNganh: targetType === 'major' ? targetValue : '',
    GhimTop: document.getElementById('notif-ghim').checked,
    NgayHetHan: document.getElementById('notif-hethan').value || null,
    DuongDan: document.getElementById('notif-duongdan').value.trim() || null
  };
}

function validateNotificationBody(body) {
  if (!body.TieuDe || !body.NoiDung) {
    showToast('Vui lòng nhập tiêu đề và nội dung', 'error');
    return false;
  }
  if (!body.DOITUONG) {
    showToast('Vui lòng chọn đối tượng gửi', 'error');
    return false;
  }
  if (String(body.LoaiThongBao || '').indexOf('auto_') === 0) {
    showToast('Loại tự động chỉ được tạo bởi sự kiện hệ thống', 'error');
    return false;
  }
  return true;
}

async function saveNotification() {
  var body = buildNotificationBody();
  if (!validateNotificationBody(body)) return;
  var url = editMode ? '/api/notifications/' + editId : '/api/notifications';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) {
    showToast(res.message || 'Thành công', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

function previewNotification() {
  var body = buildNotificationBody();
  if (!validateNotificationBody(body)) return;
  var modal = document.getElementById('notif-preview-modal');
  var preview = document.getElementById('notif-preview-body');
  preview.innerHTML = '<div class="notice-item">' +
    '<div class="notice-header"><strong>' + notificationSafe(body.TieuDe) + '</strong><small>' + formatDate(new Date()) + '</small></div>' +
    '<p style="white-space:pre-wrap">' + notificationSafe(body.NoiDung) + '</p>' +
    '<div class="info-list">' +
      '<div><span class="label">Loại</span><span>' + notificationSafe(body.Loai) + '</span></div>' +
      '<div><span class="label">Nhóm hạn</span><span>' + notificationSafe(body.LoaiThongBao) + '</span></div>' +
      '<div><span class="label">Gửi cho</span><span>' + notificationSafe(body.DOITUONG) + '</span></div>' +
      '<div><span class="label">Hết hạn</span><span>' + (body.NgayHetHan ? notificationSafe(body.NgayHetHan) : '-') + '</span></div>' +
      '<div><span class="label">Liên kết</span><span>' + notificationSafe(body.DuongDan || '-') + '</span></div>' +
    '</div>' +
  '</div>';
  modal.classList.add('active');
}

async function deleteNotification(id) {
  if (!confirm('Xóa thông báo này?')) return;
  var res = await apiFetch('/api/notifications/' + id, { method: 'DELETE' });
  if (res.success) {
    showToast(res.message || 'Đã xóa', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

function notificationTypeLabel(value) {
  if (value === 'chung') return 'Chung';
  if (value === 'hoc_vu') return 'Học vụ';
  if (value === 'tai_chinh') return 'Tài chính';
  if (value === 'he_thong') return 'Hệ thống';
  return value || '-';
}

function initNotificationRowDetails() {
  if (!window.AdminUI) return;
  AdminUI.attachRowDetailHandlers({
    table: '.data-table',
    buildDetail: function(record) {
      var isAuto = record.LoaiThongBao && record.LoaiThongBao.indexOf('auto_') === 0;
      return {
        title: 'Chi tiết thông báo #' + (record.MaThongBao || ''),
        rows: [
          { label: 'Mã thông báo', value: record.MaThongBao },
          { label: 'Tiêu đề', value: record.TieuDe },
          { label: 'Loại', value: notificationTypeLabel(record.Loai) },
          { label: 'Nguồn', value: isAuto ? 'Tự động' : 'Thủ công' },
          { label: 'Đối tượng', value: record.DOITUONG || 'Tất cả' },
          { label: 'Ghim top', value: record.GhimTop ? 'Có' : 'Không' },
          { label: 'Ngày hết hạn', value: record.NgayHetHan ? formatDate(record.NgayHetHan) : '-' },
          { label: 'Ngày tạo', value: record.NgayTao ? formatDate(record.NgayTao) : '-' },
          { label: 'Liên kết', value: record.DuongDan },
          { label: 'Nội dung', value: record.NoiDung }
        ]
      };
    }
  });
}

initNotificationRowDetails();
