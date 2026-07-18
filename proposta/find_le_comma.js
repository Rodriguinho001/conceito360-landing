const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Find all indexes of "le=" or ",le=" or "le = new"
let pos = 0;
const matches = [];
while (true) {
  const idx = code.indexOf('le=', pos);
  if (idx === -1) break;
  // Print context
  matches.push({ idx, snippet: code.substring(idx - 100, idx + 100) });
  pos = idx + 3;
}

// Sort matches by index and print the first 10
matches.sort((a, b) => a.idx - b.idx);
console.log("First 10 matches:");
console.log(matches.slice(0, 10));
