var editingAcademicYearId = null;
var academicYearSearchTimer = null;

function parseAcademicYearCode(value) {
  var match = String(value || '').trim().replace(/\s+/g, '').match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;

  var start = parseInt(match[1], 10);
  var end = parseInt(match[2], 10);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return null;

  return {
    MaNamHoc: start + '-' + end,
    NamBatDau: start,
    NamKetThuc: end
  };
}

function syncAcademicYearFromCode() {
  if (editingAcademicYearId) return;

  var parsed = parseAcademicYearCode(document.getElementById('year-ma').value);
  if (!parsed) return;

  document.getElementById('year-ma').value = parsed.MaNamHoc;
  document.getElementById('year-batdau').value = parsed.NamBatDau;
  document.getElementById('year-ketthuc').value = parsed.NamKetThuc;

  var nameInput = document.getElementById('year-ten');
  if (!nameInput.value.trim()) nameInput.value = parsed.MaNamHoc;
}

function openAcademicYearModal(mode, year) {
  editingAcademicYearId = null;
  document.getElementById('academic-year-modal-title').textContent = mode === 'edit' ? 'Sửa năm học' : 'Thêm năm học';
  document.getElementById('year-ma').disabled = mode === 'edit';

  if (mode === 'edit' && year) {
    editingAcademicYearId = year.MaNamHoc;
    document.getElementById('year-ma').value = year.MaNamHoc || '';
    document.getElementById('year-ten').value = year.TenNamHoc || '';
    document.getElementById('year-batdau').value = year.NamBatDau || '';
    document.getElementById('year-ketthuc').value = year.NamKetThuc || '';
    document.getElementById('year-trangthai').value = year.TrangThai === false ? 'false' : 'true';
  } else {
    document.getElementById('academic-year-form').reset();
    document.getElementById('year-trangthai').value = 'true';
  }

  document.getElementById('academic-year-modal').classList.add('active');
}

function closeAcademicYearModal() {
  document.getElementById('academic-year-modal').classList.remove('active');
}

function getAcademicYearPayload() {
  syncAcademicYearFromCode();
  return {
    MaNamHoc: document.getElementById('year-ma').value.trim(),
    TenNamHoc: document.getElementById('year-ten').value.trim(),
    NamBatDau: parseInt(document.getElementById('year-batdau').value, 10),
    NamKetThuc: parseInt(document.getElementById('year-ketthuc').value, 10),
    TrangThai: document.getElementById('year-trangthai').value === 'true'
  };
}

async function saveAcademicYear() {
  var data = getAcademicYearPayload();
  if (!data.MaNamHoc || !data.TenNamHoc) {
    showToast('Vui lòng nhập mã và tên năm học', 'error');
    return;
  }
  if (!Number.isInteger(data.NamBatDau) || !Number.isInteger(data.NamKetThuc) || data.NamKetThuc <= data.NamBatDau) {
    showToast('Năm kết thúc phải lớn hơn năm bắt đầu', 'error');
    return;
  }

  try {
    var url = editingAcademicYearId
      ? '/api/semesters/years/' + encodeURIComponent(editingAcademicYearId)
      : '/api/semesters/years';
    var res = await apiFetch(url, {
      method: editingAcademicYearId ? 'PUT' : 'POST',
      body: data
    });

    if (res.success) {
      showToast(editingAcademicYearId ? 'Cập nhật năm học thành công' : 'Thêm năm học thành công', 'success');
      closeAcademicYearModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu năm học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function deleteAcademicYear(id) {
  if (!confirm('Bạn có chắc muốn xóa năm học này?')) return;
  try {
    var res = await apiFetch('/api/semesters/years/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast('Đã xóa năm học', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa năm học', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function applyAcademicYearFilters() {
  var status = document.getElementById('status-filter').value;
  var search = document.getElementById('search-input').value.trim();
  var params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  params.set('page', '1');
  window.location.href = '/admin/academic-years?' + params.toString();
}

function debounceAcademicYearSearch() {
  clearTimeout(academicYearSearchTimer);
  academicYearSearchTimer = setTimeout(applyAcademicYearFilters, 400);
}
