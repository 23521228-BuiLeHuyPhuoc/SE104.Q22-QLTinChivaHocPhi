var currentPaymentStudent = null;
var studentPaymentCache = {};
var currentPaymentDetail = null;

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

function paymentSemesterText(payment) {
  return payment.HocKyDisplay || [payment.TenHocKy, payment.TenNamHoc].filter(Boolean).join(' - ') || payment.MaHocKy || '-';
}

function paymentDisplayStatus(payment) {
  var status = payment.TrangThaiHienThi || payment.TrangThai || '-';
  return status === 'Đóng một phần' ? 'Chưa thanh toán hết' : status;
}

function paymentStatusBadgeClass(payment) {
  var key = payment.TrangThaiThanhToan || '';
  if (key === 'paid') return 'badge-success';
  if (key === 'pending' || key === 'unpaid' || key === 'partial') return 'badge-warning';
  if (key === 'cancelled' || key === 'refunded') return 'badge-secondary';
  var status = payment.TrangThaiHienThi || payment.TrangThai || '';
  if (status === 'Thành công') return 'badge-success';
  if (status === 'Chờ xác nhận' || status === 'Chưa thanh toán' || status === 'Chưa thanh toán hết' || status === 'Đóng một phần') return 'badge-warning';
  if (status === 'Đã hủy' || status === 'Hoàn tiền') return 'badge-secondary';
  return 'badge-error';
}

function closePaymentDetailModal() {
  var modal = document.getElementById('payment-detail-modal');
  if (modal) modal.classList.remove('active');
  currentPaymentDetail = null;
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

    var semester = document.getElementById('payment-semester-filter') ? document.getElementById('payment-semester-filter').value : '';
    var url = '/api/payments/student/' + student.MaSv + '?page=' + (page || 1);
    if (semester) url += '&MaHocKy=' + encodeURIComponent(semester);
    var res = await apiFetch(url);
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');

    if (res.success && res.data && res.data.length > 0) {
      studentPaymentCache = {};
      tbody.innerHTML = res.data.map(function(p) {
        studentPaymentCache[p.SoPhieuThu] = p;
        var status = paymentDisplayStatus(p);
        var badgeClass = paymentStatusBadgeClass(p);
        return '<tr>' +
          '<td class="mono">' + paymentEscapeHtml(p.SoPhieuThu || '-') + '</td>' +
      '<td>' + paymentEscapeHtml(paymentSemesterText(p)) + '</td>' +
          '<td class="currency">' + formatCurrency(p.SoTienThu || 0) + '</td>' +
          '<td>' + paymentEscapeHtml(p.HinhThucThu || 'Chưa chọn') + '</td>' +
          '<td>' + (p.NgayLap ? new Date(p.NgayLap).toLocaleDateString('vi-VN') : '-') + '</td>' +
          '<td>' + paymentEscapeHtml(p.MaGiaoDich || '-') + '</td>' +
          '<td>' + (p.NgayXacNhan ? formatActivityDateTime(p.NgayXacNhan) : '-') + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + paymentEscapeHtml(status) + '</span></td>' +
          '<td>' + paymentEscapeHtml(p.GhiChu || '-') + '</td>' +
          '<td><button class="btn btn-sm btn-outline" type="button" onclick="openPaymentDetailModal(' + p.SoPhieuThu + ')">Xem</button> <button class="btn btn-sm btn-outline" type="button" onclick="printStudentPayment(' + p.SoPhieuThu + ')">In</button></td>' +
        '</tr>';
      }).join('');
    } else {
      studentPaymentCache = {};
      tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state">Chưa có phiếu thu</div></td></tr>';
    }

    renderClientPagination('payments-pagination', res.pagination, 'loadMyPayments');
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');
    tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
    renderClientPagination('payments-pagination', null, 'loadMyPayments');
  }
}

async function loadPaymentSemesters() {
  try {
    var res = await apiFetch('/api/semesters');
    var select = document.getElementById('payment-semester-filter');
    if (!select || !res.success) return;
    res.data.forEach(function(semester) {
      var opt = document.createElement('option');
      opt.value = semester.MaHocKy;
    opt.textContent = semester.DisplayLabel || ((semester.HocKyLabel || semester.TenHocKy || semester.MaHocKy) + (semester.TenNamHoc ? ' - ' + semester.TenNamHoc : ''));
      select.appendChild(opt);
    });
  } catch (e) {}
}

function paymentDateTime(value) {
  if (!value) return '-';
  if (typeof formatActivityDateTime === 'function') return formatActivityDateTime(value);
  return new Date(value).toLocaleString('vi-VN');
}

