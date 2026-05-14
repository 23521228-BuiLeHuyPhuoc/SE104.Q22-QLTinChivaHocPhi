(async function loadSemesters() {
  try {
    var res = await apiFetch('/api/semesters');
    if (!res.success) return;

    var sel = document.getElementById('pt-hocky');
    res.data.forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s.MaHocKy;
      opt.textContent = s.TenHocKy + (s.TenNamHoc ? ' - ' + s.TenNamHoc : '');
      sel.appendChild(opt);
    });
  } catch (e) {}
})();

function openModal() {
  document.getElementById('payment-form').reset();
  document.getElementById('payment-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('payment-modal').classList.remove('active');
}

async function savePayment() {
  var data = {
    MaSv: document.getElementById('pt-mssv').value.trim(),
    MaHocKy: document.getElementById('pt-hocky').value,
    SoTienThu: parseInt(document.getElementById('pt-sotien').value, 10),
    HinhThucThu: document.getElementById('pt-phuongthuc').value,
    GhiChu: document.getElementById('pt-ghichu').value.trim() || null
  };

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

var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() {
    window.location.href = '/admin/payments?page=1&search=' + encodeURIComponent(document.getElementById('search-input').value);
  }, 400);
}
