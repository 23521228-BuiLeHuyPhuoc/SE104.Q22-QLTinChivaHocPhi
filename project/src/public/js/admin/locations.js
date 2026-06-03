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

function applyProvinceFilters() {
  var params = new URLSearchParams();
  params.set('page', '1');
  setLocationParam(params, 'search', getLocationValue('province-search-input'));
  setLocationParam(params, 'status', getLocationValue('province-filter-status'));
  redirectLocationPage('/admin/locations/provinces', params);
}

function debounceProvinceSearch() {
  clearTimeout(provinceSearchTimer);
  provinceSearchTimer = setTimeout(applyProvinceFilters, 400);
}

function clearProvinceFilters() {
  var search = document.getElementById('province-search-input');
  var status = document.getElementById('province-filter-status');
  if (search) search.value = '';
  if (status) status.value = '';
  applyProvinceFilters();
}

function applyWardFilters() {
  var params = new URLSearchParams();
  params.set('page', '1');
  setLocationParam(params, 'search', getLocationValue('ward-search-input'));
  setLocationParam(params, 'MaTinh', getLocationValue('ward-filter-province'));
  setLocationParam(params, 'KhuVuc', getLocationValue('ward-filter-area'));
  setLocationParam(params, 'status', getLocationValue('ward-filter-status'));
  redirectLocationPage('/admin/locations/wards', params);
}

function debounceWardSearch() {
  clearTimeout(wardSearchTimer);
  wardSearchTimer = setTimeout(applyWardFilters, 400);
}

function clearWardFilters() {
  var search = document.getElementById('ward-search-input');
  var province = document.getElementById('ward-filter-province');
  var area = document.getElementById('ward-filter-area');
  var status = document.getElementById('ward-filter-status');
  if (search) search.value = '';
  if (province) province.value = '';
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

function openProvinceModal(mode, province) {
  provinceEditingId = null;
  document.getElementById('province-modal-title').textContent = mode === 'edit' ? 'Sửa tỉnh/thành phố' : 'Thêm tỉnh/thành phố';
  document.getElementById('province-ma').disabled = mode === 'edit';

  if (mode === 'edit' && province) {
    provinceEditingId = province.MaTinh;
    document.getElementById('province-ma').value = province.MaTinh || '';
    document.getElementById('province-ten').value = province.TenTinh || '';
    document.getElementById('province-loai').value = province.LoaiTinh || 'Tỉnh';
    document.getElementById('province-trangthai').value = province.TrangThai === false ? 'false' : 'true';
  } else {
    document.getElementById('province-form').reset();
    document.getElementById('province-loai').value = 'Tỉnh';
    document.getElementById('province-trangthai').value = 'true';
  }

  document.getElementById('province-modal').classList.add('active');
}

function openProvinceAdd() {
  openProvinceModal('add');
}

function openProvinceEdit(button) {
  openProvinceModal('edit', JSON.parse(button.dataset.record));
}

function closeProvinceModal() {
  document.getElementById('province-modal').classList.remove('active');
}

async function saveProvince() {
  var data = {
    MaTinh: document.getElementById('province-ma').value.trim(),
    TenTinh: document.getElementById('province-ten').value.trim(),
    LoaiTinh: document.getElementById('province-loai').value,
    TrangThai: document.getElementById('province-trangthai').value === 'true'
  };

  if (!data.MaTinh || !data.TenTinh) {
    showToast('Vui lòng nhập mã tỉnh và tên tỉnh/thành phố', 'error');
    return;
  }

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
}

function openWardModal(mode, ward) {
  wardEditingId = null;
  document.getElementById('ward-modal-title').textContent = mode === 'edit' ? 'Sửa phường/xã' : 'Thêm phường/xã';
  document.getElementById('ward-ma').disabled = mode === 'edit';

  if (mode === 'edit' && ward) {
    wardEditingId = ward.MaPhuongXa;
    document.getElementById('ward-ma').value = ward.MaPhuongXa || '';
    document.getElementById('ward-ten').value = ward.TenPhuongXa || '';
    document.getElementById('ward-tinh').value = ward.MaTinh || '';
    document.getElementById('ward-loai').value = ward.Loai || 'Xã';
    document.getElementById('ward-khuvuc').value = ward.KhuVuc || 'KV1';
    document.getElementById('ward-trangthai').value = ward.TrangThai === false ? 'false' : 'true';
  } else {
    document.getElementById('ward-form').reset();
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
  openWardModal('edit', JSON.parse(button.dataset.record));
}

function closeWardModal() {
  document.getElementById('ward-modal').classList.remove('active');
}

async function saveWard() {
  var data = {
    MaPhuongXa: document.getElementById('ward-ma').value.trim(),
    TenPhuongXa: document.getElementById('ward-ten').value.trim(),
    MaTinh: document.getElementById('ward-tinh').value,
    Loai: document.getElementById('ward-loai').value,
    KhuVuc: document.getElementById('ward-khuvuc').value,
    TrangThai: document.getElementById('ward-trangthai').value === 'true'
  };

  if (!data.MaPhuongXa || !data.TenPhuongXa || !data.MaTinh) {
    showToast('Vui lòng nhập mã, tên phường/xã và tỉnh', 'error');
    return;
  }

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
}
