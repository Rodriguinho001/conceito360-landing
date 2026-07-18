const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

const importIdx = code.indexOf('from"./index-2eb69c09.js"');
if (importIdx !== -1) {
  console.log('Import statement:');
  console.log(code.substring(importIdx - 500, importIdx + 100));
} else {
  console.log('Import not found');
}
