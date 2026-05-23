const pug = require('pug');
const path = require('path');

const viewsDir = path.join(__dirname, 'src', 'views');

const tests = [
  ['no var', `extends ../../layouts/student

block content
  .page-shell
    h2 Hello World

block scripts
  script(src="/js/student/dashboard.js")
`],
  ['with var', `extends ../../layouts/student

block content
  .page-shell
    - var studentName = 'Test'
    h2 Hello #{studentName}

block scripts
  script(src="/js/student/dashboard.js")
`],
  ['with const', `extends ../../layouts/student

block content
  .page-shell
    - const studentName = 'Test'
    h2 Hello #{studentName}

block scripts
  script(src="/js/student/dashboard.js")
`],
  ['with let', `extends ../../layouts/student

block content
  .page-shell
    - let studentName = 'Test'
    h2 Hello #{studentName}

block scripts
  script(src="/js/student/dashboard.js")
`],
  ['actual dashboard file', null],
];

for (const [name, tmpl] of tests) {
  try {
    let fn;
    if (tmpl === null) {
      fn = pug.compileFile(path.join(viewsDir, 'pages/student/dashboard.pug'), { basedir: viewsDir });
    } else {
      fn = pug.compile(tmpl, {
        basedir: viewsDir,
        filename: path.join(viewsDir, 'pages/student/dashboard.pug')
      });
    }
    fn({
      pageTitle: 'Test',
      activePage: 'dashboard',
      headerTitle: 'Test',
      user: { Role: 'student', HoTen: 'Test', username: 'test' },
    });
    console.log(`OK: ${name}`);
  } catch (e) {
    console.log(`ERROR: ${name} => ${e.message}`);
  }
}
