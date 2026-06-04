var currentPaymentDetail = null;
var searchTimer;
var autofillTimer;

function paymentSafe(value) {
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

function getSelectedPaymentActivity() {
  var select = document.getElementById('filter-semester');
  if (!select || !select.value) return null;
  var option = select.options[select.selectedIndex];
  return parseActivityData(option ? option.dataset.activity : null);
}

function renderPaymentActivityPanel() {
  var activity = getSelectedPaymentActivity();
  var semesterEl = document.getElementById('payment-activity-semester');
  var badge = document.getElementById('payment-window-badge');
  var start = document.getElementById('payment-window-start');
  var end = document.getElementById('payment-window-end');
  var finalized = document.getElementById('payment-finalized-state');
  var openButton = document.getElementById('open-tuition-btn');
  var closeButton = document.getElementById('close-tuition-btn');

  if (!activity) {
    if (semesterEl) semesterEl.textContent = 'Chọn học kỳ để xem thời hạn thu';
    setActivityBadge(badge, getActivityBadgeMeta(null));
    if (start) start.textContent = '-';
    if (end) end.textContent = '-';
    if (finalized) finalized.textContent = '-';
    if (openButton) {
      openButton.disabled = true;
      openButton.title = 'Chọn học kỳ để mở thu';
    }
    if (closeButton) {
      closeButton.disabled = true;
      closeButton.title = 'Chọn học kỳ để khóa thu';
    }
    return;
  }

  var windowState = activity.tuitionPaymentWindow || {};
  var workflow = activity.workflow || {};
  if (semesterEl) semesterEl.textContent = activity.label || activity.MaHocKy || '-';
  setActivityBadge(badge, getActivityBadgeMeta(windowState, { lockedLabel: 'Đã khóa thu' }));
  if (start) start.textContent = formatActivityDateTime(activity.NgayMoThuHocPhi || windowState.paymentStart || windowState.start);
  if (end) end.textContent = formatActivityDateTime(activity.HanDongHocPhi || windowState.paymentDeadline || windowState.deadline);
  if (finalized) finalized.textContent = activity.NgayChotDangKy ? formatActivityDateTime(activity.NgayChotDangKy) : 'Chưa chốt';
  if (openButton) {
    openButton.disabled = Boolean(activity.MoThuHocPhi) || !workflow.canOpenTuitionPayment;
    openButton.title = activity.MoThuHocPhi ? 'Học kỳ đang mở thu' : (workflow.openTuitionPaymentReason || 'Có thể mở thu');
  }
  if (closeButton) {
    closeButton.disabled = !activity.MoThuHocPhi;
    closeButton.title = activity.MoThuHocPhi ? 'Khóa thu học phí cho học kỳ này' : 'Học kỳ chưa mở thu';
  }
}

async function openSelectedTuitionPayment() {
  var activity = getSelectedPaymentActivity();
  if (!activity || !activity.MaHocKy) {
    showToast('Vui lòng chọn học kỳ cần mở thu', 'error');
    return;
  }
  if (!confirm('Mở thu học phí cho ' + (activity.label || activity.MaHocKy) + '?')) return;
  try {
    var res = await apiFetch('/api/semesters/' + encodeURIComponent(activity.MaHocKy) + '/open-tuition-payment', { method: 'POST' });
    if (res && res.success) {
      showToast('Đã mở thu học phí', 'success');
      setTimeout(function() { window.location.reload(); }, 500);
      return;
    }
    showToast((res && res.message) || 'Không thể mở thu học phí', 'error');
  } catch (e) {
    showToast('Lỗi kết nối khi mở thu học phí', 'error');
  }
}

async function closeSelectedTuitionPayment() {
  var activity = getSelectedPaymentActivity();
  if (!activity || !activity.MaHocKy) {
    showToast('Vui lòng chọn học kỳ cần khóa thu', 'error');
    return;
  }
  if (!confirm('Khóa thu học phí cho ' + (activity.label || activity.MaHocKy) + '?')) return;
  try {
    var res = await apiFetch('/api/semesters/' + encodeURIComponent(activity.MaHocKy) + '/close-tuition-payment', { method: 'POST' });
    if (res && res.success) {
      showToast('Đã khóa thu học phí', 'success');
      setTimeout(function() { window.location.reload(); }, 500);
      return;
    }
    showToast((res && res.message) || 'Không thể khóa thu học phí', 'error');
  } catch (e) {
    showToast('Lỗi kết nối khi khóa thu học phí', 'error');
  }
}

(async function loadSemesters() {
  try {
    var res = await apiFetch('/api/semesters');
    if (!res.success) return;

    var sel = document.getElementById('pt-hocky');
    if (!sel) return;
    res.data.forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s.MaHocKy;
      opt.textContent = s.DisplayLabel || ((s.HocKyLabel || s.TenHocKy || s.MaHocKy) + (s.TenNamHoc ? ' - ' + s.TenNamHoc : ''));
      sel.appendChild(opt);
    });
  } catch (e) {}
})();

