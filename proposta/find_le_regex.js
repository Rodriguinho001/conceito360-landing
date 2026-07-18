const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Find all indexes of \ble\s*=
const regex = /\ble\s*=/g;
let match;
const results = [];
while ((match = regex.exec(code)) !== null) {
  results.push({ idx: match.index, snippet: code.substring(match.index - 50, match.index + 100) });
}

console.log("--- \ble\s*= matches ---");
console.log(results.slice(0, 15));
