const fs = require('fs');

const filePath = 'app/admin/store/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/console\.error\("([^"]+)",\s*error\)/g, 'console.error("$1", String(error))');
content = content.replace(/console\.error\(error\)/g, 'console.error(String(error))');

fs.writeFileSync(filePath, content);
console.log('Fixed console.error in Store Page.');
