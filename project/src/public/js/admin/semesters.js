var editingId = null;

function openModal(mode, s) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa học kỳ' : 'Thêm học kỳ';
  if (mode === 'edit' && s) {
    editingId = s.ma_hoc_ky || s.MaHocKy;
    document.getElementById('hk-ten').value = s.ten_hoc_ky || s.TenHocKy || '';
    document.getElementById('hk-batdau').value = (s.ngay_bat_dau || s.NgayBatDau) ? (s.ngay_bat_dau || s.NgayBatDau).split('T')[0] : '';
    document.getElementById('hk-ketthuc').value = (s.ngay_ket_thuc || s.NgayKetThuc) ? (s.ngay_ket_thuc || s.NgayKetThuc).split('T')[0] : '';
    document.getElementById('hk-trangthai').value = s.trang_thai || s.TrangThai || 'Sắp tới';
  } else {
    document.getElementById('semester-form').reset();
  }
  document.getElementById('semester-modal').classList.add('active');
}

function closeModal() { document.getElementById('semester-modal').classList.remove('active'); }

async function saveSemester() {
  const data = {
    ten_hoc_ky: document.getElementById('hk-ten').value,
    ngay_bat_dau: document.getElementById('hk-batdau').value,
    ngay_ket_thuc: document.getElementById('hk-ketthuc').value,
    trang_thai: document.getElementById('hk-trangthai').value
  };
  try {
    var res;
    if (editingId) {
      res = await apiFetch('/api/semesters/' + editingId, { method: 'PUT', body: data });
    } else {
      res = await apiFetch('/api/semesters', { method: 'POST', body: data });
    }
    if (res.success) {
      showToast(editingId ? 'Cập nhật thành công!' : 'Thêm học kỳ thành công!', 'success');
      closeModal(); setTimeout(() => location.reload(), 500);
    } else { showToast(res.message || 'Lỗi', 'error'); }
  } catch(e) { showToast('Lỗi kết nối', 'error'); }
}

async function deleteSemester(id) {
  if (!confirm('Bạn có chắc muốn xóa học kỳ này?')) return;
  try {
    const res = await apiFetch('/api/semesters/' + id, { method: 'DELETE' });
    if (res.success) { showToast('Đã xóa', 'success'); setTimeout(() => location.reload(), 500); }
    else { showToast(res.message || 'Lỗi', 'error'); }
  } catch(e) { showToast('Lỗi kết nối', 'error'); }
}
