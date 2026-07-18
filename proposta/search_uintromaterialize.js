const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

let pos = 0;
while (true) {
  const idx = code.indexOf('uIntroMaterialize', pos);
  if (idx === -1) break;
  console.log(`Found uIntroMaterialize at index ${idx}:`);
  console.log(code.substring(idx - 150, idx + 150));
  pos = idx + 1;
}