function openModal() {
  var form = document.getElementById('payment-form');
  if (form) form.reset();
  var info = document.getElementById('student-debt-info');
  if (info) {
    info.classList.add('hidden');
    info.textContent = '';
  }
  document.getElementById('payment-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('payment-modal').classList.remove('active');
}

function openBulkModal() {
  var modal = document.getElementById('payment-bulk-modal');
  var currentSemester = document.getElementById('filter-semester');
  var bulkSemester = document.getElementById('bulk-hocky');
  if (bulkSemester && currentSemester && currentSemester.value) bulkSemester.value = currentSemester.value;
  clearBulkPaymentResult();
  if (modal) modal.classList.add('active');
}

function closeBulkModal() {
  var modal = document.getElementById('payment-bulk-modal');
  if (modal) modal.classList.remove('active');
}

function clearBulkPaymentResult() {
  var result = document.getElementById('payment-bulk-result');
  if (!result) return;
  result.classList.add('hidden');
  result.innerHTML = '';
}

function bulkPaymentResultRows(created, skipped) {
  var rows = [];
  (created || []).forEach(function(item) {
    rows.push({
      badge: 'badge-success',
      status: '\u0110\u00e3 t\u1ea1o',
      receipt: item.SoPhieuThu || '-',
      registration: item.SoPhieuDangKy || item.SoPhieu || '-',
      student: item.MaSv || '-',
      name: item.HoTen || '-',
      amount: item.SoTienThu || 0,
      reason: '-'
    });
  });
  (skipped || []).forEach(function(item) {
    rows.push({
      badge: 'badge-secondary',
      status: 'B\u1ecf qua',
      receipt: '-',
      registration: item.SoPhieuDangKy || item.SoPhieu || '-',
      student: item.MaSv || '-',
      name: item.HoTen || '-',
      amount: item.SoTienThu || 0,
      reason: item.reason || item.message || '-'
    });
  });
  return rows;
}

function renderBulkPaymentSummary(payload, created, skipped, rows) {
  return '<div class=stats-grid>' +
    '<div class=stat-card><div class=stat-info><h3>' + paymentSafe(payload.total || rows.length || 0) + '</h3><p>T\u1ed5ng x\u1eed l\u00fd</p></div></div>' +
    '<div class=stat-card><div class=stat-info><h3>' + paymentSafe(created.length) + '</h3><p>T\u1ea1o th\u00e0nh c\u00f4ng</p></div></div>' +
    '<div class=stat-card><div class=stat-info><h3>' + paymentSafe(skipped.length) + '</h3><p>B\u1ecf qua</p></div></div>' +
  '</div>';
}

function renderBulkPaymentTableRow(row) {
  return [
    '<tr>',
    '<td>' + paymentSafe(row.status) + '</td>',
    '<td>' + paymentSafe(row.receipt) + '</td>',
    '<td>' + paymentSafe(row.registration) + '</td>',
    '<td>' + paymentSafe(row.student) + '</td>',
    '<td>' + paymentSafe(row.name) + '</td>',
    '<td>' + (Number(row.amount || 0) > 0 ? formatCurrency(row.amount) : '-') + '</td>',
    '<td>' + paymentSafe(row.reason) + '</td>',
    '</tr>'
  ].join('');
}

function renderBulkPaymentTable(rows) {
  var body = rows.length
    ? rows.map(renderBulkPaymentTableRow).join('')
    : '<tr><td colspan=7><div class=empty-state>Kh\u00f4ng c\u00f3 d\u00f2ng n\u00e0o c\u1ea7n x\u1eed l\u00fd</div></td></tr>';
  return [
    '<div class=table-container><table class=data-table><thead><tr>',
    '<th>K\u1ebft qu\u1ea3</th><th>S\u1ed1 phi\u1ebfu thu</th><th>S\u1ed1 phi\u1ebfu \u0110K</th><th>MSSV</th><th>H\u1ecd t\u00ean</th><th>S\u1ed1 ti\u1ec1n</th><th>L\u00fd do</th>',
    '</tr></thead><tbody>',
    body,
    '</tbody></table></div>'
  ].join('');
}

function renderBulkPaymentReload(created) {
  if (!created.length) return '';
  return '<div class=mt-3><button class=btn type=button id=reload-payment-list>T\u1ea3i l\u1ea1i danh s\u00e1ch</button></div>';
}

function renderBulkPaymentResult(data) {
  var result = document.getElementById('payment-bulk-result');
  if (!result) return;
  var payload = data || {};
  var created = payload.created || [];
  var skipped = payload.skipped || [];
  var rows = bulkPaymentResultRows(created, skipped);
  result.innerHTML = renderBulkPaymentSummary(payload, created, skipped, rows) + renderBulkPaymentTable(rows) + renderBulkPaymentReload(created);
  result.classList.remove('hidden');
  var reloadButton = document.getElementById('reload-payment-list');
  if (reloadButton) reloadButton.addEventListener('click', function() { location.reload(); });
}

function closePaymentDetail() {
  var modal = document.getElementById('payment-detail-modal');
  if (modal) modal.classList.remove('active');
}

function applyFilters() {
  var search = document.getElementById('search-input').value.trim();
  var semester = document.getElementById('filter-semester').value;
  var method = document.getElementById('filter-method').value;
  var status = document.getElementById('filter-status').value;
  var url = '/admin/payments?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (semester) url += '&MaHocKy=' + encodeURIComponent(semester);
  if (method) url += '&HinhThucThu=' + encodeURIComponent(method);
  if (status) url += '&TrangThai=' + encodeURIComponent(status);
  window.location.href = url;
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 400);
}

