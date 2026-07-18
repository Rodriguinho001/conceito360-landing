const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');
const regex = /.{0,10}\.load\(/g;
let match;
while((match = regex.exec(code)) !== null) {
  console.log(match[0]);
}
