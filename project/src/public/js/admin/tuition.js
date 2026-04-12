function formatVND(n) { return (n || 0).toLocaleString('vi-VN') + 'đ'; }
var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => applyFilters(), 400);
}
function applyFilters() {
  const search = document.getElementById('search-input').value;
  const status = document.getElementById('filter-status').value;
  let url = '/admin/tuition?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (status) url += '&status=' + encodeURIComponent(status);
  window.location.href = url;
}
