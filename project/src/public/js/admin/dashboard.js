(async function() {
  try {
    const res = await apiFetch('/api/dashboard/stats');
    if (!res || res.success === false) return;
    const stats = res.data || {};

    var students = document.getElementById('stat-students');
    var courses = document.getElementById('stat-courses');
    var registrations = document.getElementById('stat-registrations');
    var revenue = document.getElementById('stat-revenue');

    if (students) students.textContent = stats.totalStudents || 0;
    if (courses) courses.textContent = stats.totalCourses || 0;
    if (registrations) registrations.textContent = stats.registrations || 0;
    if (revenue) revenue.textContent = formatCurrency(stats.paidAmount || 0);
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
})();
