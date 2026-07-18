const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Find all matches for "u1 = " or "u1=" or "const u1="
const matches = [];
let idx = 0;
while (true) {
  idx = code.indexOf('u1', idx);
  if (idx === -1) break;
  // check if it's a variable assignment
  const context = code.substring(Math.max(0, idx - 20), Math.min(code.length, idx + 100));
  if (context.includes('=') && (context.includes('const') || context.includes('let') || context.includes('var') || context.includes('u1='))) {
    matches.push({ idx, context });
  }
  idx += 2;
}

console.log("u1 matches:", JSON.stringify(matches, null, 2));

// Let's do the same for d1
const dMatches = [];
idx = 0;
while (true) {
  idx = code.indexOf('d1', idx);
  if (idx === -1) break;
  const context = code.substring(Math.max(0, idx - 20), Math.min(code.length, idx + 100));
  if (context.includes('=') && (context.includes('const') || context.includes('let') || context.includes('var') || context.includes('d1='))) {
    dMatches.push({ idx, context });
  }
  idx += 2;
}
console.log("d1 matches:", JSON.stringify(dMatches, null, 2));
