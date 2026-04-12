const bcrypt = require('bcryptjs');

const check = async () => {
    const hash = '$2b$10$aMTwtHVFreMooCvW6/aHuucOqzapBULA2NxTuIdnqQjQpf3WBBeY2'; // Admin
    const passList = ['123', 'admin', 'admin123', 'admin@123', 'password', 'student123', '123456'];
    for(let p of passList) {
        if(await bcrypt.compare(p, hash)) {
            console.log('Admin password is:', p);
            return;
        }
    }
    console.log('Admin password NOT match any');
};
check();
