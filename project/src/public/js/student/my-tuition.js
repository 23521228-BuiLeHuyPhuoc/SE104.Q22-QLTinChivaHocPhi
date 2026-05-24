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
    result.innerHTML = '<div class="empty-state">Đã tạo yêu cầu thanh toán.</div>';
  }
  showToast(res.message || 'Đã tạo yêu cầu thanh toán', 'success');
}

(async function() {
  try {
    var meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    var sid = meRes.data.student.MaSv;

    var res = await apiFetch('/api/tuition/student/' + sid);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('tuition-table').classList.remove('hidden');

    if (res.success && res.data && res.data.length > 0) {
      var totalFee = 0;
      var totalPaid = 0;
      var html = '';

      res.data.forEach(function(t) {
        var fee = Number(t.TongTienPhaiDong || 0);
        var paid = Number(t.TongTienDaDong || 0);
        var remaining = Number(t.conNo || Math.max(fee - paid, 0));
        totalFee += fee;
        totalPaid += paid;

        html += '<tr>';
        html += '<td>' + (t.TenHocKy || '-') + (t.TenNamHoc ? '<small>' + t.TenNamHoc + '</small>' : '') + '</td>';
        html += '<td class="currency">' + formatCurrency(fee) + '</td>';
        html += '<td class="currency">' + formatCurrency(paid) + '</td>';
        html += '<td class="currency ' + (remaining > 0 ? 'text-danger' : 'text-success') + '">' + formatCurrency(remaining) + '</td>';
        html += '<td>' + (t.HanDongHocPhi ? formatDate(t.HanDongHocPhi) : '-') + '</td>';
        html += '<td><span class="badge ' + (remaining <= 0 ? 'badge-success' : t.TrangThai === 'Quá hạn' ? 'badge-error' : paid > 0 ? 'badge-warning' : 'badge-error') + '">' + (t.TrangThai || '-') + '</span></td>';
        html += '<td>' + (remaining > 0 ? '<button class="btn btn-sm btn-primary" type="button" onclick="openPaymentModal(' + t.SoPhieu + ', ' + remaining + ')">Đóng học phí</button>' : '-') + '</td>';
        html += '</tr>';
      });

      document.getElementById('tuition-list').innerHTML = html;
      document.getElementById('total-fee').textContent = formatCurrency(totalFee);
      document.getElementById('total-paid').textContent = formatCurrency(totalPaid);
      document.getElementById('total-remaining').textContent = formatCurrency(Math.max(totalFee - totalPaid, 0));
    } else {
      document.getElementById('tuition-list').innerHTML = '<tr><td colspan="7"><div class="empty-state">Không có dữ liệu học phí</div></td></tr>';
      document.getElementById('total-fee').textContent = formatCurrency(0);
      document.getElementById('total-paid').textContent = formatCurrency(0);
      document.getElementById('total-remaining').textContent = formatCurrency(0);
    }
  } catch (e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('tuition-table').classList.remove('hidden');
    document.getElementById('tuition-list').innerHTML = '<tr><td colspan="7"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
  }
})();
