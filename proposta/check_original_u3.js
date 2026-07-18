const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

const target = 'class U3';
const idx = code.indexOf(target);
if (idx !== -1) {
  console.log('Found class U3 at index:', idx);
  // Let's print the first 10000 characters of class U3
  console.log(code.substring(idx, idx + 10000));
} else {
  console.log('class U3 not found in original');
}