function renderPaymentDetail(payment) {
  var status = paymentDisplayStatus(payment);
  var transactions = payment.LanThanhToan || [];
  var transactionRows = transactions.map(function(item) {
    var itemStatus = paymentDisplayStatus(item);
    var provider = [item.PaymentProvider, item.PaymentChannel].filter(Boolean).join(' / ') || '-';
    return '<tr>' +
      '<td class="mono">' + paymentEscapeHtml(item.MaGiaoDichThanhToan || '-') + '</td>' +
      '<td>' + paymentDateTime(item.NgayTao) + '</td>' +
      '<td class="currency">' + formatCurrency(item.SoTienThanhToan || 0) + '</td>' +
      '<td>' + paymentEscapeHtml(item.HinhThucThanhToan || 'Ch?a ch?n') + '</td>' +
      '<td>' + paymentEscapeHtml(provider) + '</td>' +
      '<td>' + paymentEscapeHtml(item.MaGiaoDich || '-') + '</td>' +
      '<td>' + paymentDateTime(item.NgayXacNhan) + '</td>' +
      '<td><span class="badge ' + paymentStatusBadgeClass(item) + '">' + paymentEscapeHtml(itemStatus) + '</span></td>' +
      '<td>' + paymentEscapeHtml(item.GhiChu || '-') + '</td>' +
    '</tr>';
  }).join('');

  return '<div class="info-list">' +
      '<div><span class="label">S? phi?u thu</span><span class="mono">' + paymentEscapeHtml(payment.SoPhieuThu || '-') + '</span></div>' +
      '<div><span class="label">Phi?u ??ng k?</span><span class="mono">' + paymentEscapeHtml(payment.SoPhieuDangKy || '-') + '</span></div>' +
      '<div><span class="label">MSSV</span><span class="mono">' + paymentEscapeHtml(payment.MaSv || '-') + '</span></div>' +
      '<div><span class="label">Sinh vi?n</span><span>' + paymentEscapeHtml(payment.HoTen || '-') + '</span></div>' +
      '<div><span class="label">H?c k?</span><span>' + paymentEscapeHtml(paymentSemesterText(payment)) + '</span></div>' +
      '<div><span class="label">S? ti?n phi?u thu</span><span>' + formatCurrency(payment.SoTienThu || 0) + '</span></div>' +
      '<div><span class="label">?? thanh to?n</span><span>' + formatCurrency(payment.TongTienDaThanhToan || 0) + '</span></div>' +
      '<div><span class="label">Ch? x?c nh?n</span><span>' + formatCurrency(payment.TongTienDangChoXacNhan || 0) + '</span></div>' +
      '<div><span class="label">C?n n?</span><span>' + formatCurrency(payment.ConNoPhieuThu || 0) + '</span></div>' +
      '<div><span class="label">Ph??ng th?c g?n nh?t</span><span>' + paymentEscapeHtml(payment.HinhThucThu || 'Ch?a ch?n') + '</span></div>' +
      '<div><span class="label">M? giao d?ch g?n nh?t</span><span>' + paymentEscapeHtml(payment.MaGiaoDich || '-') + '</span></div>' +
      '<div><span class="label">Ng?y l?p</span><span>' + paymentDateTime(payment.NgayLap) + '</span></div>' +
      '<div><span class="label">Ng?y x?c nh?n</span><span>' + paymentDateTime(payment.NgayXacNhan) + '</span></div>' +
      '<div><span class="label">Tr?ng th?i</span><span><span class="badge ' + paymentStatusBadgeClass(payment) + '">' + paymentEscapeHtml(status) + '</span></span></div>' +
      '<div><span class="label">Ghi ch?</span><span>' + paymentEscapeHtml(payment.GhiChu || '-') + '</span></div>' +
    '</div>' +
    '<h3 class="mt-3">L?n thanh to?n</h3>' +
    '<div class="table-container"><table class="data-table"><thead><tr><th>M? l?n</th><th>Ng?y t?o</th><th>S? ti?n</th><th>Ph??ng th?c</th><th>K?nh</th><th>M? giao d?ch</th><th>Ng?y x?c nh?n</th><th>Tr?ng th?i</th><th>Ghi ch?</th></tr></thead><tbody>' +
      (transactionRows || '<tr><td colspan="9"><div class="empty-state">Ch?a c? l?n thanh to?n</div></td></tr>') +
    '</tbody></table></div>';
}

