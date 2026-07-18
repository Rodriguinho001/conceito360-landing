const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

const materials = ['MeshBasicMaterial', 'MeshStandardMaterial', 'ShaderMaterial', 'MeshPhongMaterial'];
for (const mat of materials) {
  const idx = code.indexOf(mat);
  if (idx !== -1) {
    console.log(`Found ${mat} at index ${idx}:`);
    console.log(code.substring(idx - 100, idx + 100));
  } else {
    console.log(`${mat} not found`);
  }
}
