async function saveSettings() {
  var toiThieu = parseInt(document.getElementById('st-toithieu').value);
  var toiDa = parseInt(document.getElementById('st-toida').value);
  var toiDaVuot = parseInt(document.getElementById('st-toidavuot').value);

  if (isNaN(toiThieu) || toiThieu < 1) { showToast('Số tín chỉ tối thiểu phải >= 1', 'error'); return; }
  if (isNaN(toiDa) || toiDa <= toiThieu) { showToast('Số tín chỉ tối đa phải > tối thiểu', 'error'); return; }
  if (isNaN(toiDaVuot) || toiDaVuot < toiDa) { showToast('Số tín chỉ vượt phải >= tối đa', 'error'); return; }

  var res = await apiFetch('/api/settings', {
    method: 'PUT',
    body: {
      SoTinChiDangKyToiThieu: toiThieu,
      SoTinChiDangKyToiDa: toiDa,
      SoTinChiDangKyToiDaKhiVuot: toiDaVuot
    }
  });
  if (res.success) {
    showToast(res.message || 'Cập nhật thành công', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}
