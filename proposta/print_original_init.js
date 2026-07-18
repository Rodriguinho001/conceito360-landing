const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');
console.log(code.substring(1179800, 1181500));
