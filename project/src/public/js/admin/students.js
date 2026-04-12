var editingId = null;

// Load majors for dropdown
(async function() {
  try {
    const res = await apiFetch('/api/students/majors');
    if (res.success) {
      const select = document.getElementById('sv-nganh');
      res.data.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.MaNganh || m.ma_nganh;
        opt.textContent = (m.TenNganh || m.ten_nganh) + ' (' + (m.KHOA ? m.KHOA.TenKhoa : m.ten_khoa) + ')';
        select.appendChild(opt);
      });
    }
  } catch(e) {}
})();

function openModal(mode, sv) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sửa sinh viên' : 'Thêm sinh viên';
  document.getElementById('sv-mssv').disabled = mode === 'edit';
  if (mode === 'edit' && sv) {
    editingId = sv.ma_sv || sv.MaSv;
    document.getElementById('sv-mssv').value = sv.ma_sv || sv.MaSv || '';
    document.getElementById('sv-hoten').value = sv.ho_ten || sv.HoTen || '';
    document.getElementById('sv-email').value = sv.email || sv.Email || '';
    document.getElementById('sv-sdt').value = sv.so_dien_thoai || sv.Sdt || '';
    document.getElementById('sv-ngaysinh').value = (sv.ngay_sinh || sv.NgaySinh) ? (sv.ngay_sinh || sv.NgaySinh).split('T')[0] : '';
    document.getElementById('sv-gioitinh').value = sv.gioi_tinh || sv.GioiTinh || 'Nam';
    document.getElementById('sv-cmnd').value = sv.so_cmnd || sv.Cccd || '';
    document.getElementById('sv-dantoc').value = sv.dan_toc || sv.MaDanToc || 'Kinh';
    document.getElementById('sv-diachi').value = sv.dia_chi || sv.DiaChiLienHe || '';
    document.getElementById('sv-nganh').value = sv.ma_nganh || sv.MaNganh || '';
    document.getElementById('sv-trangthai').value = sv.trang_thai || sv.TrangThai || 'Đang học';
  } else {
    document.getElementById('student-form').reset();
  }
  document.getElementById('student-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('student-modal').classList.remove('active');
}

async function saveStudent() {
  const data = {
    ma_sv: document.getElementById('sv-mssv').value,
    ho_ten: document.getElementById('sv-hoten').value,
    email: document.getElementById('sv-email').value,
    so_dien_thoai: document.getElementById('sv-sdt').value,
    ngay_sinh: document.getElementById('sv-ngaysinh').value,
    gioi_tinh: document.getElementById('sv-gioitinh').value,
    so_cmnd: document.getElementById('sv-cmnd').value,
    dan_toc: document.getElementById('sv-dantoc').value,
    dia_chi: document.getElementById('sv-diachi').value,
    ma_nganh: document.getElementById('sv-nganh').value,
    trang_thai: document.getElementById('sv-trangthai').value
  };

  try {
    var res;
    if (editingId) {
      res = await apiFetch('/api/students/' + editingId, { method: 'PUT', body: data });
    } else {
      res = await apiFetch('/api/students', { method: 'POST', body: data });
    }
    if (res.success) {
      showToast(editingId ? 'Cập nhật thành công!' : 'Thêm sinh viên thành công!', 'success');
      closeModal();
      setTimeout(() => location.reload(), 500);
    } else {
      showToast(res.message || 'Lỗi', 'error');
    }
  } catch(e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteStudent(maSv) {
  if (!confirm('Bạn có chắc muốn xóa sinh viên ' + maSv + '?')) return;
  try {
    const res = await apiFetch('/api/students/' + maSv, { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa sinh viên', 'success');
      setTimeout(() => location.reload(), 500);
    } else {
      showToast(res.message || 'Lỗi', 'error');
    }
  } catch(e) {
    showToast('Lỗi kết nối', 'error');
  }
}

var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => applyFilters(), 400);
}

function applyFilters() {
  const search = document.getElementById('search-input').value;
  const status = document.getElementById('filter-status').value;
  let url = '/admin/students?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (status) url += '&status=' + encodeURIComponent(status);
  window.location.href = url;
}
