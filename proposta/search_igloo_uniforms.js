const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

let pos = 0;
while (true) {
  const idx = code.indexOf('.mesh.material.uniforms', pos);
  if (idx === -1) break;
  // Print snippet
  console.log(`Found .mesh.material.uniforms at index ${idx}:`);
  console.log(code.substring(idx - 100, idx + 100));
  pos = idx + 1;
}
