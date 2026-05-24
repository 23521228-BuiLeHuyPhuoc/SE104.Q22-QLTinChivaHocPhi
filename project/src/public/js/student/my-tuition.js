var currentTuitionStudent = null;

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

function openPaymentModal(soPhieu, amount) {
  var modal = document.getElementById('payment-modal');
  document.getElementById('payment-so-phieu').value = soPhieu;
  document.getElementById('payment-amount').value = Math.max(Number(amount || 0), 0);
  document.getElementById('payment-result').innerHTML = '';
  if (modal) modal.classList.add('active');
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
    result.innerHTML = '<a class="btn btn-primary" href="' + data.checkoutUrl + '" target="_blank" rel="noopener">Mở cổng thanh toán</a>';
  } else if (data.qrPayload) {
    result.innerHTML = '<img alt="QR chuyển khoản" style="max-width:260px;width:100%" src="' + data.qrPayload + '"><p class="text-muted">Thanh toán QR sẽ ở trạng thái chờ admin xác nhận.</p>';
  } else {
    result.innerHTML = '<div class="empty-state">Đã tạo yêu cầu đóng tiền mặt, vui lòng thanh toán tại quầy.</div>';
  }
  showToast(res.message || 'Đã tạo yêu cầu thanh toán', 'success');
  loadMyTuition(1);
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
      tbody.innerHTML = res.data.map(function(t) {
        var fee = Number(t.TongTienPhaiDong || 0);
        var paid = Number(t.TongTienDaDong || 0);
        var remaining = Number(t.conNo || Math.max(fee - paid, 0));
        var badgeClass = remaining <= 0 ? 'badge-success' : t.TrangThai === 'Quá hạn' ? 'badge-error' : paid > 0 ? 'badge-warning' : 'badge-error';
        return '<tr>' +
          '<td>' + tuitionEscapeHtml(t.TenHocKy || '-') + (t.TenNamHoc ? '<small>' + tuitionEscapeHtml(t.TenNamHoc) + '</small>' : '') + '</td>' +
          '<td class="currency">' + formatCurrency(fee) + '</td>' +
          '<td class="currency">' + formatCurrency(paid) + '</td>' +
          '<td class="currency ' + (remaining > 0 ? 'text-danger' : 'text-success') + '">' + formatCurrency(remaining) + '</td>' +
          '<td>' + (t.HanDongHocPhi ? formatDate(t.HanDongHocPhi) : '-') + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + tuitionEscapeHtml(t.TrangThai || '-') + '</span></td>' +
          '<td>' + (remaining > 0 ? '<button class="btn btn-sm btn-primary" type="button" onclick="openPaymentModal(' + t.SoPhieu + ', ' + remaining + ')">Đóng học phí</button>' : '-') + '</td>' +
        '</tr>';
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Không có dữ liệu học phí</div></td></tr>';
    }

    renderClientPagination('tuition-pagination', res.pagination, 'loadMyTuition');
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
    renderTuitionSummary({});
    renderClientPagination('tuition-pagination', null, 'loadMyTuition');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadMyTuition(1);
});
