var editingId = null;

function openModal(mode, cl) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa lớp học' : 'Thêm lớp học';
  document.getElementById('cl-malop').disabled = mode === 'edit';
  if (mode === 'edit' && cl) {
    editingId = cl.ma_lop || cl.MaLopMo || cl.MaLop;
    document.getElementById('cl-malop').value = cl.ma_lop || cl.MaLop || '';
    document.getElementById('cl-tenlop').value = cl.ten_lop || '';
    document.getElementById('cl-mamonhoc').value = cl.ma_mon_hoc || cl.MaMonHoc || '';
    document.getElementById('cl-giangvien').value = cl.giang_vien || cl.GiangVien || '';
    document.getElementById('cl-lichhoc').value = cl.lich_hoc || cl.LichHoc || '';
    document.getElementById('cl-phonghoc').value = cl.phong_hoc || cl.PhongHoc || '';
    document.getElementById('cl-soluong').value = cl.so_luong_toi_da || cl.SoLuongToiDa || 50;
  } else {
    document.getElementById('class-form').reset();
  }
  document.getElementById('class-modal').classList.add('active');
}

function closeModal() { document.getElementById('class-modal').classList.remove('active'); }

async function saveClass() {
  const data = {
    ma_lop: document.getElementById('cl-malop').value,
    ten_lop: document.getElementById('cl-tenlop').value,
    ma_mon_hoc: document.getElementById('cl-mamonhoc').value,
    giang_vien: document.getElementById('cl-giangvien').value,
    lich_hoc: document.getElementById('cl-lichhoc').value,
    phong_hoc: document.getElementById('cl-phonghoc').value,
    so_luong_toi_da: parseInt(document.getElementById('cl-soluong').value)
  };
  try {
    var res;
    if (editingId) {
      res = await apiFetch('/api/classes/' + editingId, { method: 'PUT', body: data });
    } else {
      res = await apiFetch('/api/classes', { method: 'POST', body: data });
    }
    if (res.success) {
      showToast(editingId ? 'Cập nhật thành công!' : 'Thêm lớp thành công!', 'success');
      closeModal(); setTimeout(() => location.reload(), 500);
    } else { showToast(res.message || 'Lỗi', 'error'); }
  } catch(e) { showToast('Lỗi kết nối', 'error'); }
}

async function deleteClass(id) {
  if (!confirm('Bạn có chắc muốn xóa lớp này?')) return;
  try {
    const res = await apiFetch('/api/classes/' + id, { method: 'DELETE' });
    if (res.success) { showToast('Đã xóa', 'success'); setTimeout(() => location.reload(), 500); }
    else { showToast(res.message || 'Lỗi', 'error'); }
  } catch(e) { showToast('Lỗi kết nối', 'error'); }
}

var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    window.location.href = '/admin/classes?page=1&search=' + encodeURIComponent(document.getElementById('search-input').value);
  }, 400);
}
