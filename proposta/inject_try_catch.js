const fs = require('fs');
let code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');

const startIdx = code.indexOf('async init(){');
const endIdx = code.indexOf('this.isReady()}');

if (startIdx !== -1 && endIdx !== -1) {
    const body = code.substring(startIdx + 13, endIdx + 15);
    const newInit = 'async init(){ try { ' + body + ' } catch(err) { console.error("MY CUSTOM ERROR CATCH:", err); alert("ERROR IN INIT: " + err.name + " : " + err.message); throw err; } }';
    code = code.substring(0, startIdx) + newInit + code.substring(endIdx + 15);
    fs.writeFileSync('js/App3D-f554a111.js', code);
    console.log('Try-catch injected into init!');
} else {
    console.log('Could not find init() bounds');
}
