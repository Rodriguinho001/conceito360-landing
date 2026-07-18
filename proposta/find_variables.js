const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Find where ae and Ue are defined
// We search for something like "const ae=" or "var ae=" or ",ae="
function findDef(varName) {
  let pos = 0;
  const matches = [];
  while (true) {
    const idx = code.indexOf(varName + '=', pos);
    if (idx === -1) break;
    matches.push({ idx, snippet: code.substring(idx - 100, idx + 100) });
    pos = idx + varName.length + 1;
  }
  return matches;
}

console.log("--- ae DEFINITIONS ---");
console.log(findDef('ae'));

console.log("--- Ue DEFINITIONS ---");
console.log(findDef('Ue'));
