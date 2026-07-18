const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');

const u3Idx = code.indexOf('class U3');
const fragIdx = code.indexOf('fragmentShader:`', u3Idx);
const fragEndIdx = code.indexOf('`});', fragIdx);
console.log(code.substring(fragIdx, fragIdx + 200));
