var currentPaymentStudent = null;
var studentPaymentCache = {};

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
          '<td><button class="btn btn-sm btn-outline" type="button" onclick="printStudentPayment(' + p.SoPhieuThu + ')">In</button></td>' +
        '</tr>';
      }).join('');
    } else {
      studentPaymentCache = {};
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Chưa có lịch sử thanh toán</div></td></tr>';
    }

    renderClientPagination('payments-pagination', res.pagination, 'loadMyPayments');
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state text-error">Lỗi tải dữ liệu</div></td></tr>';
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
      opt.textContent = semester.TenHocKy + (semester.TenNamHoc ? ' - ' + semester.TenNamHoc : '');
      select.appendChild(opt);
    });
  } catch (e) {}
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
  win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Phiếu thu học phí</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}.center{text-align:center}.box{border:1px solid #111;padding:18px;margin-top:18px}.row{display:flex;justify-content:space-between;margin:10px 0}.sign{display:flex;justify-content:space-between;margin-top:48px;text-align:center}</style></head><body><div class="center"><h2>TRƯỜNG ĐẠI HỌC</h2><h1>PHIẾU THU HỌC PHÍ</h1><p>Số phiếu: ' + paymentEscapeHtml(p.SoPhieuThu) + '</p></div><div class="box"><div class="row"><span>MSSV:</span><strong>' + paymentEscapeHtml(p.MaSv) + '</strong></div><div class="row"><span>Học kỳ:</span><strong>' + paymentEscapeHtml(p.TenHocKy || '-') + '</strong></div><div class="row"><span>Số tiền:</span><strong>' + formatCurrency(p.SoTienThu || 0) + '</strong></div><div class="row"><span>Bằng chữ:</span><strong>' + paymentEscapeHtml(numberToVietnamesePayment(p.SoTienThu)) + '</strong></div><div class="row"><span>Phương thức:</span><span>' + paymentEscapeHtml(p.HinhThucThu || '-') + '</span></div><div class="row"><span>Trạng thái:</span><span>' + paymentEscapeHtml(p.TrangThai || '-') + '</span></div></div><p style="text-align:right">Ngày ' + today.getDate() + ' tháng ' + (today.getMonth() + 1) + ' năm ' + today.getFullYear() + '</p><div class="sign"><div><strong>Người nộp</strong><p>(Ký, ghi rõ họ tên)</p></div><div><strong>Người thu</strong><p>(Ký, ghi rõ họ tên)</p></div></div><script>window.onload=function(){window.print();}</script></body></html>');
  win.document.close();
}

document.addEventListener('DOMContentLoaded', function() {
  loadPaymentSemesters();
  loadMyPayments(1);
});
