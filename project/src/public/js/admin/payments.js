// Load semesters for dropdown
(async function() {
  try {
    const res = await apiFetch('/api/semesters');
    if (res.success) {
      const sel = document.getElementById('pt-hocky');
      res.data.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.ma_hoc_ky || s.MaHocKy;
        opt.textContent = (s.ten_hoc_ky || s.TenHocKy) + (s.ten_nam_hoc || s.NamHoc ? ' - ' + (s.ten_nam_hoc || s.NamHoc) : '');
        sel.appendChild(opt);
      });
    }
  } catch(e) {}
})();

function openModal() { document.getElementById('payment-modal').classList.add('active'); }
function closeModal() { document.getElementById('payment-modal').classList.remove('active'); }

async function savePayment() {
  const data = {
    ma_sv: document.getElementById('pt-mssv').value,
    ma_hoc_ky: document.getElementById('pt-hocky').value,
    so_tien: parseInt(document.getElementById('pt-sotien').value),
    phuong_thuc: document.getElementById('pt-phuongthuc').value,
    ghi_chu: document.getElementById('pt-ghichu').value
  };
  try {
    const res = await apiFetch('/api/payments', { method: 'POST', body: data });
    if (res.success) {
      showToast('Lập phiếu thu thành công!', 'success');
      closeModal(); setTimeout(() => location.reload(), 500);
    } else { showToast(res.message || 'Lỗi', 'error'); }
  } catch(e) { showToast('Lỗi kết nối', 'error'); }
}

var searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    window.location.href = '/admin/payments?page=1&search=' + encodeURIComponent(document.getElementById('search-input').value);
  }, 400);
}
