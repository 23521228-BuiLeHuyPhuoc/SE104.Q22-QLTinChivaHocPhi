function parseIntegerField(id) {
  var value = Number(document.getElementById(id).value);
  return Number.isInteger(value) ? value : NaN;
}

function normalizeCourseList(value) {
  var seen = {};
  return String(value || '')
    .split(',')
    .map(function(item) { return item.trim(); })
    .filter(Boolean)
    .filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    })
    .join(',');
}

async function saveSettings() {
  var toiThieu = parseIntegerField('st-toithieu');
  var toiDa = parseIntegerField('st-toida');
  var toiDaVuot = parseIntegerField('st-toidavuot');
  var anhVan = normalizeCourseList(document.getElementById('st-anhvan').value);
  var namKiemTra = parseIntegerField('st-namkiemtra');
  var gioiHanAnhVan = parseIntegerField('st-gioihananhvan');
  var gioiHanNoKhoaLuan = parseIntegerField('st-khoaluan-no');

  if (!Number.isInteger(toiThieu) || toiThieu < 1) { showToast('Số tín chỉ tối thiểu phải là số nguyên >= 1', 'error'); return; }
  if (!Number.isInteger(toiDa) || toiDa <= toiThieu) { showToast('Số tín chỉ tối đa phải là số nguyên > tối thiểu', 'error'); return; }
  if (!Number.isInteger(toiDaVuot) || toiDaVuot < toiDa) { showToast('Số tín chỉ tối đa khi vượt phải >= số tín chỉ tối đa', 'error'); return; }
  if (!anhVan) { showToast('Danh sách môn Anh văn không được rỗng', 'error'); return; }
  if (!Number.isInteger(namKiemTra) || namKiemTra < 1) { showToast('Năm kiểm tra Anh văn phải là số nguyên >= 1', 'error'); return; }
  if (!Number.isInteger(gioiHanAnhVan) || gioiHanAnhVan < 1 || gioiHanAnhVan > toiDa) { showToast('Giới hạn tín chỉ Anh văn phải từ 1 đến số tín chỉ tối đa', 'error'); return; }
  if (!Number.isInteger(gioiHanNoKhoaLuan) || gioiHanNoKhoaLuan < 0) { showToast('Giới hạn tín chỉ nợ khóa luận phải là số nguyên không âm', 'error'); return; }

  document.getElementById('st-anhvan').value = anhVan;
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
