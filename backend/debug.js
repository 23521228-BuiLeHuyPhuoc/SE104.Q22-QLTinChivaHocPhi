const fs = require('fs');
const c = fs.readFileSync('src/controllers/authController.js', 'utf-8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('`')) {
    console.log(`L${i+1}: ${lines[i].trim().substring(0, 100)}`);
  }
}
console.log('---');
// Also check if we're looking at original or transformed
console.log('Contains ma_sv?', c.includes('ma_sv'));
console.log('Contains MaSv?', c.includes('MaSv'));
console.log('Contains "MaSv"?', c.includes('"MaSv"'));
