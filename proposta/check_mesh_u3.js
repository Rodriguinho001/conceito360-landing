const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

const u3Start = 1173000;
const u3End = 1183000;
const sub = code.substring(u3Start, u3End);

// Find all occurrences of "mesh." or "this.mesh" in this substring
let pos = 0;
while (true) {
  const idx = sub.indexOf('this.mesh', pos);
  if (idx === -1) break;
  console.log(`Found this.mesh at index ${u3Start + idx}:`);
  console.log(sub.substring(idx - 50, idx + 100));
  pos = idx + 9;
}
