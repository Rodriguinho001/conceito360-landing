const fs = require('fs');
let code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');
code = code.replace(/try \{ /g, '');
const catchStr = '} catch(err) { console.error("MY CUSTOM ERROR CATCH:", err); alert("ERROR IN INIT: " + err.name + " : " + err.message); throw err; }';
code = code.replace(catchStr, '');
fs.writeFileSync('js/App3D-f554a111.js', code);
console.log('Removed try catch wrapper');