function bindAutofillEvents() {
  var mssv = document.getElementById('pt-mssv');
  var semester = document.getElementById('pt-hocky');
  [mssv, semester].forEach(function(el) {
    if (!el) return;
    el.addEventListener('input', scheduleDebtAutofill);
    el.addEventListener('change', scheduleDebtAutofill);
  });
}

function scheduleDebtAutofill() {
  clearTimeout(autofillTimer);
  autofillTimer = setTimeout(loadStudentDebtInfo, 350);
}

async function loadStudentDebtInfo() {
  var mssv = document.getElementById('pt-mssv').value.trim();
  var semester = document.getElementById('pt-hocky').value;
  var amountInput = document.getElementById('pt-sotien');
  var info = document.getElementById('student-debt-info');
  if (!info || !mssv) {
    if (info) info.classList.add('hidden');
    return;
  }

  info.classList.remove('hidden');
  info.textContent = 'Đang kiểm tra công nợ...';

  try {
    var url = '/api/tuition/student/' + encodeURIComponent(mssv) + '?limit=50';
    if (semester) url += '&MaHocKy=' + encodeURIComponent(semester);
    var res = await apiFetch(url);
    if (!res || res.success === false) {
      info.textContent = (res && res.message) || 'Không tìm thấy học phí của sinh viên';
      return;
    }

    var rows = res.data || [];
    var debtRow = rows.find(function(row) { return Number(row.conNo || row.ConNo || 0) > 0; }) || rows[0];
    if (!debtRow) {
      info.textContent = 'Sinh viên chưa phát sinh học phí';
      if (amountInput) amountInput.value = '';
      return;
    }
    var debt = Number(debtRow.conNo || debtRow.ConNo || 0);
    info.textContent = (debtRow.HoTen || mssv) + ' - ' + (debtRow.HocKyDisplay || debtRow.TenHocKy || debtRow.MaHocKy || '') + ' - Còn nợ: ' + formatCurrency(debt);
    if (amountInput && debt > 0) amountInput.value = debt;
  } catch (e) {
    info.textContent = 'Không kiểm tra được công nợ';
  }
}

