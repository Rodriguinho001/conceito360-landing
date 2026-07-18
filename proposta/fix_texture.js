const fs = require('fs');
let code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');

const oldStr = `  const img = new Image();
  img.src = 'morro.jpg'; // We map the previous AI image over the 3D topology!
  const t = new Rt(img);
  t.needsUpdate = true;`;

const newStr = `  const t = new jy().load('morro.jpg');`;

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  fs.writeFileSync('js/App3D-f554a111.js', code);
  console.log('Replaced correctly');
} else {
  console.log('Not found');
}
