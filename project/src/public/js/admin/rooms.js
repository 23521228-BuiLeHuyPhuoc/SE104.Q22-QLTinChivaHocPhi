var roomEditingId = null;
var roomSearchTimer = null;

function applyRoomFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input');
  var type = document.getElementById('filter-type');
  var status = document.getElementById('filter-status');

  params.set('page', '1');
  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (type && type.value) params.set('type', type.value);
  if (status && status.value) params.set('status', status.value);
  window.location.href = '/admin/rooms?' + params.toString();
}

function debounceRoomSearch() {
  clearTimeout(roomSearchTimer);
  roomSearchTimer = setTimeout(applyRoomFilters, 400);
}

function openRoomModal(mode, room) {
  roomEditingId = null;
  document.getElementById('room-modal-title').textContent = mode === 'edit' ? 'Sửa phòng học' : 'Thêm phòng học';
  document.getElementById('room-ma').disabled = mode === 'edit';

  if (mode === 'edit' && room) {
    roomEditingId = room.MaPhong;
    document.getElementById('room-ma').value = room.MaPhong || '';
    document.getElementById('room-ten').value = room.TenPhong || '';
    document.getElementById('room-toanha').value = room.ToaNha || '';
    document.getElementById('room-succhua').value = room.SucChua || 60;
    document.getElementById('room-loai').value = room.LoaiPhong || 'ly_thuyet';
    document.getElementById('room-trangthai').value = room.TrangThai === false ? 'false' : 'true';
    document.getElementById('room-mota').value = room.MoTa || '';
  } else {
    document.getElementById('room-form').reset();
    document.getElementById('room-succhua').value = 60;
    document.getElementById('room-loai').value = 'ly_thuyet';
    document.getElementById('room-trangthai').value = 'true';
  }

  document.getElementById('room-modal').classList.add('active');
}

function closeRoomModal() {
  document.getElementById('room-modal').classList.remove('active');
}

async function saveRoom() {
  var data = {
    MaPhong: document.getElementById('room-ma').value.trim(),
    TenPhong: document.getElementById('room-ten').value.trim(),
    ToaNha: document.getElementById('room-toanha').value.trim() || null,
    SucChua: parseInt(document.getElementById('room-succhua').value, 10) || null,
    LoaiPhong: document.getElementById('room-loai').value,
    TrangThai: document.getElementById('room-trangthai').value === 'true',
    MoTa: document.getElementById('room-mota').value.trim() || null
  };

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
