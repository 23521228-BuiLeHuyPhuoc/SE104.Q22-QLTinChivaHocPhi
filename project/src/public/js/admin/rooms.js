var roomEditingId = null;
var roomSearchTimer = null;
var activeRoomClassesId = null;
var roomSearchCriterionReady = false;

function roomValue(id) {
  var element = document.getElementById(id);
  return element ? element.value : '';
}

function roomText(id) {
  return roomValue(id).trim();
}

function selectedRoomSemester() {
  return roomValue('filter-semester') || roomValue('room-hocky') || roomValue('room-classes-semester') || '';
}

function setRoomSelectValue(id, value, fallback) {
  var select = document.getElementById(id);
  if (!select) return;
  var target = value || fallback || '';
  var exists = Array.prototype.some.call(select.options, function(option) { return option.value === String(target); });
  if (exists) select.value = target;
  else if (fallback !== undefined) select.value = fallback || '';
}

function setRoomReadonly(id, readonly) {
  var field = document.getElementById(id);
  if (!field) return;
  field.readOnly = !!readonly;
  field.toggleAttribute('data-ui-readonly', !!readonly);
  field.classList.toggle('ui-readonly-field', !!readonly);
  if (!readonly) field.removeAttribute('title');
}

function getRoomSearchField() {
  var criterion = document.getElementById('room-search-field') || document.querySelector('.ui-search-criterion-select');
  var input = document.getElementById('search-input');
  return (criterion && criterion.value) || (input && input.dataset.searchField) || 'all';
}

function applyRoomFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input');
  var semester = document.getElementById('filter-semester');
  var type = document.getElementById('filter-type');
  var usedStatus = document.getElementById('filter-used-status');
  var status = document.getElementById('filter-status');

  params.set('page', '1');
  if (search && search.value.trim()) params.set('search', search.value.trim());
  params.set('searchField', getRoomSearchField());
  if (semester && semester.value) params.set('MaHocKy', semester.value);
  if (type && type.value) params.set('type', type.value);
  if (usedStatus && usedStatus.value) params.set('usedStatus', usedStatus.value);
  if (status && status.value) params.set('status', status.value);
  navigatePageContent('/admin/rooms?' + params.toString());
}

function debounceRoomSearch() {
  clearTimeout(roomSearchTimer);
  roomSearchTimer = setTimeout(applyRoomFilters, 400);
}

function formatRoomType(value) {
  if (value === 'thuc_hanh') return 'Thực hành';
  if (value === 'lab') return 'Lab';
  return 'Lý thuyết';
}

function formatRoomDate(value) {
  if (!value) return '-';
  var date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('vi-VN');
}

