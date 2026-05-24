var searchTimer;

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var status = document.getElementById('filter-status').value;
  var url = '/admin/registrations?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (status) url += '&status=' + encodeURIComponent(status);
  window.location.href = url;
}

function closeRegistrationDetail() {
  var modal = document.getElementById('registration-detail-modal');
  if (modal) modal.classList.remove('active');
}

function registrationTypeLabel(type) {
  if (type === 'hoc_lai') return 'Học lại';
  if (type === 'hoc_cai_thien') return 'Học cải thiện';
  if (type === 'hoc_he') return 'Học hè';
  return 'Học mới';
}

function renderRegistrationDetail(data) {
  var content = document.getElementById('registration-detail-content');
  var registration = data && data.data ? data.data : data;
  if (!content || !registration) return;

  var details = registration.CHITIETDANGKY || [];
  var rows = details.map(function(item) {
    var course = item.MONHOC || (item.LOP && item.LOP.MONHOC) || {};
    var lop = item.LOP || {};
    return '<tr>' +
      '<td class="mono">' + (item.MaMonHoc || course.MaMonHoc || '-') + '</td>' +
      '<td>' + (course.TenMonHoc || '-') + '</td>' +
      '<td class="mono">' + (item.MaLop || lop.MaLop || '-') + '</td>' +
      '<td>' + (item.SoTinChi || 0) + '</td>' +
      '<td>' + registrationTypeLabel(item.LoaiDangKy) + '</td>' +
      '<td>' + formatCurrency(item.ThanhTien || 0) + '</td>' +
      '<td>' + (item.TrangThai || '-') + '</td>' +
    '</tr>';
  }).join('');

  content.innerHTML =
    '<div class="detail-grid">' +
      '<div><strong>Số phiếu</strong><span>' + registration.SoPhieu + '</span></div>' +
      '<div><strong>Sinh viên</strong><span>' + (registration.SINHVIEN ? registration.SINHVIEN.HoTen : registration.MaSv) + '</span></div>' +
      '<div><strong>Học kỳ</strong><span>' + (registration.HOCKY ? registration.HOCKY.TenHocKy : registration.MaHocKy) + '</span></div>' +
      '<div><strong>Tổng tín chỉ</strong><span>' + (registration.TongTinChi || 0) + '</span></div>' +
      '<div><strong>Tổng học phí</strong><span>' + formatCurrency(registration.TongTienPhaiDong || registration.TongTienDangKy || 0) + '</span></div>' +
    '</div>' +
    '<div class="table-container mt-3"><table class="data-table"><thead><tr>' +
      '<th>Mã môn</th><th>Tên môn</th><th>Lớp</th><th>Tín chỉ</th><th>Loại đăng ký</th><th>Học phí</th><th>Trạng thái</th>' +
    '</tr></thead><tbody>' + (rows || '<tr><td colspan="7"><div class="empty-state">Không có môn đăng ký</div></td></tr>') + '</tbody></table></div>';
}

async function openRegistrationDetail(soPhieu) {
  var modal = document.getElementById('registration-detail-modal');
  var content = document.getElementById('registration-detail-content');
  if (!modal || !content) return;
  modal.classList.add('active');
  content.textContent = 'Đang tải...';
  var res = await apiFetch('/api/registrations/' + encodeURIComponent(soPhieu));
  if (!res || res.success === false) {
    content.textContent = (res && res.message) || 'Không tải được chi tiết đăng ký';
    return;
  }
  renderRegistrationDetail(res);
}
