function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async function() {
  var container = document.getElementById('curriculum-container');
  var creditsDone = document.getElementById('credits-done');
  var creditsTotal = document.getElementById('credits-total');
  var creditsBar = document.getElementById('credits-bar');

  try {
    var res = await apiFetch('/api/courses/curriculum/me');
    if (!res || !res.success || !res.data) {
      container.innerHTML = '<div class="empty-state">Không thể tải chương trình đào tạo</div>';
      return;
    }

    var courses = res.data.courses || [];
    var summary = res.data.summary || {};
    var totalCredits = Number(summary.totalCredits || 0);
    var completedCredits = Number(summary.completedCredits || 0);

    if (creditsDone) creditsDone.textContent = completedCredits;
    if (creditsTotal) creditsTotal.textContent = totalCredits;
    if (creditsBar) {
      var pct = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;
      creditsBar.style.width = Math.min(pct, 100) + '%';
    }

    if (!courses.length) {
      container.innerHTML = '<div class="empty-state">Chưa có dữ liệu chương trình đào tạo cho ngành của bạn</div>';
      return;
    }

    var grouped = {};
    courses.forEach(function(course) {
      var semester = course.HocKyDuKien || 'Khác';
      if (!grouped[semester]) grouped[semester] = [];
      grouped[semester].push(course);
    });

    var html = '';
    Object.keys(grouped).sort(function(a, b) {
      return Number(a) - Number(b);
    }).forEach(function(semester) {
      var items = grouped[semester];
      html += '<div class="curriculum-semester">';
      html += '<div class="curriculum-semester-header">';
      html += '<span class="badge badge-primary">' + (semester === 'Khác' ? 'Khác' : 'HK ' + escapeHtml(semester)) + '</span>';
      html += escapeHtml(items.length + ' môn');
      html += '</div>';
      html += '<div class="curriculum-courses">';

      items.forEach(function(course) {
        var statusText = 'Chưa học';
        var statusClass = 'badge-secondary';
        if (course.status === 'passed') {
          statusText = 'Đã đạt';
          statusClass = 'badge-success';
        } else if (course.status === 'failed') {
          statusText = 'Rớt';
          statusClass = 'badge-error';
        }

        html += '<div class="curriculum-course">';
        html += '<div class="course-info">';
        html += '<div class="course-name">' + escapeHtml(course.TenMonHoc || 'N/A') + '</div>';
        html += '<div class="course-code">' + escapeHtml(course.MaMonHoc || '') + '</div>';
        html += '</div>';
        html += '<div class="course-credits">' + Number(course.SoTinChi || 0) + ' TC</div>';
        html += '<span class="badge ' + statusClass + '">' + statusText + '</span>';
        html += '</div>';
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
  } catch (err) {
    console.error('Curriculum error:', err);
    container.innerHTML = '<div class="empty-state text-error">Đã xảy ra lỗi khi tải chương trình đào tạo</div>';
  }
});
