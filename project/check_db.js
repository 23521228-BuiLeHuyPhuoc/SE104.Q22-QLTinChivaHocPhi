const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  try {
    const users = await p.$queryRawUnsafe('SELECT "MaTaiKhoan", "TenDangNhap", "MatKhau", "Role" FROM "NGUOIDUNG" LIMIT 5');
    console.log('Users found:', users.length);
    
    for (const u of users) {
      console.log(`\nUser: ${u.TenDangNhap} (Role: ${u.Role})`);
      console.log(`Hash: ${u.MatKhau}`);
      
      // Check if password is already bcrypt hash
      const isBcrypt = u.MatKhau && u.MatKhau.startsWith('$2');
      console.log(`Is bcrypt hash: ${isBcrypt}`);
      
      if (isBcrypt) {
        // Try common passwords
        const passwords = ['123', 'admin', 'admin123', '123456', 'password', u.TenDangNhap];
        for (const pwd of passwords) {
          const match = await bcrypt.compare(pwd, u.MatKhau);
          if (match) {
            console.log(`  => Password matches: "${pwd}"`);
            break;
          }
        }
      } else {
        console.log(`  => Plain text password: "${u.MatKhau}"`);
      }
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
  await p.$disconnect();
}
main();
