const http = require('http');

// Step 1: Login
const loginReq = http.request({
  hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    if (!j.success) { console.log('Login failed:', d); return; }
    console.log('Login OK');
    const token = j.data.token;

    // Step 2: Access dashboard with cookie
    const dashReq = http.request({
      hostname: 'localhost', port: 5000, path: '/student/dashboard', method: 'GET',
      headers: { Cookie: 'token=' + token }
    }, res2 => {
      let d2 = '';
      res2.on('data', c => d2 += c);
      res2.on('end', () => {
        console.log('Dashboard status:', res2.statusCode);
        if (res2.statusCode !== 200) {
          console.log('Response body:', d2.substring(0, 3000));
        } else {
          console.log('Dashboard rendered OK, length:', d2.length);
        }
      });
    });
    dashReq.end();
  });
});
loginReq.write(JSON.stringify({ username: '22520001', password: 'student123' }));
loginReq.end();
