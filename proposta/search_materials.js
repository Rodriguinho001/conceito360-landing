const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Let's find classes/constructors containing "Material"
let pos = 0;
while (true) {
  const idx = code.indexOf('Material', pos);
  if (idx === -1) break;
  // Print 100 chars around it
  console.log(`Found Material at index ${idx}:`);
  console.log(code.substring(idx - 50, idx + 100));
  pos = idx + 1;
}
