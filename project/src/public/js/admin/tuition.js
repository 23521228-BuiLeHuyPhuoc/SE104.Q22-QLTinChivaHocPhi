var searchTimer;

function tuitionSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value.trim();
  var searchField = document.getElementById('search-field') ? document.getElementById('search-field').value : 'all';
  var status = document.getElementById('filter-status').value;
  var semester = document.getElementById('filter-semester').value;
  var url = '/admin/tuition?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (searchField && searchField !== 'all') url += '&searchField=' + encodeURIComponent(searchField);
  if (semester) url += '&MaHocKy=' + encodeURIComponent(semester);
  if (status) url += '&status=' + encodeURIComponent(status);
  navigatePageContent(url);
}

function closeTuitionDetail() {
  var modal = document.getElementById('tuition-detail-modal');
  if (modal) modal.classList.remove('active');
}

function tuitionBadgeClass(status, overdue) {
  if (status === 'Đã đóng đủ') return 'badge-success';
  if (status === 'Đóng một phần') return 'badge-warning';
  if (status === 'Chưa phát sinh') return 'badge-secondary';
  if (overdue || status === 'Quá hạn') return 'badge-error';
  return 'badge-error';
}

function renderTuitionDetail(data) {
  var courseRows = (data.courses || []).map(function(course) {
    return '<tr>' +
      '<td class="mono">' + tuitionSafe(course.MaMonHoc || '-') + '</td>' +
      '<td>' + tuitionSafe(course.TenMonHoc || '-') + '</td>' +
      '<td>' + tuitionSafe(course.SoTinChi || 0) + '</td>' +
      '<td>' + tuitionSafe(course.LoaiDangKyLabel || course.LoaiDangKy || '-') + '</td>' +
      '<td class="currency">' + formatCurrency(course.DonGia || 0) + '</td>' +
      '<td class="currency">' + formatCurrency(course.ThanhTien || 0) + '</td>' +
    '</tr>';
  }).join('');

  var paymentRows = (data.payments || []).map(function(payment) {
    var status = payment.TrangThai || '-';
    return '<tr>' +
      '<td class="mono">' + tuitionSafe(payment.SoPhieuThu || '-') + '</td>' +
      '<td>' + (payment.NgayLap ? formatDate(payment.NgayLap) : '-') + '</td>' +
      '<td class="currency">' + formatCurrency(payment.SoTienThu || 0) + '</td>' +
      '<td>' + tuitionSafe(payment.HinhThucThu || '-') + '</td>' +
      '<td>' + tuitionSafe(payment.NguoiThu || '-') + '</td>' +
      '<td><span class="badge ' + tuitionBadgeClass(status, false) + '">' + tuitionSafe(status) + '</span></td>' +
    '</tr>';
  }).join('');

  var discountHtml = '';
  if (Number(data.TienMienGiam || 0) > 0 || (data.discounts || []).length) {
    discountHtml = '<div class="info-list">' +
      '<div><span class="label">Miễn giảm</span><span>' +
      tuitionSafe((data.discounts || []).map(function(item) {
        return [item.MaDoiTuong, item.TenDoiTuong, item.TiLeGiamHocPhi ? item.TiLeGiamHocPhi + '%' : ''].filter(Boolean).join(' - ');
      }).join('; ') || (data.TiLeGiam ? data.TiLeGiam + '%' : '-')) +
      ' (' + formatCurrency(data.TienMienGiam || 0) + ')</span></div>' +
    '</div>';
  }

  return '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(data.TongTienPhaiDong || 0) + '</h3><p>Phải đóng</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(data.TongTienDaDong || 0) + '</h3><p>Đã đóng</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(data.conNo || data.ConNo || 0) + '</h3><p>Còn nợ</p></div></div>' +
    '</div>' +
    '<div class="info-list">' +
      '<div><span class="label">Sinh viên</span><span>' + tuitionSafe(data.MaSv) + ' - ' + tuitionSafe(data.HoTen) + '</span></div>' +
      '<div><span class="label">Học kỳ</span><span>' + tuitionSafe([data.TenHocKy, data.TenNamHoc].filter(Boolean).join(' - ')) + '</span></div>' +
      '<div><span class="label">Hạn đóng</span><span>' + (data.HanDongHocPhi ? formatDate(data.HanDongHocPhi) : '-') + '</span></div>' +
      '<div><span class="label">Trạng thái</span><span><span class="badge ' + tuitionBadgeClass(data.TrangThai, data.QuaHan) + '">' + tuitionSafe(data.TrangThai) + '</span></span></div>' +
    '</div>' +
    discountHtml +
    '<div class="card"><div class="card-header"><h3>Chi tiết môn đăng ký</h3></div><div class="table-container"><table class="data-table">' +
      '<thead><tr><th>Mã môn</th><th>Tên môn</th><th>TC</th><th>Loại ĐK</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>' +
      '<tbody>' + (courseRows || '<tr><td colspan="6"><div class="empty-state">Không có môn học</div></td></tr>') + '</tbody>' +
    '</table></div></div>' +
    '<div class="card"><div class="card-header"><h3>Phiếu thu</h3></div><div class="table-container"><table class="data-table">' +
      '<thead><tr><th>Số phiếu</th><th>Ngày lập</th><th>Số tiền</th><th>Phương thức</th><th>Người thu</th><th>Trạng thái</th></tr></thead>' +
      '<tbody>' + (paymentRows || '<tr><td colspan="6"><div class="empty-state">Chưa có phiếu thu</div></td></tr>') + '</tbody>' +
    '</table></div></div>';
}

async function viewTuitionDetail(id) {
  var modal = document.getElementById('tuition-detail-modal');
  var title = document.getElementById('tuition-detail-title');
  var body = document.getElementById('tuition-detail-body');
  if (!modal || !body) return;
  modal.classList.add('active');
  body.innerHTML = '<div class="empty-state">Đang tải dữ liệu...</div>';
  try {
    var res = await apiFetch('/api/tuition/' + encodeURIComponent(id));
    if (!res || res.success === false) {
      body.innerHTML = '<div class="empty-state text-error">' + tuitionSafe((res && res.message) || 'Không tải được chi tiết học phí') + '</div>';
      return;
    }
    if (title) title.textContent = 'Chi tiết học phí #' + id;
    body.innerHTML = renderTuitionDetail(res.data || {});
  } catch (e) {
    body.innerHTML = '<div class="empty-state text-error">Lỗi tải dữ liệu</div>';
  }
}
