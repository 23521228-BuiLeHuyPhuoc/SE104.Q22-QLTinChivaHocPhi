(async function() {
  try {
    const meRes = await apiFetch('/api/auth/me');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('profile-form').classList.remove('hidden');

    if (meRes.success && meRes.data.student) {
      const s = meRes.data.student;
      document.getElementById('p-mssv').value = s.MaSv || '';
      document.getElementById('p-hoten').value = s.HoTen || '';
      document.getElementById('p-email').value = s.Email || '';
      document.getElementById('p-sdt').value = s.Sdt || '';
      document.getElementById('p-ngaysinh').value = s.NgaySinh ? new Date(s.NgaySinh).toLocaleDateString('vi-VN') : '';
      document.getElementById('p-gioitinh').value = s.GioiTinh || '';
      document.getElementById('p-cmnd').value = s.Cccd || '';
      document.getElementById('p-dantoc').value = (s.DANTOC ? s.DANTOC.TenDanToc : s.MaDanToc) || '';
      document.getElementById('p-diachi').value = s.DiaChiLienHe || '';
      document.getElementById('p-nganh').value = (s.NGANHHOC ? s.NGANHHOC.TenNganh : '') || '';
      document.getElementById('p-khoa').value = (s.NGANHHOC && s.NGANHHOC.KHOA ? s.NGANHHOC.KHOA.TenKhoa : '') || '';
      document.getElementById('p-trangthai').value = s.TrangThai || '';
      // Khoa hoc might need to parse from MaSv or something, leave empty if not available
      document.getElementById('p-khoahoc').value = s.khoa_hoc || '';
    }
  } catch(e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('profile-form').classList.remove('hidden');
    console.error(e);
  }
})();