function escapeRoomHtml(value) {
  return String(value === undefined || value === null || value === '' ? '-' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function openRoomModal(mode, room) {
  var isEdit = mode === 'edit';
  roomEditingId = null;
  document.getElementById('room-modal-title').textContent = isEdit ? 'Sửa phòng học' : 'Thêm phòng học';
  setRoomReadonly('room-ma', isEdit);

  if (isEdit && room) {
    roomEditingId = room.MaPhong;
    setRoomSelectValue('room-hocky', room.MaHocKy, selectedRoomSemester());
    document.getElementById('room-ma').value = room.MaPhong || '';
    document.getElementById('room-ten').value = room.TenPhong || '';
    document.getElementById('room-toanha').value = room.ToaNha || '';
    document.getElementById('room-succhua').value = room.SucChua || 60;
    document.getElementById('room-loai').value = room.LoaiPhong || 'ly_thuyet';
    document.getElementById('room-trangthai').value = room.TrangThai === false ? 'false' : 'true';
    document.getElementById('room-mota').value = room.MoTa || '';
  } else {
    document.getElementById('room-form').reset();
    setRoomSelectValue('room-hocky', selectedRoomSemester(), '');
    document.getElementById('room-succhua').value = 60;
    document.getElementById('room-loai').value = 'ly_thuyet';
    document.getElementById('room-trangthai').value = 'true';
  }

  var modal = document.getElementById('room-modal');
  if (window.AdminUI) {
    AdminUI.markReadonlyFields(modal);
    AdminUI.initReadonlyNotices(modal);
  }
  modal.classList.add('active');
}

function closeRoomModal() {
  document.getElementById('room-modal').classList.remove('active');
}

async function saveRoom() {
  var data = {
    MaHocKy: roomValue('room-hocky'),
    MaPhong: roomText('room-ma'),
    TenPhong: roomText('room-ten'),
    ToaNha: roomText('room-toanha') || null,
    SucChua: parseInt(roomValue('room-succhua'), 10) || null,
    LoaiPhong: roomValue('room-loai'),
    TrangThai: roomValue('room-trangthai') === 'true',
    MoTa: roomText('room-mota') || null
  };

  if (!data.MaHocKy) {
    showToast('Vui lòng chọn học kỳ áp dụng', 'error');
    return;
  }
  if (!data.MaPhong || !data.TenPhong) {
    showToast('Vui lòng nhập mã phòng và tên phòng', 'error');
    return;
  }

  try {
    var res = roomEditingId
      ? await apiFetch('/api/rooms/' + encodeURIComponent(roomEditingId), { method: 'PUT', body: data })
      : await apiFetch('/api/rooms', { method: 'POST', body: data });

    if (res.success) {
      showToast(res.message || 'Đã lưu phòng học', 'success');
      closeRoomModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu phòng học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteRoom(id) {
  if (!confirm('Bạn có chắc muốn xóa phòng học này?')) return;
  try {
    var res = await apiFetch('/api/rooms/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Đã xóa phòng học', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa phòng học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function setRoomClassesState(message) {
  var body = document.getElementById('room-classes-body');
  if (!body) return;
  body.innerHTML = '<tr><td colspan="5"><div class="empty-state">' + escapeRoomHtml(message) + '</div></td></tr>';
}

function renderRoomClasses(rows) {
  var body = document.getElementById('room-classes-body');
  if (!body) return;
  if (!rows || !rows.length) {
    setRoomClassesState('Không có lớp dùng phòng trong học kỳ này');
    return;
  }
  body.innerHTML = rows.map(function(row) {
    var course = [row.MaMonHoc, row.TenMonHoc].filter(Boolean).join(' - ');
    return '<tr>' +
      '<td class="mono">' + escapeRoomHtml(row.MaLop) + '</td>' +
      '<td>' + escapeRoomHtml(course || row.TenLop) + '</td>' +
      '<td>' + escapeRoomHtml(row.GiangVienDisplay || row.HoTenGiangVien) + '</td>' +
      '<td>' + escapeRoomHtml(row.LichHocDisplay) + '</td>' +
      '<td>' + escapeRoomHtml(row.SoLuongDaDangKy || 0) + '</td>' +
      '</tr>';
  }).join('');
}

async function loadRoomClasses(roomId, semesterId) {
  if (!roomId) return;
  setRoomClassesState('Đang tải dữ liệu...');
  try {
    var params = new URLSearchParams();
    if (semesterId) params.set('MaHocKy', semesterId);
    var res = await apiFetch('/api/rooms/' + encodeURIComponent(roomId) + '/classes?' + params.toString());
    if (!res.success) {
      setRoomClassesState(res.message || 'Không thể tải danh sách lớp');
      return;
    }
    renderRoomClasses(res.data || []);
  } catch (e) {
    setRoomClassesState('Lỗi kết nối');
  }
}

function openRoomClasses(roomId) {
  activeRoomClassesId = roomId;
  document.getElementById('room-classes-title').textContent = 'Lớp đang dùng phòng ' + roomId;
  setRoomSelectValue('room-classes-semester', selectedRoomSemester(), '');
  document.getElementById('room-classes-modal').classList.add('active');
  loadRoomClasses(activeRoomClassesId, roomValue('room-classes-semester'));
}

function reloadRoomClasses() {
  loadRoomClasses(activeRoomClassesId, roomValue('room-classes-semester'));
}

function closeRoomClassesModal() {
  document.getElementById('room-classes-modal').classList.remove('active');
  activeRoomClassesId = null;
}

function buildRoomDetail(record) {
  return {
    title: 'Chi tiết phòng ' + (record.MaPhong || ''),
    data: record,
    rows: [
      { label: 'Mã phòng', value: record.MaPhong },
      { label: 'Tên phòng', value: record.TenPhong },
      { label: 'Học kỳ', value: record.HocKyLabel || record.MaHocKy },
      { label: 'Tòa nhà', value: record.ToaNha },
      { label: 'Sức chứa', value: record.SucChua },
      { label: 'Loại phòng', value: formatRoomType(record.LoaiPhong) },
      { label: 'Lớp đang dùng', value: (record.ClassCount || 0) + ' lớp' },
      { label: 'Trạng thái dùng', value: record.IsInUse ? 'Đang có lớp' : 'Chưa có lớp' },
      { label: 'Trạng thái phòng', value: record.TrangThai === false ? 'Tạm khóa' : 'Đang dùng' },
      { label: 'Mô tả', value: record.MoTa },
      { label: 'Sửa bởi', value: record.NguoiCapNhatTen || record.NguoiCapNhat },
      { label: 'Sửa lúc', value: formatRoomDate(record.NgayCapNhat) }
    ]
  };
}

function initRoomPage() {
  if (window.AdminUI && !roomSearchCriterionReady) {
    roomSearchCriterionReady = true;
    var input = document.getElementById('search-input');
    var criterion = AdminUI.createSearchCriterionControl({
      input: input,
      id: 'room-search-field',
      value: input ? input.dataset.searchField : 'all',
      options: [
        { value: 'all', label: 'Tất cả' },
        { value: 'MaPhong', label: 'Mã phòng' },
        { value: 'TenPhong', label: 'Tên phòng' },
        { value: 'ToaNha', label: 'Tòa nhà' },
        { value: 'LoaiPhong', label: 'Loại phòng' },
        { value: 'MaHocKy', label: 'Học kỳ' }
      ]
    });
    if (criterion) criterion.addEventListener('change', applyRoomFilters);
    AdminUI.initReadonlyNotices(document);
    AdminUI.attachRowDetailHandlers({ table: '#rooms-table', buildDetail: buildRoomDetail });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initRoomPage);
else initRoomPage();
