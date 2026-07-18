const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Find occurrences of batchId or batchingTexture or batchingMatrix
function findWord(word) {
  let pos = 0;
  const matches = [];
  while (true) {
    const idx = code.indexOf(word, pos);
    if (idx === -1) break;
    matches.push({ idx, snippet: code.substring(idx - 50, idx + 100) });
    pos = idx + word.length + 1;
  }
  return matches;
}

console.log("--- batchId OCCURRENCES ---");
console.log(findWord('batchId'));

console.log("--- batchingTexture OCCURRENCES ---");
console.log(findWord('batchingTexture'));
