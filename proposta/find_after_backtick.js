const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');
const lastBacktick = code.lastIndexOf('`');
console.log('Last backtick at:', lastBacktick);
console.log(code.substring(lastBacktick + 3050, lastBacktick + 3150));
