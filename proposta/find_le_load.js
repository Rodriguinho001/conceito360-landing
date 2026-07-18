const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

// Find the definition of le.load
// Let's look for "load(" or ".load ="
// We can find where 'le' is defined and its class
// Let's search for "class " or "function " that has "load"
// Let's print occurrences of ".load=function" or "load(e,t)"
let pos = 0;
while (true) {
  const idx = code.indexOf('load(e,', pos);
  if (idx === -1) break;
  console.log(`Found load(e, at ${idx}:`);
  console.log(code.substring(idx - 100, idx + 150));
  pos = idx + 7;
}
