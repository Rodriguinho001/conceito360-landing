const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');
const start = code.indexOf('async init(){');
const end = code.indexOf('this.isReady()}');
// Extract the body of the async init() function.
// Replace the start with empty string.
const initCode = code.substring(start + 13, end + 15);

const wrapper = `async function test() { ${initCode} } 
test().catch(e => console.log('CAUGHT:', e.name, e.message, e.stack));`;

try {
  vm.runInNewContext(wrapper, {
    qR: class { load(a, b){ b({ scene: { traverse: (cb) => {
        cb({isMesh: true, geometry: {
            attributes:{position:{array:new Float32Array(9)}}, 
            computeBoundingBox:()=>{}, 
            boundingBox:{min:{x:0,y:0,z:0},max:{x:1,y:1,z:1}}, 
            toNonIndexed: function(){return this;} 
        }});
    }} }) } },
    ot: class { setAttribute(){} setIndex(){} },
    nt: class {},
    Promise,
    console,
    Math,
    Float32Array,
    Uint32Array,
    Image: class {},
    jy: class { load(){ return {}; } },
    fe: class {},
    Hi: class {},
    le: { load: () => {} },
    he: { UBO: {} },
    q: { devScene: false },
    Bh: { fromArray: () => {}, clone: () => {} },
    It: class {},
    Ls: { fromArray: () => ({ clone: () => {} }), sub: () => ({ toArray: () => {} }) },
    cI: class { addGeometry(){} },
    R3: class {},
    wt: {},
    Lt: {},
    ae: '',
    Ue: ''
  });
} catch(e) {
  console.log('Outer error:', e.message);
}
