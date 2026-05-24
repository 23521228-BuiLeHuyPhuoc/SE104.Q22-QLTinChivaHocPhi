var searchTimer;

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function() { applyFilters(); }, 400);
}

function applyFilters() {
  var search = document.getElementById('search-input').value;
  var status = document.getElementById('filter-status').value;
  var url = '/admin/registrations?page=1';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (status) url += '&status=' + encodeURIComponent(status);
  window.location.href = url;
}

function closeRegistrationDetail() {
  var modal = document.getElementById('registration-detail-modal');
  if (modal) modal.classList.remove('active');
}

function registrationEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function registrationTypeLabel(type) {
  if (type === 'hoc_lai') return 'Học lại';
  if (type === 'hoc_cai_thien') return 'Học cải thiện';
  if (type === 'hoc_he') return 'Học hè';
  return 'Học mới';
}

async function loadAllStudentRegistrationCourses(maSv) {
  var courses = [];
  var page = 1;
  var totalPages = 1;
  do {
    var res = await apiFetch('/api/registrations/student/' + encodeURIComponent(maSv) + '?page=' + page);
    if (!res || res.success === false) throw new Error((res && res.message) || 'Không tải được chi tiết đăng ký');
    courses = courses.concat((res.data && res.data.courses) || []);
    totalPages = Number(res.pagination && res.pagination.totalPages || 1);
    page += 1;
  } while (page <= totalPages);
  return courses;
}

function renderStudentRegistrationDetail(maSv, courses) {
  var content = document.getElementById('registration-detail-content');
  if (!content) return;

  var grouped = courses.reduce(function(acc, item) {
    var semester = item.PHIEUDANGKY && item.PHIEUDANGKY.HOCKY
      ? item.PHIEUDANGKY.HOCKY.TenHocKy + (item.PHIEUDANGKY.HOCKY.NAMHOC && item.PHIEUDANGKY.HOCKY.NAMHOC.TenNamHoc ? ' - ' + item.PHIEUDANGKY.HOCKY.NAMHOC.TenNamHoc : '')
      : 'Chưa rõ học kỳ';
    if (!acc[semester]) acc[semester] = [];
    acc[semester].push(item);
    return acc;
  }, {});

  var rows = Object.keys(grouped).map(function(semester) {
    var courseRows = grouped[semester].map(function(item) {
      var course = item.LOP && item.LOP.MONHOC ? item.LOP.MONHOC : {};
      return '<tr>' +
        '<td class="mono">' + registrationEscapeHtml(item.MaMonHoc || course.MaMonHoc || '-') + '</td>' +
        '<td>' + registrationEscapeHtml(course.TenMonHoc || '-') + '</td>' +
        '<td class="mono">' + registrationEscapeHtml(item.MaLop || '-') + '</td>' +
        '<td>' + Number(item.SoTinChi || 0) + '</td>' +
        '<td>' + registrationEscapeHtml(registrationTypeLabel(item.LoaiDangKy)) + '</td>' +
        '<td>' + formatCurrency(item.ThanhTien || 0) + '</td>' +
        '<td>' + registrationEscapeHtml(item.TrangThai || '-') + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="mt-3">' +
      '<h4>' + registrationEscapeHtml(semester) + '</h4>' +
      '<div class="table-container"><table class="data-table"><thead><tr>' +
        '<th>Mã môn</th><th>Tên môn</th><th>Lớp</th><th>Tín chỉ</th><th>Loại đăng ký</th><th>Học phí</th><th>Trạng thái</th>' +
      '</tr></thead><tbody>' + courseRows + '</tbody></table></div>' +
    '</div>';
  }).join('');

  content.innerHTML =
    '<div class="detail-grid">' +
      '<div><strong>MSSV</strong><span>' + registrationEscapeHtml(maSv) + '</span></div>' +
      '<div><strong>Tổng môn đăng ký</strong><span>' + courses.length + '</span></div>' +
      '<div><strong>Tổng tín chỉ</strong><span>' + courses.reduce(function(sum, item) { return sum + Number(item.SoTinChi || 0); }, 0) + '</span></div>' +
    '</div>' +
    (rows || '<div class="empty-state mt-3">Sinh viên chưa có môn đăng ký</div>');
}

async function openStudentRegistrationDetail(maSv) {
  var modal = document.getElementById('registration-detail-modal');
  var content = document.getElementById('registration-detail-content');
  if (!modal || !content) return;
  modal.classList.add('active');
  content.textContent = 'Đang tải...';

  try {
    var courses = await loadAllStudentRegistrationCourses(maSv);
    renderStudentRegistrationDetail(maSv, courses);
  } catch (error) {
    content.textContent = error.message || 'Không tải được chi tiết đăng ký';
  }
}
