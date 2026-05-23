const bcrypt = require('bcryptjs');

async function main() {
  const hash = '$2b$10$i04Sd3Yr.zmOypY1FGMpbu81qNNYBqkwFQMQKKzxHGHIupZO19uPi';
  const passwords = ['123', 'admin', 'admin123', '123456', 'password', 'student', 'student123', '22520001', 'sinhvien', 'sinhvien123', 'abc123', '12345678', '1234567890'];
  for (const pwd of passwords) {
    if (await bcrypt.compare(pwd, hash)) {
      console.log('Student password:', pwd);
      return;
    }
  }
  console.log('Student password not found in list');
}
main();
