var currentTuitionStudent = null;
var payableTuitionRows = [];
var blockedTuitionRows = [];

function tuitionEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function ensureTuitionStudent() {
  if (currentTuitionStudent) return currentTuitionStudent;
  var meRes = await apiFetch('/api/auth/me');
  if (meRes.success && meRes.data.student) currentTuitionStudent = meRes.data.student;
  return currentTuitionStudent;
}

function closePaymentModal() {
  var modal = document.getElementById('payment-modal');
  if (modal) modal.classList.remove('active');
}

function closeTuitionDetailModal() {
  var modal = document.getElementById('tuition-detail-modal');
  if (modal) modal.classList.remove('active');
}

function openPaymentModal(soPhieu, amount) {
  var modal = document.getElementById('payment-modal');
  document.getElementById('payment-so-phieu').value = soPhieu;
  document.getElementById('payment-amount').value = Math.max(Number(amount || 0), 0);
  document.getElementById('payment-result').innerHTML = '';
  if (modal) modal.classList.add('active');
}

function updatePayTuitionButton() {
  var button = document.getElementById('pay-tuition-now');
  if (!button) return;
  if (payableTuitionRows.length > 0) {
    button.disabled = false;
    button.textContent = 'Đóng học phí';
    button.title = 'Mở khoản học phí còn nợ gần nhất';
  } else if (blockedTuitionRows.length > 0) {
    button.disabled = true;
    button.textContent = 'Chưa mở thanh toán';
    button.title = blockedTuitionRows[0].reason || 'Chỉ có thể thanh toán sau khi kết thúc hạn đăng ký.';
  } else {
    button.disabled = true;
    button.textContent = 'Đã đóng đủ';
    button.title = 'Không còn khoản học phí cần đóng';
  }
}

function openFirstPayableTuition() {
  var item = payableTuitionRows[0];
  if (!item) {
    showToast('Bạn không còn khoản học phí cần đóng', 'success');
    return;
  }
  openPaymentModal(item.SoPhieu, item.remaining);
}

async function checkoutPayment() {
  var soPhieu = Number(document.getElementById('payment-so-phieu').value);
  var amount = Number(document.getElementById('payment-amount').value);
  var method = document.getElementById('payment-method').value;
  var result = document.getElementById('payment-result');
  if (!soPhieu || amount <= 0) {
    showToast('Số tiền thanh toán không hợp lệ', 'error');
    return;
  }
  var res = await apiFetch('/api/payments/checkout', {
    method: 'POST',
    body: { SoPhieu: soPhieu, SoTienThu: amount, method: method }
  });
  if (!res || res.success === false) {
    showToast((res && res.message) || 'Không tạo được thanh toán', 'error');
    return;
  }
  var data = res.data || {};
  if (data.checkoutUrl) {
    result.innerHTML = '<div class="empty-state">Đang chuyển đến cổng thanh toán...</div>';
    window.location.href = data.checkoutUrl;
    return;
  } else if (data.qrPayload) {
    result.innerHTML = '<img alt="QR chuyển khoản" style="max-width:260px;width:100%" src="' + data.qrPayload + '"><p class="text-muted">Thanh toán QR sẽ ở trạng thái chờ admin xác nhận.</p>';
  } else {
    var receiptStatus = data.receipt && data.receipt.TrangThai ? data.receipt.TrangThai : 'Chờ xác nhận';
    result.innerHTML = '<div class="empty-state">Đã tạo yêu cầu thanh toán. Trạng thái: ' + tuitionEscapeHtml(receiptStatus) + '.</div>';
  }
  showToast(res.message || 'Đã tạo yêu cầu thanh toán', 'success');
  loadMyTuition(1);
}

function tuitionStatusBadge(status, overdue) {
  if (status === 'Thành công') return 'badge-success';
  if (status === 'Chờ xác nhận') return 'badge-warning';
  if (status === 'Đã đóng đủ') return 'badge-success';
  if (status === 'Đóng một phần') return 'badge-warning';
  if (status === 'Chưa phát sinh') return 'badge-secondary';
  if (overdue || status === 'Quá hạn') return 'badge-error';
  return 'badge-error';
}

