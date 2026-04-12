(async function() {
  try {
    const token = getToken();
    const headers = { 'Authorization': 'Bearer ' + token };

    const [studentRes, courseRes, regRes, tuitionRes] = await Promise.all([
      fetch('/api/students/stats', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/courses/stats', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/registrations/stats', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/tuition/stats', { headers }).then(r => r.json()).catch(() => null)
    ]);

    if (studentRes && studentRes.success) {
      document.getElementById('stat-students').textContent = studentRes.data.total || 0;
    }
    if (courseRes && courseRes.success) {
      document.getElementById('stat-courses').textContent = courseRes.data.total || 0;
    }
    if (regRes && regRes.success) {
      document.getElementById('stat-registrations').textContent = regRes.data.totalRegistrations || 0;
    }
    if (tuitionRes && tuitionRes.success) {
      const rev = tuitionRes.data.paidAmount || 0;
      document.getElementById('stat-revenue').textContent = formatCurrency(rev);
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
})();
