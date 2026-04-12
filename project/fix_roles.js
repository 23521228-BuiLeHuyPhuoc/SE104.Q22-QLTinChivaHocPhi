const fs = require('fs');

const fixInitSql = () => {
    let content = fs.readFileSync('src/config/init.sql', 'utf8');
    // The literal inserts got wrongly changed. Replace '"SINHVIEN"' with 'student' where they are inserted as strings
    content = content.replace(/'"SINHVIEN"'/g, "'student'");
    fs.writeFileSync('src/config/init.sql', content, 'utf8');
    console.log('Fixed Roles back to student in init.sql');
};
fixInitSql();
