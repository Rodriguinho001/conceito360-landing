const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Find variable definitions of le
function findLeDef() {
  const regex = /\b(const|let|var)\s+le\b/g;
  let match;
  const results = [];
  while ((match = regex.exec(code)) !== null) {
    results.push({ idx: match.index, snippet: code.substring(match.index - 50, match.index + 100) });
  }
  return results;
}

console.log("--- le variable definitions ---");
console.log(findLeDef());
