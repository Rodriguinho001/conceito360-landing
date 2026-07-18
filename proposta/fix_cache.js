const fs = require('fs');
let code = fs.readFileSync('js/index-2eb69c09.js', 'utf8');
code = code.replace(/import\("\.\/App3D-f554a111\.js(\?v=\d+)?"\)/g, 'import("./App3D-f554a111.js?v=' + Date.now() + '")');
fs.writeFileSync('js/index-2eb69c09.js', code);
console.log('Fixed cache buster!');
