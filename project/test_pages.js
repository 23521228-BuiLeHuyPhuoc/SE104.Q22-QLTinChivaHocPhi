async function test() {
  // Login
  const loginRes = await fetch('http://localhost:5000/api/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const data = await loginRes.json();
  const token = data.data.token;
  
  console.log('=== SIDEBAR CHECK ===');
  const r = await fetch('http://localhost:5000/admin/dashboard', {
    headers: { Cookie: 'token=' + token }
  });
  const html = await r.text();
  const sidebarLinks = (html.match(/sidebar-link/g) || []).length;
  console.log('Sidebar links:', sidebarLinks);
  
  console.log('\n=== ALL PAGES ===');
  const pages = ['dashboard', 'students', 'courses', 'classes', 'semesters',
    'faculties', 'majors', 'completed-courses', 'registrations', 'tuition', 'payments',
    'pricing', 'beneficiaries', 'reports', 'users', 'permissions', 'notifications', 'settings'];
  
  for (const p of pages) {
    try {
      const pr = await fetch('http://localhost:5000/admin/' + p, { headers: { Cookie: 'token=' + token } });
      const status = pr.status;
      const phtml = await pr.text();
      const hasMainContent = phtml.includes('main') && phtml.includes('page-content');
      console.log(p.padEnd(20) + ': ' + status + (hasMainContent ? ' OK' : ' ERROR'));
    } catch(e) {
      console.log(p.padEnd(20) + ': FETCH_ERROR ' + e.message);
    }
  }
  
  console.log('\n=== API ENDPOINTS ===');
  const apiTests = [
    ['GET', '/api/permissions/groups'],
    ['GET', '/api/permissions/functions'],
    ['GET', '/api/faculties'],
    ['GET', '/api/majors'],
    ['GET', '/api/pricing'],
    ['GET', '/api/settings'],
    ['GET', '/api/beneficiaries'],
    ['GET', '/api/completed-courses']
  ];
  
  for (const [method, url] of apiTests) {
    try {
      const ar = await fetch('http://localhost:5000' + url, {
        method,
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const aj = await ar.json();
      console.log(url.padEnd(35) + ': ' + ar.status + ' success=' + aj.success);
    } catch(e) {
      console.log(url.padEnd(35) + ': ERROR ' + e.message);
    }
  }
  
  process.exit(0);
}
test();