async function openPaymentDetailModal(id) {
  var modal = document.getElementById('payment-detail-modal');
  var title = document.getElementById('payment-detail-title');
  var body = document.getElementById('payment-detail-body');
  if (!modal || !body || !id) return;
  currentPaymentDetail = null;
  if (title) title.textContent = 'Phi?u thu #' + id;
  body.innerHTML = '<div class="empty-state">?ang t?i d? li?u...</div>';
  modal.classList.add('active');

  try {
    var res = await apiFetch('/api/payments/' + encodeURIComponent(id));
    if (!res || res.success === false) {
      body.innerHTML = '<div class="empty-state text-error">' + paymentEscapeHtml((res && res.message) || 'Kh?ng t?i ???c phi?u thu') + '</div>';
      return;
    }
    currentPaymentDetail = res.data || {};
    studentPaymentCache[id] = currentPaymentDetail;
    body.innerHTML = renderPaymentDetail(currentPaymentDetail);
  } catch (e) {
    body.innerHTML = '<div class="empty-state text-error">L?i t?i chi ti?t phi?u thu</div>';
  }
}

function numberToVietnamesePayment(value) {
  var number = Math.round(Number(value || 0));
  if (number === 0) return 'không đồng';
  var digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  var units = ['', ' nghìn', ' triệu', ' tỷ'];
  function triple(num) {
    var hundred = Math.floor(num / 100);
    var ten = Math.floor((num % 100) / 10);
    var one = num % 10;
    var parts = [];
    if (hundred) parts.push(digits[hundred] + ' trăm');
    if (ten > 1) {
      parts.push(digits[ten] + ' mươi');
      if (one === 1) parts.push('mốt');
      else if (one === 5) parts.push('lăm');
      else if (one) parts.push(digits[one]);
    } else if (ten === 1) {
      parts.push('mười');
      if (one === 5) parts.push('lăm');
      else if (one) parts.push(digits[one]);
    } else if (one) {
      if (hundred) parts.push('lẻ');
      parts.push(digits[one]);
    }
    return parts.join(' ');
  }
  var chunks = [];
  var index = 0;
  while (number > 0) {
    var part = number % 1000;
    if (part) chunks.unshift(triple(part) + units[index]);
    number = Math.floor(number / 1000);
    index += 1;
  }
  return chunks.join(' ').trim() + ' đồng';
}

function printStudentPayment(id) {
  var p = studentPaymentCache[id];
  if (!p) {
    showToast('Không tìm thấy dữ liệu phiếu thu trên trang hiện tại', 'error');
    return;
  }
  var today = new Date();
  var win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    showToast('Trình duyệt đang chặn cửa sổ in', 'error');
    return;
  }
  win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Phiếu thu học phí</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}.center{text-align:center}.box{border:1px solid #111;padding:18px;margin-top:18px}.row{display:flex;justify-content:space-between;margin:10px 0}.sign{display:flex;justify-content:space-between;margin-top:48px;text-align:center}</style></head><body><div class="center"><h2>TRƯỜNG ĐẠI HỌC</h2><h1>PHIẾU THU HỌC PHÍ</h1><p>Số phiếu: ' + paymentEscapeHtml(p.SoPhieuThu) + '</p></div><div class="box"><div class="row"><span>MSSV:</span><strong>' + paymentEscapeHtml(p.MaSv) + '</strong></div><div class="row"><span>Học kỳ:</span><strong>' + paymentEscapeHtml(paymentSemesterText(p)) + '</strong></div><div class="row"><span>Số tiền:</span><strong>' + formatCurrency(p.SoTienThu || 0) + '</strong></div><div class="row"><span>Bằng chữ:</span><strong>' + paymentEscapeHtml(numberToVietnamesePayment(p.SoTienThu)) + '</strong></div><div class="row"><span>Phương thức:</span><span>' + paymentEscapeHtml(p.HinhThucThu || 'Chưa chọn') + '</span></div><div class="row"><span>Trạng thái:</span><span>' + paymentEscapeHtml(paymentDisplayStatus(p)) + '</span></div></div><p style="text-align:right">Ngày ' + today.getDate() + ' tháng ' + (today.getMonth() + 1) + ' năm ' + today.getFullYear() + '</p><div class="sign"><div><strong>Người nộp</strong><p>(Ký, ghi rõ họ tên)</p></div><div><strong>Người thu</strong><p>(Ký, ghi rõ họ tên)</p></div></div><script>window.onload=function(){window.print();}</script></body></html>');
  win.document.close();
}

document.addEventListener('DOMContentLoaded', function() {
  var params = new URLSearchParams(window.location.search || '');
  var paymentResult = params.get('payment');
  if (paymentResult === 'success') showToast('Thanh toán thành công. Danh sách phiếu thu đã được cập nhật.', 'success');
  if (paymentResult === 'failed') showToast('Thanh toán thất bại. Phiếu thu đã được cập nhật trạng thái.', 'error');
  if (paymentResult && window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }
  loadPaymentSemesters();
  loadMyPayments(1);
});
