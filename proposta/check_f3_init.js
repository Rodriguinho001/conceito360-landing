const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

const target = 'class F3 extends Jo';
const idx = code.indexOf(target);
if (idx !== -1) {
  console.log('Found class F3 at index:', idx);
  console.log(code.substring(idx, idx + 3000));
} else {
  console.log('class F3 not found');
}
