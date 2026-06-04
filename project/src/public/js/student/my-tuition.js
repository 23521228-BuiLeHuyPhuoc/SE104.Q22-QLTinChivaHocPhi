var currentTuitionStudent = null;
var payableTuitionRows = [];
var blockedTuitionRows = [];
var currentReceiptDetail = null;

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

function closeReceiptDetailModal() {
  var modal = document.getElementById('receipt-detail-modal');
  if (modal) modal.classList.remove('active');
  currentReceiptDetail = null;
}

function openPaymentModal(receiptId, amount) {
  var modal = document.getElementById('payment-modal');
  var maxAmount = Math.max(Number(amount || 0), 0);
  document.getElementById('payment-receipt-id').value = receiptId;
  document.getElementById('payment-receipt-amount').value = maxAmount;
  document.getElementById('payment-amount-label').textContent = formatCurrency(maxAmount);
  var amountInput = document.getElementById('payment-amount');
  if (amountInput) {
    amountInput.max = String(maxAmount);
    amountInput.value = String(maxAmount);
  }
  var amountHint = document.getElementById('payment-amount-hint');
  if (amountHint) amountHint.textContent = 'Có thể thanh toán một phần, nhỏ hơn hoặc bằng ' + formatCurrency(maxAmount) + '.';
  document.getElementById('payment-result').innerHTML = '';
  var mode = document.getElementById('payment-mode');
  if (mode) mode.value = 'full';
  updatePaymentModeHint();
  if (modal) modal.classList.add('active');
}

function updatePaymentModeHint() {
  var mode = document.getElementById('payment-mode');
  var hint = document.getElementById('payment-mode-hint');
  if (!hint) return;
  if (mode && mode.value === 'partial') {
    hint.textContent = 'Sinh viên có thể nhập số tiền muốn thanh toán, không vượt quá số tiền còn nợ.';
    return;
  }
  hint.textContent = 'Mặc định thanh toán toàn bộ số tiền còn nợ của phiếu thu.';
}

function updatePayTuitionButton() {
  var button = document.getElementById('pay-tuition-now');
  if (!button) return;
  if (payableTuitionRows.length > 0) {
    button.disabled = false;
    button.textContent = 'Thanh toán phiếu thu';
    button.title = 'Mở phiếu thu còn nợ gần nhất';
  } else if (blockedTuitionRows.length > 0) {
    button.disabled = true;
    var reason = blockedTuitionRows[0].reason || '';
    button.textContent = blockedTuitionRows[0].missingReceipt || reason.indexOf('phiếu thu') >= 0 ? 'Chưa có phiếu thu' : 'Chưa thể thanh toán';
    button.title = reason || 'Chỉ thanh toán được khi có phiếu thu do admin tạo.';
  } else {
    button.disabled = true;
    button.textContent = 'Đã đóng đủ';
    button.title = 'Không còn khoản học phí cần đóng';
  }
}

function openFirstPayableTuition() {
  var item = payableTuitionRows[0];
  if (!item) {
    showToast('Bạn chưa có phiếu thu cần thanh toán', 'success');
    return;
  }
  openPaymentModal(item.SoPhieuThu, item.remaining);
}

