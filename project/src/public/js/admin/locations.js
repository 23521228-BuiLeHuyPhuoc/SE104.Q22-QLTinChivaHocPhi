var locationSearchTimer = null;
var provinceEditingId = null;
var wardEditingId = null;

function applyLocationFilters() {
  var params = new URLSearchParams();
  var tab = window.locationTab || 'provinces';
  var search = document.getElementById('search-input');
  var status = document.getElementById('filter-status');
  var province = document.getElementById('filter-province');
  var area = document.getElementById('filter-area');

  params.set('tab', tab);
  params.set('page', '1');

  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (status && status.value) params.set('status', status.value);
  if (province && province.value) params.set('MaTinh', province.value);
  if (area && area.value) params.set('KhuVuc', area.value);

  window.location.href = '/admin/locations?' + params.toString();
}

function debounceLocationSearch() {
  clearTimeout(locationSearchTimer);
  locationSearchTimer = setTimeout(applyLocationFilters, 400);
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