function renderTuitionDetail(data) {
  var courses = (data.courses || []).map(function(course) {
    return '<tr>' +
      '<td class="mono">' + tuitionEscapeHtml(course.MaMonHoc || '-') + '</td>' +
      '<td>' + tuitionEscapeHtml(course.TenMonHoc || '-') + '</td>' +
      '<td>' + tuitionEscapeHtml(course.SoTinChi || 0) + '</td>' +
      '<td>' + tuitionEscapeHtml(course.LoaiDangKyLabel || course.LoaiDangKy || '-') + '</td>' +
      '<td class="currency">' + formatCurrency(course.DonGia || 0) + '</td>' +
      '<td class="currency">' + formatCurrency(course.ThanhTien || 0) + '</td>' +
    '</tr>';
  }).join('');

  var payments = (data.payments || []).map(function(payment) {
    return '<tr>' +
      '<td class="mono">' + tuitionEscapeHtml(payment.SoPhieuThu || '-') + '</td>' +
      '<td>' + (payment.NgayLap ? formatDate(payment.NgayLap) : '-') + '</td>' +
      '<td class="currency">' + formatCurrency(payment.SoTienThu || 0) + '</td>' +
      '<td>' + tuitionEscapeHtml(payment.HinhThucThu || '-') + '</td>' +
      '<td><span class="badge ' + tuitionStatusBadge(payment.TrangThai, false) + '">' + tuitionEscapeHtml(payment.TrangThai || '-') + '</span></td>' +
    '</tr>';
  }).join('');

  var discountText = (data.discounts || []).map(function(item) {
    return [item.MaDoiTuong, item.TenDoiTuong, item.TiLeGiamHocPhi ? item.TiLeGiamHocPhi + '%' : ''].filter(Boolean).join(' - ');
  }).join('; ');

  return '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(data.TongTienPhaiDong || 0) + '</h3><p>Phải đóng</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(data.TongTienDaDong || 0) + '</h3><p>Đã đóng</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(data.conNo || data.ConNo || 0) + '</h3><p>Còn nợ</p></div></div>' +
    '</div>' +
    '<div class="info-list">' +
      '<div><span class="label">Học kỳ</span><span>' + tuitionEscapeHtml([data.TenHocKy, data.TenNamHoc].filter(Boolean).join(' - ')) + '</span></div>' +
      '<div><span class="label">Hạn đóng</span><span>' + (data.HanDongHocPhi ? formatDate(data.HanDongHocPhi) : '-') + '</span></div>' +
      '<div><span class="label">Trạng thái</span><span><span class="badge ' + tuitionStatusBadge(data.TrangThai, data.QuaHan) + '">' + tuitionEscapeHtml(data.TrangThai || '-') + '</span></span></div>' +
      '<div><span class="label">Miễn giảm</span><span>' + tuitionEscapeHtml(discountText || (data.TiLeGiam ? data.TiLeGiam + '%' : '-')) + ' (' + formatCurrency(data.TienMienGiam || 0) + ')</span></div>' +
    '</div>' +
    '<div class="card"><div class="card-header"><h3>Chi tiết môn học</h3></div><div class="table-container"><table class="data-table"><thead><tr><th>Mã môn</th><th>Tên môn</th><th>TC</th><th>Loại ĐK</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>' +
      (courses || '<tr><td colspan="6"><div class="empty-state">Không có chi tiết môn học</div></td></tr>') +
    '</tbody></table></div></div>' +
    '<div class="card"><div class="card-header"><h3>Lịch sử thanh toán</h3></div><div class="table-container"><table class="data-table"><thead><tr><th>Số phiếu</th><th>Ngày</th><th>Số tiền</th><th>Phương thức</th><th>Trạng thái</th></tr></thead><tbody>' +
      (payments || '<tr><td colspan="5"><div class="empty-state">Chưa có phiếu thu</div></td></tr>') +
    '</tbody></table></div></div>';
}

async function viewTuitionDetail(soPhieu) {
  var modal = document.getElementById('tuition-detail-modal');
  var title = document.getElementById('tuition-detail-title');
  var body = document.getElementById('tuition-detail-body');
  if (!modal || !body) return;
  modal.classList.add('active');
  if (title) title.textContent = 'Chi tiết học phí #' + soPhieu;
  body.innerHTML = '<div class="empty-state">Đang tải dữ liệu...</div>';
  try {
    var res = await apiFetch('/api/tuition/detail/' + encodeURIComponent(soPhieu));
    if (!res || res.success === false) {
      body.innerHTML = '<div class="empty-state text-error">' + tuitionEscapeHtml((res && res.message) || 'Không tải được chi tiết học phí') + '</div>';
      return;
    }
    body.innerHTML = renderTuitionDetail(res.data || {});
  } catch (e) {
    body.innerHTML = '<div class="empty-state text-error">Lỗi tải dữ liệu</div>';
  }
}

