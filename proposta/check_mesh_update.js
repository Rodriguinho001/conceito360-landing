const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Find occurrences of this.mesh.scale or this.mesh.position
function findMeshProperty(prop) {
  let pos = 0;
  const matches = [];
  while (true) {
    const idx = code.indexOf('this.mesh.' + prop, pos);
    if (idx === -1) break;
    matches.push({ idx, snippet: code.substring(idx - 100, idx + 100) });
    pos = idx + prop.length + 11;
  }
  return matches;
}

console.log("--- this.mesh.scale OCCURRENCES ---");
console.log(findMeshProperty('scale'));

console.log("--- this.mesh.position OCCURRENCES ---");
console.log(findMeshProperty('position'));
