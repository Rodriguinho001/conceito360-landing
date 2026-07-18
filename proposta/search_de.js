const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

let pos = 0;
while (true) {
  const idx = code.indexOf('DE', pos);
  if (idx === -1) break;
  // Print snippet if it is a whole word DE or looks interesting
  const prev = code[idx - 1];
  const next = code[idx + 2];
  const isWord = /[^a-zA-Z0-9_$]/.test(prev) && /[^a-zA-Z0-9_$]/.test(next);
  if (isWord || code.substring(idx - 10, idx + 10).includes('new')) {
    console.log(`Found DE at index ${idx}:`);
    console.log(code.substring(idx - 50, idx + 100));
  }
  pos = idx + 1;
}
