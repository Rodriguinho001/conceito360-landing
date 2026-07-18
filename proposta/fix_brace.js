const fs = require('fs');
let code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');
code = code.replace("this.isReady()}  }update(){", "this.isReady()}update(){");
fs.writeFileSync('js/App3D-f554a111.js', code);
console.log('Fixed brace via indexOf/replace!');
