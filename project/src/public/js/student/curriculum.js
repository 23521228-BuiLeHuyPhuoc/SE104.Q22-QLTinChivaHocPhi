var curriculumState = { semesters: [], courses: [], summary: {} };

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function statusMeta(status) {
  if (status === 'passed') return { text: 'Da qua', cls: 'badge-success' };
  if (status === 'registered') return { text: 'Dang hoc', cls: 'badge-info' };
  if (status === 'failed') return { text: 'Rot', cls: 'badge-error' };
  return { text: 'Chua hoc', cls: 'badge-secondary' };
}

function renderCurriculum() {
  var container = document.getElementById('curriculum-container');
  var selectedStatus = document.getElementById('status-filter').value;
  var courses = curriculumState.courses.filter(function(course) {
    return !selectedStatus || course.status === selectedStatus;
  });
  var groups = (curriculumState.semesters || []).map(function(group) {
    return {
      HocKyDuKien: group.HocKyDuKien,
      courses: courses.filter(function(course) { return Number(course.HocKyDuKien) === Number(group.HocKyDuKien); })
    };
  });
  var html = '';
  groups.forEach(function(group) {
    html += '<div class="curriculum-semester"><div class="curriculum-semester-header"><span class="badge badge-primary">HK ' + escapeHtml(group.HocKyDuKien) + '</span>' + escapeHtml(group.courses.length + ' mon') + '</div><div class="curriculum-courses">';
    group.courses.forEach(function(course) {
      var meta = statusMeta(course.status);
      var prereqText = (course.prerequisites || []).map(function(item) {
        return (item.MaMonDieuKien || '') + ' - ' + (item.TenMonDieuKien || '');
      }).join('\n') || 'Khong co mon dieu kien';
      html += '<div class="curriculum-course" title="' + escapeHtml(prereqText) + '">' +
        '<div class="course-info"><div class="course-name">' + escapeHtml(course.TenMonHoc || 'N/A') + '</div><div class="course-code">' + escapeHtml(course.MaMonHoc || '') + '</div></div>' +
        '<div class="course-credits">' + Number(course.SoTinChi || 0) + ' TC</div>' +
        '<span class="badge ' + meta.cls + '">' + meta.text + '</span>' +
      '</div>';
    });
    if (!group.courses.length) html += '<div class="empty-state">Khong co mon phu hop</div>';
    html += '</div></div>';
  });
  container.innerHTML = html || '<div class="empty-state">Chua co du lieu chuong trinh dao tao</div>';
}

document.addEventListener('DOMContentLoaded', async function() {
  var container = document.getElementById('curriculum-container');
  var creditsDone = document.getElementById('credits-done');
  var creditsTotal = document.getElementById('credits-total');
  var creditsPercent = document.getElementById('credits-percent');
  var creditsBar = document.getElementById('credits-bar');
  var debtCredits = document.getElementById('debt-credits');
  var thesisStatus = document.getElementById('thesis-status');
  var statusFilter = document.getElementById('status-filter');
  if (statusFilter) statusFilter.addEventListener('change', renderCurriculum);

  try {
    var res = await apiFetch('/api/courses/curriculum/me');
    if (!res || !res.success || !res.data) {
      container.innerHTML = '<div class="empty-state">Khong the tai chuong trinh dao tao</div>';
      return;
    }

    curriculumState = {
      semesters: res.data.semesters || [],
      courses: res.data.courses || [],
      summary: res.data.summary || {}
    };
    var summary = curriculumState.summary;
    var totalCredits = Number(summary.totalCredits || 0);
    var completedCredits = Number(summary.completedCredits || 0);
    var pct = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;

    if (creditsDone) creditsDone.textContent = completedCredits;
    if (creditsTotal) creditsTotal.textContent = totalCredits;
    if (creditsPercent) creditsPercent.textContent = Math.min(pct, 100) + '%';
    if (creditsBar) creditsBar.style.width = Math.min(pct, 100) + '%';
    if (debtCredits) debtCredits.textContent = Number(summary.debtCredits || summary.remainingCredits || 0) + ' TC';
    if (thesisStatus) {
      thesisStatus.textContent = summary.thesisEligible ? 'Du dieu kien dang ky khoa luan' : 'Chua du dieu kien dang ky khoa luan';
      thesisStatus.className = summary.thesisEligible ? 'badge badge-success' : 'badge badge-error';
    }

    if (!curriculumState.courses.length && !curriculumState.semesters.length) {
      container.innerHTML = '<div class="empty-state">Chua co du lieu chuong trinh dao tao cho nganh cua ban</div>';
      return;
    }
    renderCurriculum();
  } catch (err) {
    console.error('Curriculum error:', err);
    container.innerHTML = '<div class="empty-state text-error">Da xay ra loi khi tai chuong trinh dao tao</div>';
  }
});
