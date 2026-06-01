var editingId = null;
var searchTimer;

function courseEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function syncCredits() {
  var type = document.getElementById('mh-loai').value;
  var lessons = parseInt(document.getElementById('mh-sotiet').value, 10) || 0;
  var divisor = type === 'TH' ? 30 : 15;
  document.getElementById('mh-tc').value = Math.max(1, Math.floor(lessons / divisor) || 1);
}

document.addEventListener('DOMContentLoaded', function() {
  var type = document.getElementById('mh-loai');
  var lessons = document.getElementById('mh-sotiet');
  if (type) type.addEventListener('change', syncCredits);
  if (lessons) lessons.addEventListener('input', syncCredits);
});

function openModal(mode, c) {
  editingId = null;
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Sua mon hoc' : 'Them mon hoc';
  document.getElementById('mh-ma').disabled = mode === 'edit';

  if (mode === 'edit' && c) {
    editingId = c.MaMonHoc;
    document.getElementById('mh-ma').value = c.MaMonHoc || '';
    document.getElementById('mh-ten').value = c.TenMonHoc || '';
    document.getElementById('mh-makhoa').value = c.MaKhoa || '';
    document.getElementById('mh-loai').value = c.LoaiMon || 'LT';
    document.getElementById('mh-sotiet').value = c.SoTiet || 45;
    document.getElementById('mh-tc').value = c.SoTinChi || 3;
    document.getElementById('mh-mota').value = c.MoTa || '';
  } else {
    document.getElementById('course-form').reset();
    document.getElementById('mh-loai').value = 'LT';
    document.getElementById('mh-sotiet').value = 45;
    syncCredits();
  }

  document.getElementById('course-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('course-modal').classList.remove('active');
}

async function saveCourse() {
  var data = {
    MaMonHoc: document.getElementById('mh-ma').value.trim(),
    TenMonHoc: document.getElementById('mh-ten').value.trim(),
    MaKhoa: document.getElementById('mh-makhoa').value,
    LoaiMon: document.getElementById('mh-loai').value,
    SoTiet: parseInt(document.getElementById('mh-sotiet').value, 10),
    MoTa: document.getElementById('mh-mota').value.trim() || null
  };

  try {
    var res = editingId
      ? await apiFetch('/api/courses/' + editingId, { method: 'PUT', body: data })
      : await apiFetch('/api/courses', { method: 'POST', body: data });

    if (res.success) {
      showToast(editingId ? 'Cap nhat mon hoc thanh cong' : 'Them mon hoc thanh cong', 'success');
      closeModal();
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Khong the luu mon hoc', 'error');
    }
  } catch (e) {
    showToast('Loi ket noi', 'error');
  }
}

async function deleteCourse(id) {
  if (!confirm('Ban co chac muon xoa mon hoc nay?')) return;
  try {
    var res = await apiFetch('/api/courses/' + id, { method: 'DELETE' });
    if (res.success) {
      showToast('Da xoa mon hoc', 'success');
      setTimeout(function() { location.reload(); }, 500);
    } else {
      showToast(res.message || 'Khong the xoa mon hoc', 'error');
    }
  } catch (e) {
    showToast('Loi ket noi', 'error');
  }
}

function applyCourseFilters() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input').value.trim();
  var faculty = document.getElementById('faculty-filter').value;
  var type = document.getElementById('type-filter').value;
  params.set('page', '1');
  if (search) params.set('search', search);
  if (faculty) params.set('MaKhoa', faculty);
  if (type) params.set('LoaiMon', type);
  window.location.href = '/admin/courses?' + params.toString();
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyCourseFilters, 400);
}

async function exportCourses() {
  var params = new URLSearchParams();
  var search = document.getElementById('search-input').value.trim();
  var faculty = document.getElementById('faculty-filter').value;
  var type = document.getElementById('type-filter').value;
  if (search) params.set('search', search);
  if (faculty) params.set('MaKhoa', faculty);
  if (type) params.set('LoaiMon', type);
  var headers = {};
  var token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  var response = await fetch('/api/courses/export?' + params.toString(), { headers: headers });
  if (!response.ok) {
    showToast('Khong the xuat Excel', 'error');
    return;
  }
  var blob = await response.blob();
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = 'courses.xls';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function closeCourseDetail() {
  document.getElementById('course-detail-modal').classList.remove('active');
}

async function openCourseDetail(id) {
  var modal = document.getElementById('course-detail-modal');
  var content = document.getElementById('course-detail-content');
  modal.classList.add('active');
  content.textContent = 'Dang tai...';
  try {
    var res = await apiFetch('/api/courses/' + encodeURIComponent(id));
    if (!res.success) throw new Error(res.message || 'Khong tai duoc chi tiet');
    var c = res.data || {};
    var prereqs = (c.prerequisites || []).map(function(item) {
      return '<li><span class="mono">' + courseEscapeHtml(item.MaMonDieuKien) + '</span> - ' + courseEscapeHtml(item.TenMonDieuKien) + ' (' + courseEscapeHtml(item.LoaiDieuKien) + ')</li>';
    }).join('');
    var classes = (c.openedClasses || []).map(function(item) {
      return '<tr><td class="mono">' + courseEscapeHtml(item.MaLop) + '</td><td>' + courseEscapeHtml(item.TenLop) + '</td><td>' + courseEscapeHtml(item.GiangVien || '-') + '</td><td>' + courseEscapeHtml((item.TenHocKy || item.MaHocKy || '-') + (item.TenNamHoc ? ' - ' + item.TenNamHoc : '')) + '</td></tr>';
    }).join('');
    var curricula = (c.curricula || []).map(function(item) {
      return '<li>' + courseEscapeHtml(item.TenNganh || item.MaNganh) + ' - HK ' + courseEscapeHtml(item.HocKyDuKien) + ' - ' + (item.BatBuoc ? 'Bat buoc' : 'Tu chon') + '</li>';
    }).join('');
    content.innerHTML =
      '<div class="detail-grid">' +
        '<div><strong>Ma mon</strong><span>' + courseEscapeHtml(c.MaMonHoc) + '</span></div>' +
        '<div><strong>Ten mon</strong><span>' + courseEscapeHtml(c.TenMonHoc) + '</span></div>' +
        '<div><strong>Khoa</strong><span>' + courseEscapeHtml(c.TenKhoa || c.MaKhoa) + '</span></div>' +
        '<div><strong>Tin chi</strong><span>' + Number(c.SoTinChi || 0) + '</span></div>' +
      '</div>' +
      '<h4>Mon dieu kien</h4><ul>' + (prereqs || '<li>Khong co</li>') + '</ul>' +
      '<h4>Chuong trinh dao tao</h4><ul>' + (curricula || '<li>Chua gan vao chuong trinh</li>') + '</ul>' +
      '<h4>Lop da mo</h4><div class="table-container"><table class="data-table"><thead><tr><th>Ma lop</th><th>Ten lop</th><th>Giang vien</th><th>Hoc ky</th></tr></thead><tbody>' + (classes || '<tr><td colspan="4"><div class="empty-state">Chua mo lop</div></td></tr>') + '</tbody></table></div>';
  } catch (error) {
    content.textContent = error.message || 'Khong tai duoc chi tiet';
  }
}
