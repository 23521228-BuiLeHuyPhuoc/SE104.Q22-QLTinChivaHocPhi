const fs = require('fs');

const dirs = ['src/controllers', 'src/routes'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(f => {
        if (!f.endsWith('.js')) return;
        let p = dir + '/' + f;
        let content = fs.readFileSync(p, 'utf8');
        
        let modified = content;
        let changed = false;
        modified = modified.replace(/\$\{([^}]+)\}/g, (match, inner) => {
            let newInner = inner.replace(/\."([A-Za-z0-9_]+)"/g, '.$1');
            if (newInner !== inner) changed = true;
            return '${' + newInner + '}';
        });
        
        if (changed) {
            fs.writeFileSync(p, modified, 'utf8');
            console.log('Fixed', p);
        }
    });
});
