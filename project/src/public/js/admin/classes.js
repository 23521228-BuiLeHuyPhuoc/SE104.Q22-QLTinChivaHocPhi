var editingId = null;

function openModal(mode, cl) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa lớp học' : 'Thêm lớp học';
  document.getElementById('cl-malop').disabled = mode === 'edit';

  if (mode === 'edit' && cl) {
    editingId = cl.MaLop;
    document.getElementById('cl-malop').value = cl.MaLop || '';
    document.getElementById('cl-tenlop').value = cl.TenLop || '';
    document.getElementById('cl-mamonhoc').value = cl.MaMonHoc || '';
    document.getElementById('cl-giangvien').value = cl.GiangVien || '';
    document.getElementById('cl-lichhoc').value = cl.LichHoc || '';
    document.getElementById('cl-phonghoc').value = cl.PhongHoc || '';
    document.getElementById('cl-soluong').value = cl.SoLuongToiDa || 50;
    document.getElementById('cl-mota').value = cl.MoTa || '';
  } else {
    document.getElementById('class-form').reset();
    document.getElementById('cl-soluong').value = 50;
  }

  document.getElementById('class-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('class-modal').classList.remove('active');
}

async function saveClass() {
  var data = {
    MaLop: document.getElementById('cl-malop').value.trim(),
    TenLop: document.getElementById('cl-tenlop').value.trim(),
    MaMonHoc: document.getElementById('cl-mamonhoc').value.trim(),
    GiangVien: document.getElementById('cl-giangvien').value.trim() || null,
    LichHoc: document.getElementById('cl-lichhoc').value.trim() || null,
    PhongHoc: document.getElementById('cl-phonghoc').value.trim() || null,
    SoLuongToiDa: parseInt(document.getElementById('cl-soluong').value, 10) || 50,
    MoTa: document.getElementById('cl-mota').value.trim() || null
  };

  try {
    var res = editingId
      ? await apiFetch('/api/classes/' + editingId, { method: 'PUT', body: data })
      : await apiFetch('/api/classes', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cập nhật lớp học thành công' : 'Thêm lớp học thành công', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu lớp học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteClass(id) {
  if (!confirm('Bạn có chắc muốn xóa lớp này?')) return;
  try {
    var res = await apiFetch('/api/classes/' + id, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa lớp học', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa lớp học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() {
    window.location.href = '/admin/classes?page=1&search=' + encodeURIComponent(document.getElementById('search-input').value);
  }, 400);
}
