const fs = require('fs');
let code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');
code = 'console.log("[App3D] CACHE CLEARED v2 LOADED");\n' + code;
fs.writeFileSync('js/App3D-f554a111.js', code);
console.log('Added log');
