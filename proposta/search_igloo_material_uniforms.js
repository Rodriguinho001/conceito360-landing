const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

let pos = 0;
while (true) {
  const idx = code.indexOf('.igloo.mesh.material', pos);
  if (idx === -1) break;
  console.log(`Found .igloo.mesh.material at index ${idx}:`);
  console.log(code.substring(idx - 100, idx + 150));
  pos = idx + 1;
}
