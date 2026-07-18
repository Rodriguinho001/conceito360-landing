const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Search for 'const le = ' or 'let le = ' or ',le = '
const match = code.match(/([a-zA-Z0-9_$]+)\s*=\s*new\s+([a-zA-Z0-9_$]+)\s*\(\s*\)/);
console.log("Constructor match:", match ? match[0] : "none");

// Let's search for "class " or constructors
// We can find where 'le' is defined by finding occurrences of 'le=' or 'const le' or 'var le'
// Let's do a search for 'le=' in the file and print context
let pos = 0;
while (true) {
  const idx = code.indexOf('le=', pos);
  if (idx === -1) break;
  console.log(`Found le= at ${idx}:`);
  console.log(code.substring(idx - 50, idx + 50));
  pos = idx + 3;
}
