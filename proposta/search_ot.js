const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

let pos = 0;
while (true) {
  const idx = code.indexOf('class ot', pos);
  if (idx === -1) break;
  console.log(`Found class ot at index ${idx}:`);
  console.log(code.substring(idx - 100, idx + 200));
  pos = idx + 1;
}
