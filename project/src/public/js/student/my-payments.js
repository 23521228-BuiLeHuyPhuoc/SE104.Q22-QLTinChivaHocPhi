var currentPaymentStudent = null;

async function ensurePaymentStudent() {
  if (currentPaymentStudent) return currentPaymentStudent;
  var meRes = await apiFetch('/api/auth/me');
  if (meRes.success && meRes.data.student) currentPaymentStudent = meRes.data.student;
  return currentPaymentStudent;
}

function paymentEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadMyPayments(page) {
  var loading = document.getElementById('loading');
  var table = document.getElementById('payments-table');
  var tbody = document.getElementById('payment-list');
  if (loading) loading.classList.remove('hidden');
  if (table) table.classList.add('hidden');

  try {
    var student = await ensurePaymentStudent();
    if (!student) return;

    var res = await apiFetch('/api/payments/student/' + student.MaSv + '?page=' + (page || 1));
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');

    if (res.success && res.data && res.data.length > 0) {
      tbody.innerHTML = res.data.map(function(p) {
        var status = p.TrangThai || 'Thành công';
        var badgeClass = status === 'Thành công' ? 'badge-success' : status === 'Chờ xác nhận' ? 'badge-warning' : 'badge-error';
        return '<tr>' +
          '<td class="mono">' + paymentEscapeHtml(p.SoPhieuThu || '-') + '</td>' +
          '<td>' + paymentEscapeHtml(p.TenHocKy || '-') + '</td>' +
          '<td class="currency">' + formatCurrency(p.SoTienThu || 0) + '</td>' +
          '<td>' + paymentEscapeHtml(p.HinhThucThu || '-') + '</td>' +
          '<td>' + (p.NgayLap ? new Date(p.NgayLap).toLocaleDateString('vi-VN') : '-') + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + paymentEscapeHtml(status) + '</span></td>' +
          '<td>' + paymentEscapeHtml(p.GhiChu || '-') + '</td>' +
        '</tr>';
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Chưa có lịch sử thanh toán</div></td></tr>';
    }

    renderClientPagination('payments-pagination', res.pagination, 'loadMyPayments');
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
    renderClientPagination('payments-pagination', null, 'loadMyPayments');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadMyPayments(1);
});
