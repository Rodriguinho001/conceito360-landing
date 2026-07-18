const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');

const target = 'morro_triangles.bin';
const idx = code.indexOf(target);
if (idx !== -1) {
  console.log('Found morro_triangles.bin at index:', idx);
  console.log('Snippet around it:');
  console.log(code.substring(idx - 200, idx + 800));
} else {
  console.log('Could NOT find morro_triangles.bin in patched file');
}