async function savePayment() {
  var data = {
    MaSv: document.getElementById('pt-mssv').value.trim(),
    MaHocKy: document.getElementById('pt-hocky').value,
    SoTienThu: Number(document.getElementById('pt-sotien').value),
    HinhThucThu: document.getElementById('pt-phuongthuc').value,
    GhiChu: document.getElementById('pt-ghichu').value.trim() || null
  };

  if (!data.MaSv || !data.MaHocKy || !Number.isFinite(data.SoTienThu) || data.SoTienThu <= 0) {
    showToast('Vui lòng nhập MSSV, học kỳ và số tiền hợp lệ', 'error');
    return;
  }

  try {
    var res = await apiFetch('/api/payments', { method: 'POST', body: data });
    if (res.success) {
      showToast('Lập phiếu thu thành công', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể lập phiếu thu', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function saveBulkPayments() {
  var semester = document.getElementById('bulk-hocky').value;
  var submitButton = document.querySelector('#payment-bulk-modal .modal-footer .btn-primary');
  if (!semester) {
    showToast('Vui lòng chọn học kỳ', 'error');
    return;
  }
  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '\u0110ang t\u1ea1o...';
    }
    clearBulkPaymentResult();
    var res = await apiFetch('/api/payments/bulk', { method: 'POST', body: { MaHocKy: semester } });
    if (res.success) {
      showToast(res.message || 'Đã tạo phiếu thu hàng loạt', 'success');
      renderBulkPaymentResult(res.data || {});
    } else {
      showToast(res.message || 'Không thể tạo phiếu thu hàng loạt', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Tạo phiếu';
    }
  }
}

async function confirmPayment(id) {
  if (!confirm('Xác nhận phiếu thu này đã thanh toán?')) return;
  try {
    var res = await apiFetch('/api/payments/' + id + '/confirm', { method: 'PUT' });
    if (res.success) {
      showToast(res.message || 'Đã xác nhận thanh toán', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể xác nhận thanh toán', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function cancelPayment(id) {
  if (!confirm('Hủy phiếu thu này?')) return;
  try {
    var res = await apiFetch('/api/payments/' + id + '/cancel', { method: 'PUT' });
    if (res.success) {
      showToast(res.message || 'Đã hủy phiếu thu', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể hủy phiếu thu', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

async function failPayment(id) {
  if (!confirm('Đánh dấu phiếu thu này là thất bại/từ chối?')) return;
  try {
    var res = await apiFetch('/api/payments/' + id + '/fail', { method: 'PUT', body: { LyDo: 'Admin từ chối xác nhận thanh toán' } });
    if (res.success) {
      showToast(res.message || 'Đã đánh dấu thất bại', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Không thể cập nhật phiếu thu', 'error');
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
}

function renderPaymentDetail(p) {
  var status = p.TrangThai || '-';
  var badgeClass = status === 'Thành công' ? 'badge-success' : status === 'Chờ xác nhận' ? 'badge-warning' : 'badge-error';
  return '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-info"><h3>' + paymentSafe(p.SoPhieuThu || '-') + '</h3><p>Số phiếu</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3>' + formatCurrency(p.SoTienThu || 0) + '</h3><p>Số tiền</p></div></div>' +
      '<div class="stat-card"><div class="stat-info"><h3><span class="badge ' + badgeClass + '">' + paymentSafe(status) + '</span></h3><p>Trạng thái</p></div></div>' +
    '</div>' +
    '<div class="info-list">' +
      '<div><span class="label">Sinh viên</span><span>' + paymentSafe(p.MaSv) + ' - ' + paymentSafe(p.HoTen) + '</span></div>' +
      '<div><span class="label">Học kỳ</span><span>' + paymentSafe(paymentSemesterText(p)) + '</span></div>' +
      '<div><span class="label">Phương thức</span><span>' + paymentSafe(p.HinhThucThu || 'Chưa chọn') + '</span></div>' +
      '<div><span class="label">Người thu</span><span>' + paymentSafe(p.NguoiThu || '-') + '</span></div>' +
      '<div><span class="label">Ngày lập</span><span>' + (p.NgayLap ? formatDate(p.NgayLap) : '-') + '</span></div>' +
      '<div><span class="label">Ngày xác nhận</span><span>' + (p.NgayXacNhan ? formatDate(p.NgayXacNhan) : '-') + '</span></div>' +
      '<div><span class="label">Mã giao dịch</span><span>' + paymentSafe(p.MaGiaoDich || '-') + '</span></div>' +
      '<div><span class="label">Ghi chú</span><span>' + paymentSafe(p.GhiChu || '-') + '</span></div>' +
    '</div>';
}

async function fetchPaymentDetail(id) {
  var res = await apiFetch('/api/payments/' + encodeURIComponent(id));
  if (!res || res.success === false) throw new Error((res && res.message) || 'Không tải được phiếu thu');
  return res.data || {};
}

async function viewPaymentDetail(id) {
  var modal = document.getElementById('payment-detail-modal');
  var title = document.getElementById('payment-detail-title');
  var body = document.getElementById('payment-detail-body');
  if (!modal || !body) return;
  modal.classList.add('active');
  body.innerHTML = '<div class="empty-state">Đang tải dữ liệu...</div>';
  try {
    currentPaymentDetail = await fetchPaymentDetail(id);
    if (title) title.textContent = 'Chi tiết phiếu thu #' + id;
    body.innerHTML = renderPaymentDetail(currentPaymentDetail);
  } catch (e) {
    body.innerHTML = '<div class="empty-state text-error">' + paymentSafe(e.message) + '</div>';
  }
}

function numberToVietnamese(value) {
  var number = Math.round(Number(value || 0));
  if (number === 0) return 'không đồng';
  var digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  var units = ['', ' nghìn', ' triệu', ' tỷ'];
  function readTriple(num) {
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
  var unitIndex = 0;
  while (number > 0) {
    var triple = number % 1000;
    if (triple) chunks.unshift(readTriple(triple) + units[unitIndex]);
    number = Math.floor(number / 1000);
    unitIndex += 1;
  }
  return chunks.join(' ').replace(/\s+/g, ' ').trim() + ' đồng';
}

function buildPrintHtml(p) {
  var today = new Date();
  return '<!doctype html><html><head><meta charset="utf-8"><title>Phiếu thu học phí</title>' +
    '<style>body{font-family:Arial,sans-serif;color:#111;margin:32px} .center{text-align:center}.row{display:flex;justify-content:space-between;margin:10px 0}.box{border:1px solid #111;padding:18px;margin-top:18px}.money{font-weight:bold}.sign{display:flex;justify-content:space-between;margin-top:48px;text-align:center}</style>' +
    '</head><body>' +
    '<div class="center"><h2>TRƯỜNG ĐẠI HỌC</h2><h1>PHIẾU THU HỌC PHÍ</h1><p>Số phiếu: ' + paymentSafe(p.SoPhieuThu) + '</p></div>' +
    '<div class="box">' +
    '<div class="row"><span>MSSV:</span><strong>' + paymentSafe(p.MaSv) + '</strong></div>' +
    '<div class="row"><span>Họ tên:</span><strong>' + paymentSafe(p.HoTen) + '</strong></div>' +
    '<div class="row"><span>Học kỳ:</span><strong>' + paymentSafe(paymentSemesterText(p)) + '</strong></div>' +
    '<div class="row"><span>Số tiền:</span><span class="money">' + formatCurrency(p.SoTienThu || 0) + '</span></div>' +
    '<div class="row"><span>Bằng chữ:</span><strong>' + paymentSafe(numberToVietnamese(p.SoTienThu)) + '</strong></div>' +
    '<div class="row"><span>Phương thức:</span><span>' + paymentSafe(p.HinhThucThu || 'Chưa chọn') + '</span></div>' +
    '<div class="row"><span>Mã giao dịch:</span><span>' + paymentSafe(p.MaGiaoDich || '-') + '</span></div>' +
    '<div class="row"><span>Người thu:</span><span>' + paymentSafe(p.NguoiThu || '-') + '</span></div>' +
    '</div>' +
    '<p style="text-align:right">Ngày ' + today.getDate() + ' tháng ' + (today.getMonth() + 1) + ' năm ' + today.getFullYear() + '</p>' +
    '<div class="sign"><div><strong>Người nộp</strong><p>(Ký, ghi rõ họ tên)</p></div><div><strong>Người thu</strong><p>(Ký, ghi rõ họ tên)</p></div></div>' +
    '<script>window.onload=function(){window.print();}</script></body></html>';
}

async function printPayment(id) {
  try {
    var data = await fetchPaymentDetail(id);
    openPrintWindow(data);
  } catch (e) {
    showToast(e.message || 'Không in được phiếu thu', 'error');
  }
}

function printLoadedPayment() {
  if (!currentPaymentDetail) return;
  openPrintWindow(currentPaymentDetail);
}

function openPrintWindow(data) {
  var win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    showToast('Trình duyệt đang chặn cửa sổ in', 'error');
    return;
  }
  win.document.write(buildPrintHtml(data));
  win.document.close();
}

async function exportPayments() {
  try {
    var params = new URLSearchParams(window.location.search);
    params.delete('page');
    var headers = {};
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    var res = await fetch('/api/payments/export?' + params.toString(), { headers: headers });
    if (!res.ok) {
      showToast('Không xuất được phiếu thu', 'error');
      return;
    }
    var blob = await res.blob();
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'phieu-thu-hoc-phi.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    showToast('Không xuất được phiếu thu', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  bindAutofillEvents();
  renderPaymentActivityPanel();
});
