async function saveSettings() {
  var toiThieu = parseInt(document.getElementById('st-toithieu').value);
  var toiDa = parseInt(document.getElementById('st-toida').value);
  var toiDaVuot = parseInt(document.getElementById('st-toidavuot').value);
  var anhVan = document.getElementById('st-anhvan').value.trim();
  var namKiemTra = parseInt(document.getElementById('st-namkiemtra').value);
  var gioiHanAnhVan = parseInt(document.getElementById('st-gioihananhvan').value);
  var gioiHanNoKhoaLuan = parseInt(document.getElementById('st-khoaluan-no').value);

  if (isNaN(toiThieu) || toiThieu < 1) { showToast('Số tín chỉ tối thiểu phải >= 1', 'error'); return; }
  if (isNaN(toiDa) || toiDa <= toiThieu) { showToast('Số tín chỉ tối đa phải > tối thiểu', 'error'); return; }
  if (isNaN(toiDaVuot) || toiDaVuot < toiDa) { showToast('Số tín chỉ vượt phải >= tối đa', 'error'); return; }
  if (!anhVan) { showToast('Danh sách môn Anh văn không được rỗng', 'error'); return; }
  if (isNaN(namKiemTra) || namKiemTra < 1) { showToast('Năm kiểm tra Anh văn phải >= 1', 'error'); return; }
  if (isNaN(gioiHanAnhVan) || gioiHanAnhVan < 1) { showToast('Giới hạn tín chỉ Anh văn phải >= 1', 'error'); return; }
  if (isNaN(gioiHanNoKhoaLuan) || gioiHanNoKhoaLuan < 0) { showToast('Giới hạn tín chỉ nợ khóa luận phải >= 0', 'error'); return; }

  var res = await apiFetch('/api/settings', {
    method: 'PUT',
    body: {
      SoTinChiDangKyToiThieu: toiThieu,
      SoTinChiDangKyToiDa: toiDa,
      SoTinChiDangKyToiDaKhiVuot: toiDaVuot,
      DanhSachMonAnhVanBatBuoc: anhVan,
      NamKiemTraAnhVan: namKiemTra,
      GioiHanTinChiChuaDatAnhVan: gioiHanAnhVan,
      GioiHanTinChiNoKhoaLuan: gioiHanNoKhoaLuan
    }
  });
  if (res.success) {
    showToast(res.message || 'Cập nhật thành công', 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}
