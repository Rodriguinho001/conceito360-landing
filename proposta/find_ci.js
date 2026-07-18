const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Find where cI is defined
function findCI() {
  let pos = 0;
  const matches = [];
  while (true) {
    const idx = code.indexOf('cI=', pos);
    if (idx === -1) break;
    matches.push({ idx, snippet: code.substring(idx - 100, idx + 100) });
    pos = idx + 3;
  }
  return matches;
}

console.log("--- cI DEFINITIONS ---");
console.log(findCI());
