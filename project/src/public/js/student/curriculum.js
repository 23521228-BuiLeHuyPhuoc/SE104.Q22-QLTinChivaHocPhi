document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('curriculum-container');
  const creditsDone = document.getElementById('credits-done');
  const creditsTotal = document.getElementById('credits-total');
  const creditsBar = document.getElementById('credits-bar');

  try {
    // Fetch courses data
    let courses = [];
    try {
      const res = await apiFetch('/api/courses');
      if (res && res.success && res.data) {
        courses = Array.isArray(res.data) ? res.data : (res.data.rows || res.data.courses || []);
      }
    } catch (e) {
      console.log('Could not fetch courses:', e);
    }

    if (!courses || courses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h4>Chương trình đào tạo</h4>
          <p>Dữ liệu chương trình đào tạo đang được cập nhật. Vui lòng thử lại sau.</p>
        </div>`;
      return;
    }

    // Group by some criteria (semester or department)
    const totalCredits = courses.reduce((sum, c) => sum + (c.SoTinChi || 0), 0);
    const completedCredits = 0; // Would need grade data

    if (creditsDone) creditsDone.textContent = completedCredits;
    if (creditsTotal) creditsTotal.textContent = totalCredits;
    if (creditsBar) {
      const pct = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;
      creditsBar.style.width = pct + '%';
    }

    // Render courses as a list
    let html = '';
    const grouped = {};
    courses.forEach(c => {
      const type = c.LoaiMon || 'LT';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(c);
    });

    Object.entries(grouped).forEach(([type, items]) => {
      const typeName = type === 'LT' ? 'Lý thuyết' : 'Thực hành';
      html += `
        <div class="curriculum-semester">
          <div class="curriculum-semester-header">
            <span class="badge ${type === 'LT' ? 'badge-primary' : 'badge-success'}">${type}</span>
            ${typeName} — ${items.length} môn
          </div>
          <div class="curriculum-courses">`;

      items.forEach(c => {
        html += `
            <div class="curriculum-course">
              <div class="course-info">
                <div class="course-name">${c.TenMonHoc || c.ten_mon_hoc || 'N/A'}</div>
                <div class="course-code">${c.MaMonHoc || c.ma_mon_hoc || ''}</div>
              </div>
              <div class="course-credits">${c.SoTinChi || c.so_tin_chi || 0} TC</div>
              <span class="badge badge-secondary">Chưa học</span>
            </div>`;
      });

      html += `
          </div>
        </div>`;
    });

    container.innerHTML = html;

  } catch (err) {
    console.error('Curriculum error:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h4>Không thể tải dữ liệu</h4>
        <p>Đã xảy ra lỗi khi tải chương trình đào tạo.</p>
      </div>`;
  }
});
