var editMode = false; var editId = null; var searchTimer = null;
function applyFilters() {
  var searchScope = document.getElementById('pricing-search-scope');
  var search = document.getElementById('pricing-search');
  var lm = document.getElementById('filter-loaimon').value;
  var lh = document.getElementById('filter-loaihoc').value;
  var hk = document.getElementById('filter-hocky').value;
  var tt = document.getElementById('filter-trangthai').value;
  var params = new URLSearchParams();
  params.set('page', '1');
  if (search && search.value.trim()) params.set('search', search.value.trim());
  if (searchScope && searchScope.value) params.set('searchScope', searchScope.value);
  if (lm) params.set('LoaiMon', lm);
  if (lh) params.set('LoaiHoc', lh);
  if (hk) params.set('MaHocKy', hk);
  if (tt) params.set('TrangThai', tt);
  window.location.href = '/admin/pricing?' + params.toString();
}
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 400);
}
function updatePricingSearchPlaceholder() {
  var scope = document.getElementById('pricing-search-scope');
  var input = document.getElementById('pricing-search');
  if (!scope || !input) return;
  var selectedOption = scope.options[scope.selectedIndex];
  if (selectedOption && selectedOption.dataset.placeholder) {
    input.placeholder = selectedOption.dataset.placeholder;
    return;
  }
  var placeholders = {
    loai_mon: 'Nhập LT, TH, lý thuyết hoặc thực hành',
    loai_hoc: 'Nhập học mới, học hè, cải thiện hoặc học lại',
    hoc_ky: 'Nhập mã học kỳ, tên học kỳ hoặc năm học'
  };
  input.placeholder = placeholders[scope.value] || 'Nhập từ khóa tìm kiếm';
}
document.addEventListener('DOMContentLoaded', updatePricingSearchPlaceholder);
function openModal(mode, data) {
  editMode = mode === 'edit'; editId = editMode ? data.id : null;
  document.getElementById('modal-title').textContent = editMode ? 'Sửa đơn giá' : 'Thêm đơn giá';
  document.getElementById('pr-loaimon').value = editMode ? data.LoaiMon : 'LT';
  document.getElementById('pr-loaihoc').value = editMode ? data.LoaiHoc : 'hoc_moi';
  document.getElementById('pr-dongia').value = editMode ? Number(data.DonGia || 0) : '';
  document.getElementById('pr-hocky').value = editMode ? (data.MaHocKy || '') : '';
  document.getElementById('pr-ghichu').value = editMode ? (data.GhiChu || '') : '';
  document.getElementById('pricing-modal').classList.add('active');
}
function closeModal() { document.getElementById('pricing-modal').classList.remove('active'); }
async function savePricing() {
  var body = { LoaiMon: document.getElementById('pr-loaimon').value, LoaiHoc: document.getElementById('pr-loaihoc').value, DonGia: document.getElementById('pr-dongia').value, MaHocKy: document.getElementById('pr-hocky').value || null, GhiChu: document.getElementById('pr-ghichu').value.trim() };
  if (!body.DonGia || Number(body.DonGia) <= 0) { showToast('Đơn giá phải lớn hơn 0', 'error'); return; }
  var url = editMode ? '/api/pricing/' + editId : '/api/pricing';
  var res = await apiFetch(url, { method: editMode ? 'PUT' : 'POST', body: body });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
async function deletePricing(id) {
  if (!confirm('Xóa đơn giá này?')) return;
  var res = await apiFetch('/api/pricing/' + id, { method: 'DELETE' });
  if (res.success) { showToast(res.message, 'success'); setTimeout(function() { location.reload(); }, 500); }
  else { showToast(res.message || 'Lỗi', 'error'); }
}
