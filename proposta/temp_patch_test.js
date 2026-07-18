const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');

const initStr = 'async init(){const e=await zt.batched("igloo.drc"),t=le.load("igloo/igloo_color.ktx2","srgb"),s=le.load("igloo/igloo_exploded_color.ktx2","srgb");';
console.log('Init found:', code.includes(initStr));

const u3Idx = code.indexOf('class U3');
const varyingIdx = code.indexOf('varying vec3 vNormal;', u3Idx);
const fsStart = code.indexOf('void main() {', varyingIdx);
console.log('FS found:', fsStart !== -1);
if(fsStart !== -1) {
    const fsEnd = code.indexOf('}', fsStart);
    console.log('FS end found:', fsEnd !== -1);
    console.log('FS Content:', code.substring(fsStart, fsEnd + 1));
}
