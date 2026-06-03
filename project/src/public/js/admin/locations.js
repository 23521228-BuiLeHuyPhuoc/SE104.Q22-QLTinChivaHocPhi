var provinceSearchTimer = null;
var wardSearchTimer = null;
var provinceEditingId = null;
var wardEditingId = null;

function getLocationValue(id) {
  var el = document.getElementById(id);
  return el && el.value ? el.value.trim() : '';
}

function setLocationParam(params, key, value) {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    params.set(key, String(value).trim());
  }
}

function redirectLocationPage(path, params) {
  var query = params.toString();
  window.location.href = path + (query ? '?' + query : '');
}

function escapeLocationHtml(value) {
  return String(value === undefined || value === null || value === '' ? '-' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatLocationDateTime(value) {
  if (!value) return '-';
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function notifyReadonlyField(input) {
  var message = input && input.dataset && input.dataset.lockedMessage
    ? input.dataset.lockedMessage
    : 'Trường này không được sửa';
  showToast(message, 'info');
}

function getStatusText(value) {
  return value === false ? 'Tạm khóa' : 'Đang dùng';
}

function getUpdaterText(record) {
  return record.NguoiCapNhatTen || record.NguoiCapNhat || '-';
}

function detailField(label, value) {
  return '<div class="location-detail-item"><span>' + escapeLocationHtml(label) + '</span><strong>' + escapeLocationHtml(value) + '</strong></div>';
}

function openLocationDetail(title, fields) {
  var titleEl = document.getElementById('location-detail-title');
  var content = document.getElementById('location-detail-content');
  var modal = document.getElementById('location-detail-modal');
  if (!titleEl || !content || !modal) return;
  titleEl.textContent = title;
  content.innerHTML = fields.map(function(field) { return detailField(field.label, field.value); }).join('');
  modal.classList.add('active');
}

function closeLocationDetailModal() {
  var modal = document.getElementById('location-detail-modal');
  if (modal) modal.classList.remove('active');
}

function parseRecordFromElement(el) {
  try {
    return JSON.parse(el.dataset.record || '{}');
  } catch (error) {
    return {};
  }
}

function applyProvinceFilters() {
  var params = new URLSearchParams();
  params.set('page', '1');
  setLocationParam(params, 'searchField', getLocationValue('province-search-field'));
  setLocationParam(params, 'search', getLocationValue('province-search-input'));
  setLocationParam(params, 'LoaiTinh', getLocationValue('province-filter-type'));
  setLocationParam(params, 'status', getLocationValue('province-filter-status'));
  redirectLocationPage('/admin/locations/provinces', params);
}

function debounceProvinceSearch() {
  clearTimeout(provinceSearchTimer);
  provinceSearchTimer = setTimeout(applyProvinceFilters, 400);
}

function clearProvinceFilters() {
  var searchField = document.getElementById('province-search-field');
  var search = document.getElementById('province-search-input');
  var type = document.getElementById('province-filter-type');
  var status = document.getElementById('province-filter-status');
  if (searchField) searchField.value = 'all';
  if (search) search.value = '';
  if (type) type.value = '';
  if (status) status.value = '';
  applyProvinceFilters();
}

function applyWardFilters() {
  var params = new URLSearchParams();
  params.set('page', '1');
  setLocationParam(params, 'searchField', getLocationValue('ward-search-field'));
  setLocationParam(params, 'search', getLocationValue('ward-search-input'));
  setLocationParam(params, 'MaTinh', getLocationValue('ward-filter-province'));
  setLocationParam(params, 'Loai', getLocationValue('ward-filter-type'));
  setLocationParam(params, 'KhuVuc', getLocationValue('ward-filter-area'));
  setLocationParam(params, 'status', getLocationValue('ward-filter-status'));
  redirectLocationPage('/admin/locations/wards', params);
}

function debounceWardSearch() {
  clearTimeout(wardSearchTimer);
  wardSearchTimer = setTimeout(applyWardFilters, 400);
}

function clearWardFilters() {
  var searchField = document.getElementById('ward-search-field');
  var search = document.getElementById('ward-search-input');
  var province = document.getElementById('ward-filter-province');
  var type = document.getElementById('ward-filter-type');
  var area = document.getElementById('ward-filter-area');
  var status = document.getElementById('ward-filter-status');
  if (searchField) searchField.value = 'all';
  if (search) search.value = '';
  if (province) province.value = '';
  if (type) type.value = '';
  if (area) area.value = '';
  if (status) status.value = '';
  applyWardFilters();
}

function applyLocationFilters() {
  if (document.getElementById('province-section')) return applyProvinceFilters();
  if (document.getElementById('ward-section')) return applyWardFilters();
}

function debounceLocationSearch() {
  if (document.getElementById('province-section')) return debounceProvinceSearch();
  if (document.getElementById('ward-section')) return debounceWardSearch();
}

function setReadonlyCodeValue(id, value) {
  var input = document.getElementById(id);
  if (!input) return;
  input.readOnly = true;
  input.classList.add('readonly-control');
  input.value = value || 'Tự động khi lưu';
}

function openProvinceModal(mode, province) {
  provinceEditingId = null;
  document.getElementById('province-modal-title').textContent = mode === 'edit' ? 'Sửa tỉnh/thành phố' : 'Thêm tỉnh/thành phố';

  if (mode === 'edit' && province) {
    provinceEditingId = province.MaTinh;
    setReadonlyCodeValue('province-ma', province.MaTinh || '');
    document.getElementById('province-ten').value = province.TenTinh || '';
    document.getElementById('province-loai').value = province.LoaiTinh || 'Tỉnh';
    document.getElementById('province-trangthai').value = province.TrangThai === false ? 'false' : 'true';
  } else {
    document.getElementById('province-form').reset();
    setReadonlyCodeValue('province-ma', 'Tự động khi lưu');
    document.getElementById('province-loai').value = 'Tỉnh';
    document.getElementById('province-trangthai').value = 'true';
  }

  document.getElementById('province-modal').classList.add('active');
}

function openProvinceAdd() {
  openProvinceModal('add');
}

function openProvinceEdit(button) {
  openProvinceModal('edit', parseRecordFromElement(button));
}

function closeProvinceModal() {
  document.getElementById('province-modal').classList.remove('active');
}

async function saveProvince() {
  var data = {
    TenTinh: document.getElementById('province-ten').value.trim(),
    LoaiTinh: document.getElementById('province-loai').value,
    TrangThai: document.getElementById('province-trangthai').value === 'true'
  };

  if (!data.TenTinh) {
    showToast('Vui lòng nhập tên tỉnh/thành phố', 'error');
    return;
  }

  try {
    var res = provinceEditingId
      ? await apiFetch('/api/locations/provinces/' + encodeURIComponent(provinceEditingId), { method: 'PUT', body: data })
      : await apiFetch('/api/locations/provinces', { method: 'POST', body: data });

    if (res.success) {
      showToast(res.message || 'Đã lưu tỉnh/thành phố', 'success');
      closeProvinceModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu tỉnh/thành phố', 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối', 'error');
  }
}

function openProvinceDetail(row) {
  var p = parseRecordFromElement(row);
  openLocationDetail('Chi tiết tỉnh/thành phố', [
    { label: 'Mã tỉnh', value: p.MaTinh },
    { label: 'Tên tỉnh/thành phố', value: p.TenTinh },
    { label: 'Loại', value: p.LoaiTinh },
    { label: 'Số phường/xã', value: p._count ? p._count.PHUONGXA : 0 },
    { label: 'Trạng thái', value: getStatusText(p.TrangThai) },
    { label: 'Sửa bởi', value: getUpdaterText(p) },
    { label: 'Sửa lúc', value: formatLocationDateTime(p.NgayCapNhat) }
  ]);
}

async function deleteProvince(button) {
  var id = button.dataset.id;
  var name = button.dataset.name || id;
  if (!id || !window.confirm('Xóa tỉnh/thành phố "' + name + '"?')) return;

  try {
    var res = await apiFetch('/api/locations/provinces/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Đã xóa tỉnh/thành phố', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa tỉnh/thành phố', 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối', 'error');
  }
}

function openWardModal(mode, ward) {
  wardEditingId = null;
  document.getElementById('ward-modal-title').textContent = mode === 'edit' ? 'Sửa phường/xã' : 'Thêm phường/xã';

  if (mode === 'edit' && ward) {
    wardEditingId = ward.MaPhuongXa;
    setReadonlyCodeValue('ward-ma', ward.MaPhuongXa || '');
    document.getElementById('ward-ten').value = ward.TenPhuongXa || '';
    document.getElementById('ward-tinh').value = ward.MaTinh || '';
    document.getElementById('ward-loai').value = ward.Loai || 'Xã';
    document.getElementById('ward-khuvuc').value = ward.KhuVuc || 'KV1';
    document.getElementById('ward-trangthai').value = ward.TrangThai === false ? 'false' : 'true';
  } else {
    document.getElementById('ward-form').reset();
    setReadonlyCodeValue('ward-ma', 'Tự động khi lưu');
    document.getElementById('ward-loai').value = 'Xã';
    document.getElementById('ward-khuvuc').value = 'KV1';
    document.getElementById('ward-trangthai').value = 'true';
  }

  document.getElementById('ward-modal').classList.add('active');
}

function openWardAdd() {
  openWardModal('add');
}

function openWardEdit(button) {
  openWardModal('edit', parseRecordFromElement(button));
}

function closeWardModal() {
  document.getElementById('ward-modal').classList.remove('active');
}

async function saveWard() {
  var data = {
    TenPhuongXa: document.getElementById('ward-ten').value.trim(),
    MaTinh: document.getElementById('ward-tinh').value,
    Loai: document.getElementById('ward-loai').value,
    KhuVuc: document.getElementById('ward-khuvuc').value,
    TrangThai: document.getElementById('ward-trangthai').value === 'true'
  };

  if (!data.TenPhuongXa || !data.MaTinh) {
    showToast('Vui lòng nhập tên phường/xã và tỉnh', 'error');
    return;
  }

  try {
    var res = wardEditingId
      ? await apiFetch('/api/locations/wards/' + encodeURIComponent(wardEditingId), { method: 'PUT', body: data })
      : await apiFetch('/api/locations/wards', { method: 'POST', body: data });

    if (res.success) {
      showToast(res.message || 'Đã lưu phường/xã', 'success');
      closeWardModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lưu phường/xã', 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối', 'error');
  }
}

function openWardDetail(row) {
  var w = parseRecordFromElement(row);
  openLocationDetail('Chi tiết phường/xã', [
    { label: 'Mã phường/xã', value: w.MaPhuongXa },
    { label: 'Tên phường/xã', value: w.TenPhuongXa },
    { label: 'Loại', value: w.Loai },
    { label: 'Tỉnh/Thành phố', value: w.TINH ? (w.TINH.TenTinh + ' (' + w.MaTinh + ')') : w.MaTinh },
    { label: 'Khu vực', value: w.KhuVuc },
    { label: 'Trạng thái', value: getStatusText(w.TrangThai) },
    { label: 'Sửa bởi', value: getUpdaterText(w) },
    { label: 'Sửa lúc', value: formatLocationDateTime(w.NgayCapNhat) }
  ]);
}

async function deleteWard(button) {
  var id = button.dataset.id;
  var name = button.dataset.name || id;
  if (!id || !window.confirm('Xóa phường/xã "' + name + '"?')) return;

  try {
    var res = await apiFetch('/api/locations/wards/' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.success) {
      showToast(res.message || 'Đã xóa phường/xã', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xóa phường/xã', 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối', 'error');
  }
}