function renderTuitionSummary(summary) {
  document.getElementById('total-fee').textContent = formatCurrency(summary.totalFee || 0);
  document.getElementById('total-paid').textContent = formatCurrency(summary.totalPaid || 0);
  document.getElementById('total-remaining').textContent = formatCurrency(summary.totalRemaining || 0);
}

async function loadMyTuition(page) {
  var loading = document.getElementById('loading');
  var table = document.getElementById('tuition-table');
  var tbody = document.getElementById('tuition-list');
  if (loading) loading.classList.remove('hidden');
  if (table) table.classList.add('hidden');

  try {
    var student = await ensureTuitionStudent();
    if (!student) return;

    var res = await apiFetch('/api/tuition/student/' + student.MaSv + '?page=' + (page || 1));
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');

    renderTuitionSummary(res.summary || {});

    if (res.success && res.data && res.data.length > 0) {
      payableTuitionRows = [];
      blockedTuitionRows = [];
      tbody.innerHTML = res.data.map(function(t) {
        var fee = Number(t.TongTienPhaiDong || 0);
        var paid = Number(t.TongTienDaDong || 0);
        var remaining = Number(t.conNo || Math.max(fee - paid, 0));
        var canPay = remaining > 0 && t.CoTheThanhToan !== false;
        var unavailableReason = tuitionEscapeHtml(t.LyDoChuaTheThanhToan || 'Chỉ có thể thanh toán sau khi kết thúc hạn đăng ký.');
        var badgeClass = remaining <= 0 ? 'badge-success' : t.TrangThai === 'Quá hạn' ? 'badge-error' : paid > 0 ? 'badge-warning' : 'badge-error';
        var actionHtml = remaining <= 0
          ? '<button class="btn btn-sm btn-outline" type="button" onclick="viewTuitionDetail(' + t.SoPhieu + ')">Chi tiết</button>'
          : canPay
            ? '<button class="btn btn-sm btn-outline" type="button" onclick="viewTuitionDetail(' + t.SoPhieu + ')">Chi tiết</button> <button class="btn btn-sm btn-primary" type="button" onclick="openPaymentModal(' + t.SoPhieu + ', ' + remaining + ')">Đóng học phí</button>'
            : '<button class="btn btn-sm btn-outline" type="button" onclick="viewTuitionDetail(' + t.SoPhieu + ')">Chi tiết</button> <button class="btn btn-sm btn-outline" type="button" title="' + unavailableReason + '" disabled>Chưa mở thanh toán</button>';
        if (canPay) {
          payableTuitionRows.push({ SoPhieu: t.SoPhieu, remaining: remaining });
        } else if (remaining > 0) {
          blockedTuitionRows.push({ SoPhieu: t.SoPhieu, remaining: remaining, reason: t.LyDoChuaTheThanhToan });
        }
        return '<tr>' +
          '<td>' + tuitionEscapeHtml(t.TenHocKy || '-') + (t.TenNamHoc ? '<small>' + tuitionEscapeHtml(t.TenNamHoc) + '</small>' : '') + '</td>' +
          '<td class="currency">' + formatCurrency(fee) + '</td>' +
          '<td class="currency">' + formatCurrency(paid) + '</td>' +
          '<td class="currency ' + (remaining > 0 ? 'text-danger' : 'text-success') + '">' + formatCurrency(remaining) + '</td>' +
          '<td>' + (t.HanDongHocPhi ? formatDate(t.HanDongHocPhi) : '-') + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + tuitionEscapeHtml(t.TrangThai || '-') + '</span></td>' +
          '<td>' + actionHtml + '</td>' +
        '</tr>';
      }).join('');
    } else {
      payableTuitionRows = [];
      blockedTuitionRows = [];
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Không có dữ liệu học phí</div></td></tr>';
    }

    updatePayTuitionButton();
    renderClientPagination('tuition-pagination', res.pagination, 'loadMyTuition');
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
    renderTuitionSummary({});
    payableTuitionRows = [];
    blockedTuitionRows = [];
    updatePayTuitionButton();
    renderClientPagination('tuition-pagination', null, 'loadMyTuition');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadMyTuition(1);
});