async function checkoutPayment() {
  var receiptId = Number(document.getElementById('payment-receipt-id').value);
  var maxAmount = Number(document.getElementById('payment-receipt-amount').value || 0);
  var amountInput = document.getElementById('payment-amount');
  var amount = Number(amountInput ? amountInput.value : maxAmount);
  var method = document.getElementById('payment-method').value;
  var paymentMode = document.getElementById('payment-mode') ? document.getElementById('payment-mode').value : 'full';
  var result = document.getElementById('payment-result');
  if (!receiptId) {
    showToast('Không tìm thấy phiếu thu cần thanh toán', 'error');
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > maxAmount) {
    showToast('Số tiền thanh toán phải lớn hơn 0 và không vượt quá số tiền còn nợ', 'error');
    return;
  }
  var res = await apiFetch('/api/payments/' + encodeURIComponent(receiptId) + '/checkout', {
    method: 'POST',
    body: { method: method, paymentMode: paymentMode, SoTienThu: amount }
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
  if (status === 'Chưa thanh toán') return 'badge-warning';
  if (status === 'Đã đóng đủ') return 'badge-success';
  if (status === 'Đóng một phần') return 'badge-warning';
  if (status === 'Chưa phát sinh') return 'badge-secondary';
  if (overdue || status === 'Quá hạn') return 'badge-error';
  return 'badge-error';
}

function formatTuitionPercent(value) {
  var number = Number(value || 0);
  if (!Number.isFinite(number)) number = 0;
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + '%';
}

function formatTuitionDiscountAmount(value) {
  var amount = Math.max(Number(value || 0), 0);
  return (amount > 0 ? '-' : '') + formatCurrency(amount);
}

function canCheckoutReceiptStatus(status) {
  return status === 'Chưa thanh toán' || status === 'Thất bại';
}

function receiptSemesterText(receipt) {
  return receipt.HocKyDisplay || [receipt.TenHocKy, receipt.TenNamHoc].filter(Boolean).join(' - ') || receipt.MaHocKy || '-';
}

function renderReceiptDetail(receipt) {
  var status = receipt.TrangThai || '-';
  var canPay = canCheckoutReceiptStatus(status);
  var transactions = receipt.LanThanhToan || [];
  var transactionRows = transactions.map(function(item) {
    return '<tr>' +
      '<td class="mono">' + tuitionEscapeHtml(item.MaGiaoDichThanhToan || '-') + '</td>' +
      '<td>' + (item.NgayTao ? formatDate(item.NgayTao) : '-') + '</td>' +
      '<td class="currency">' + formatCurrency(item.SoTienThanhToan || 0) + '</td>' +
      '<td>' + tuitionEscapeHtml(item.HinhThucThanhToan || 'Chưa chọn') + '</td>' +
      '<td><span class="badge ' + tuitionStatusBadge(item.TrangThai, false) + '">' + tuitionEscapeHtml(item.TrangThai || '-') + '</span></td>' +
    '</tr>';
  }).join('');
  return '<div class="info-list">' +
      '<div><span class="label">Số phiếu thu</span><span class="mono">' + tuitionEscapeHtml(receipt.SoPhieuThu || '-') + '</span></div>' +
      '<div><span class="label">Phiếu đăng ký</span><span class="mono">' + tuitionEscapeHtml(receipt.SoPhieuDangKy || '-') + '</span></div>' +
      '<div><span class="label">Học kỳ</span><span>' + tuitionEscapeHtml(receiptSemesterText(receipt)) + '</span></div>' +
      '<div><span class="label">Số tiền phiếu thu</span><span>' + formatCurrency(receipt.SoTienThu || 0) + '</span></div>' +
      '<div><span class="label">Đã thanh toán</span><span>' + formatCurrency(receipt.TongTienDaThanhToan || 0) + '</span></div>' +
      '<div><span class="label">Chờ xác nhận</span><span>' + formatCurrency(receipt.TongTienDangChoXacNhan || 0) + '</span></div>' +
      '<div><span class="label">Còn nợ phiếu thu</span><span>' + formatCurrency(receipt.ConNoPhieuThu || 0) + '</span></div>' +
      '<div><span class="label">Phương thức</span><span>' + tuitionEscapeHtml(receipt.HinhThucThu || 'Chưa chọn') + '</span></div>' +
      '<div><span class="label">Mã giao dịch</span><span>' + tuitionEscapeHtml(receipt.MaGiaoDich || '-') + '</span></div>' +
      '<div><span class="label">Ngày lập</span><span>' + (receipt.NgayLap ? formatDate(receipt.NgayLap) : '-') + '</span></div>' +
      '<div><span class="label">Ngày xác nhận</span><span>' + (receipt.NgayXacNhan ? formatDate(receipt.NgayXacNhan) : '-') + '</span></div>' +
      '<div><span class="label">Trạng thái</span><span><span class="badge ' + tuitionStatusBadge(status, false) + '">' + tuitionEscapeHtml(status) + '</span></span></div>' +
      '<div><span class="label">Ghi chú</span><span>' + tuitionEscapeHtml(receipt.GhiChu || '-') + '</span></div>' +
    '</div>' +
    '<div class="card"><div class="card-header"><h3>Lần thanh toán</h3></div><div class="table-container"><table class="data-table"><thead><tr><th>Mã lần</th><th>Ngày tạo</th><th>Số tiền</th><th>Phương thức</th><th>Trạng thái</th></tr></thead><tbody>' +
      (transactionRows || '<tr><td colspan="5"><div class="empty-state">Chưa có lần thanh toán</div></td></tr>') +
    '</tbody></table></div></div>' +
    (canPay ? '<div class="empty-state mt-3">Có thể thanh toán tiếp với số tiền nhỏ hơn hoặc bằng số tiền còn nợ.</div>' : '');
}

async function openReceiptDetailModal(receiptId) {
  var modal = document.getElementById('receipt-detail-modal');
  var title = document.getElementById('receipt-detail-title');
  var body = document.getElementById('receipt-detail-body');
  var footer = document.getElementById('receipt-detail-footer');
  if (!modal || !body || !receiptId) return;
  currentReceiptDetail = null;
  modal.classList.add('active');
  if (title) title.textContent = 'Phiếu thu #' + receiptId;
  body.innerHTML = '<div class="empty-state">Đang tải dữ liệu...</div>';
  if (footer) footer.innerHTML = '<button class="btn btn-outline" type="button" onclick="closeReceiptDetailModal()">Đóng</button>';
  try {
    var res = await apiFetch('/api/payments/' + encodeURIComponent(receiptId));
    if (!res || res.success === false) {
      body.innerHTML = '<div class="empty-state text-error">' + tuitionEscapeHtml((res && res.message) || 'Không tải được phiếu thu') + '</div>';
      return;
    }
    currentReceiptDetail = res.data || {};
    body.innerHTML = renderReceiptDetail(currentReceiptDetail);
    if (footer) {
      var remainingAmount = Number(currentReceiptDetail.ConNoPhieuThu || currentReceiptDetail.SoTienThanhToanToiDa || currentReceiptDetail.SoTienThu || 0);
      var payButton = canCheckoutReceiptStatus(currentReceiptDetail.TrangThai)
        ? '<button class="btn btn-primary" type="button" onclick="openPaymentModal(' + Number(currentReceiptDetail.SoPhieuThu || 0) + ', ' + remainingAmount + ')">Thanh toán</button>'
        : '';
      footer.innerHTML = '<button class="btn btn-outline" type="button" onclick="closeReceiptDetailModal()">Đóng</button>' + payButton;
    }
  } catch (e) {
    body.innerHTML = '<div class="empty-state text-error">Lỗi tải phiếu thu</div>';
  }
}

function renderTuitionDetail(data) {
  var tuitionFormula = data.CongThucHocPhi || {};
  var courseTotal = Number(tuitionFormula.TongTienMonHoc || data.TongTienDangKy || 0);
  var discountRate = Number(tuitionFormula.TiLeGiam || data.TiLeGiam || 0);
  var discountAmount = Number(tuitionFormula.TienMienGiam || data.TienMienGiam || 0);
  var amountDue = Number(tuitionFormula.TongTienSauMienGiam || data.TongTienPhaiDong || Math.max(courseTotal - discountAmount, 0));
  var appliedDiscount = data.DoiTuongMienGiam || (data.discounts || [])[0] || null;
  var discountLabel = appliedDiscount
    ? [appliedDiscount.MaDoiTuong, appliedDiscount.TenDoiTuong].filter(Boolean).join(' - ')
    : '-';

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
    var status = payment.TrangThai || '-';
    var paymentRemaining = Number(payment.ConNoPhieuThu || payment.SoTienThanhToanToiDa || payment.SoTienThu || 0);
    var action = '<button class="btn btn-sm btn-outline" type="button" onclick="openReceiptDetailModal(' + Number(payment.SoPhieuThu || 0) + ')">Xem phiếu thu</button>';
    if (canCheckoutReceiptStatus(status)) {
      action += ' <button class="btn btn-sm btn-primary" type="button" onclick="openPaymentModal(' + Number(payment.SoPhieuThu || 0) + ', ' + paymentRemaining + ')">Thanh toán</button>';
    }
    return '<tr>' +
      '<td class="mono">' + tuitionEscapeHtml(payment.SoPhieuThu || '-') + '</td>' +
      '<td>' + (payment.NgayLap ? formatDate(payment.NgayLap) : '-') + '</td>' +
      '<td class="currency">' + formatCurrency(payment.SoTienThu || 0) + '</td>' +
      '<td>' + tuitionEscapeHtml(payment.HinhThucThu || 'Chưa chọn') + '</td>' +
      '<td><span class="badge ' + tuitionStatusBadge(status, false) + '">' + tuitionEscapeHtml(status) + '</span></td>' +
      '<td>' + action + '</td>' +
    '</tr>';
  }).join('');

  return '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(courseTotal) + '</h3><p>Tổng tiền môn</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatTuitionDiscountAmount(discountAmount) + '</h3><p>Miễn giảm ' + formatTuitionPercent(discountRate) + '</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(amountDue) + '</h3><p>Phải đóng</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(data.TongTienDaDong || 0) + '</h3><p>Đã đóng</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(data.conNo || data.ConNo || 0) + '</h3><p>Còn nợ</p></div></div>' +
    '</div>' +
    '<div class="info-list">' +
      '<div><span class="label">Học kỳ</span><span>' + tuitionEscapeHtml([data.TenHocKy, data.TenNamHoc].filter(Boolean).join(' - ')) + '</span></div>' +
      '<div><span class="label">Bắt đầu đóng</span><span>' + (data.NgayBatDauDongHocPhi ? formatDate(data.NgayBatDauDongHocPhi) : '-') + '</span></div>' +
      '<div><span class="label">Hạn đóng</span><span>' + (data.HanDongHocPhi ? formatDate(data.HanDongHocPhi) : '-') + '</span></div>' +
      '<div><span class="label">Trạng thái</span><span><span class="badge ' + tuitionStatusBadge(data.TrangThai, data.QuaHan) + '">' + tuitionEscapeHtml(data.TrangThai || '-') + '</span></span></div>' +
      '<div><span class="label">Tổng tiền các môn</span><span>' + formatCurrency(courseTotal) + '</span></div>' +
      '<div><span class="label">Đối tượng miễn giảm áp dụng</span><span>' + tuitionEscapeHtml(discountLabel) + '</span></div>' +
      '<div><span class="label">Tỷ lệ miễn giảm</span><span>' + formatTuitionPercent(discountRate) + '</span></div>' +
      '<div><span class="label">Số tiền miễn giảm</span><span>' + formatTuitionDiscountAmount(discountAmount) + '</span></div>' +
      '<div><span class="label">Còn phải đóng sau miễn giảm</span><span>' + formatCurrency(amountDue) + '</span></div>' +
    '</div>' +
    '<div class="card"><div class="card-header"><h3>Chi tiết môn học</h3></div><div class="table-container"><table class="data-table"><thead><tr><th>Mã môn</th><th>Tên môn</th><th>TC</th><th>Loại ĐK</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>' +
      (courses || '<tr><td colspan="6"><div class="empty-state">Không có chi tiết môn học</div></td></tr>') +
    '</tbody><tfoot><tr><th colspan="5">Tổng tiền các môn</th><th class="currency">' + formatCurrency(courseTotal) + '</th></tr></tfoot></table></div></div>' +
    '<div class="card"><div class="card-header"><h3>Phiếu thu học phí</h3></div><div class="table-container"><table class="data-table"><thead><tr><th>Số phiếu</th><th>Ngày lập</th><th>Số tiền</th><th>Phương thức</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>' +
      (payments || '<tr><td colspan="6"><div class="empty-state">Chưa có phiếu thu</div></td></tr>') +
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
        var receipt = t.PayableReceipt || null;
        var canPay = remaining > 0 && t.CoTheThanhToan !== false;
        var missingReceipt = remaining > 0 && !receipt;
        var rawUnavailableReason = t.LyDoChuaTheThanhToan || 'Chỉ thanh toán được khi có phiếu thu do admin tạo.';
        var unavailableReason = tuitionEscapeHtml(rawUnavailableReason);
        var unavailableLabel = missingReceipt || rawUnavailableReason.indexOf('phiếu thu') >= 0 ? 'Chưa có phiếu thu' : 'Chưa thể thanh toán';
        var badgeClass = remaining <= 0 ? 'badge-success' : t.TrangThai === 'Quá hạn' ? 'badge-error' : paid > 0 ? 'badge-warning' : 'badge-error';
        var actionHtml = remaining <= 0
          ? '<button class="btn btn-sm btn-outline" type="button" onclick="viewTuitionDetail(' + t.SoPhieu + ')">Chi tiết</button>'
          : canPay && receipt
            ? '<button class="btn btn-sm btn-outline" type="button" onclick="viewTuitionDetail(' + t.SoPhieu + ')">Chi tiết</button> <button class="btn btn-sm btn-outline" type="button" onclick="openReceiptDetailModal(' + Number(receipt.SoPhieuThu || 0) + ')">Xem phiếu thu</button> <button class="btn btn-sm btn-primary" type="button" onclick="openPaymentModal(' + receipt.SoPhieuThu + ', ' + Number(receipt.SoTienThu || remaining) + ')">Thanh toán phiếu thu</button>'
            : '<button class="btn btn-sm btn-outline" type="button" onclick="viewTuitionDetail(' + t.SoPhieu + ')">Chi tiết</button> <button class="btn btn-sm btn-outline" type="button" title="' + unavailableReason + '" disabled>' + unavailableLabel + '</button>';
        if (canPay && receipt) {
          payableTuitionRows.push({ SoPhieu: t.SoPhieu, SoPhieuThu: receipt.SoPhieuThu, remaining: Number(receipt.SoTienThu || remaining) });
        } else if (remaining > 0) {
          blockedTuitionRows.push({ SoPhieu: t.SoPhieu, remaining: remaining, reason: t.LyDoChuaTheThanhToan, missingReceipt: missingReceipt });
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
