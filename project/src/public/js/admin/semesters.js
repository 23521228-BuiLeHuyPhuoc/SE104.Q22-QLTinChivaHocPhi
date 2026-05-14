var editingId = null;

function asDateInput(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

function openModal(mode, s) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa học kỳ' : 'Thêm học kỳ';
  document.getElementById('hk-ma').disabled = mode === 'edit';

  if (mode === 'edit' && s) {
    editingId = s.MaHocKy;
    document.getElementById('hk-ma').value = s.MaHocKy || '';
    document.getElementById('hk-ten').value = s.TenHocKy || '';
    document.getElementById('hk-manamhoc').value = s.MaNamHoc || '';
    document.getElementById('hk-loai').value = s.LoaiHocKy || 'Chính';
    document.getElementById('hk-thutu').value = s.ThuTu || 1;
    document.getElementById('hk-batdau').value = asDateInput(s.NgayBatDau);
    document.getElementById('hk-ketthuc').value = asDateInput(s.NgayKetThuc);
    document.getElementById('hk-hanhocphi').value = asDateInput(s.HanDongHocPhi);
    document.getElementById('hk-trangthai').value = s.TrangThai || 'Sắp diễn ra';
  } else {
    document.getElementById('semester-form').reset();
    document.getElementById('hk-loai').value = 'Chính';
    document.getElementById('hk-thutu').value = 1;
    document.getElementById('hk-trangthai').value = 'Sắp diễn ra';
  }

  document.getElementById('semester-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('semester-modal').classList.remove('active');
}

async function saveSemester() {
  var data = {
    MaHocKy: document.getElementById('hk-ma').value.trim(),
    TenHocKy: document.getElementById('hk-ten').value.trim(),
    MaNamHoc: document.getElementById('hk-manamhoc').value.trim(),
    LoaiHocKy: document.getElementById('hk-loai').value,
    ThuTu: parseInt(document.getElementById('hk-thutu').value, 10) || 1,
    NgayBatDau: document.getElementById('hk-batdau').value || null,
    NgayKetThuc: document.getElementById('hk-ketthuc').value || null,
    HanDongHocPhi: document.getElementById('hk-hanhocphi').value || null,
    TrangThai: document.getElementById('hk-trangthai').value
  };

  try {
    var res = editingId
      ? await apiFetch('/api/semesters/' + editingId, { method: 'PUT', body: data })
      : await apiFetch('/api/semesters', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cập nhật học kỳ thành công' : 'Thêm học kỳ thành công', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu học kỳ', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteSemester(id) {
  if (!confirm('Bạn có chắc muốn xóa học kỳ này?')) return;
  try {
    var res = await apiFetch('/api/semesters/' + id, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa học kỳ', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa học kỳ', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}
