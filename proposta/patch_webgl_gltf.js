const fs = require('fs');
let code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');

const startIdx = code.indexOf('async init(){');
const endIdx = code.indexOf('let n=Math.sqrt(e.length);');
const originalInit = code.substring(startIdx, endIdx);

const newInit = `async init(){
  const loader = new qR(); // qR is GLTFLoader
  const gltf = await new Promise((res, rej) => loader.load("morro-da-urca.glb", res, undefined, rej));
  let mesh;
  gltf.scene.traverse(c => { if(c.isMesh) mesh = c; });
  let geom = mesh.geometry;
  if(geom.index) geom = geom.toNonIndexed();
  
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  const bSizeX = bb.max.x - bb.min.x;
  const bSizeZ = bb.max.z - bb.min.z;
  const bSizeY = bb.max.y - bb.min.y;

  const posArray = geom.attributes.position.array;
  const uvArray = geom.attributes.uv ? geom.attributes.uv.array : null;
  const normalArray = geom.attributes.normal ? geom.attributes.normal.array : null;
  
  const e = [];
  const numTriangles = posArray.length / 9;
  
  for(let i=0; i<numTriangles; i++) {
    const pA = posArray.slice(i*9, i*9+9);
    let g = new ot();
    g.setAttribute("position", new nt(pA, 3));
    
    let uvs = new Float32Array(6);
    if(uvArray) {
      uvs.set(uvArray.slice(i*6, i*6+6));
    } else {
      // Frontal projection based on X and Y since the model might be upright
      for(let j=0; j<3; j++) {
         uvs[j*2] = (pA[j*3] - bb.min.x) / bSizeX;
         uvs[j*2+1] = (pA[j*3+1] - bb.min.y) / bSizeY;
      }
    }
    g.setAttribute("uv", new nt(uvs, 2));
    if(normalArray) g.setAttribute("normal", new nt(normalArray.slice(i*9, i*9+9), 3));
    
    const cx = (pA[0]+pA[3]+pA[6])/3;
    const cy = (pA[1]+pA[4]+pA[7])/3;
    const cz = (pA[2]+pA[5]+pA[8])/3;
    
    const centr1 = new Float32Array([cx,cy,cz, cx,cy,cz, cx,cy,cz]);
    const rx = Math.random(), ry = Math.random(), rz = Math.random();
    const rand1 = new Float32Array([rx,ry,rz, rx,ry,rz, rx,ry,rz]);
    
    g.setAttribute("centr", new nt(centr1, 3));
    g.setAttribute("rand", new nt(rand1, 3));
    
    g.setIndex(new We(new Uint32Array([0,1,2]), 1));
    e.push(g);
  }

  const img = new Image();
  img.src = 'morro.jpg'; // We map the previous AI image over the 3D topology!
  const t = new Rt(img);
  t.needsUpdate = true;
  t.colorSpace = "srgb";
  const s = t;
`;

code = code.replace(originalInit, newInit);

// The original scale was set to 1.0 and position -2,-16,-4 in my patch
// The GLB from Blender might need a different scale or position to match the view.
// Let's set a variable to easily adjust scale later if needed, but for now keep it dynamically scaled based on bounding box.
// We can just inject a line that scales it down if it's too big.
// But we can do that inside init() before it finishes.

// Wait, the scale code is at the end of init: `this.mesh.scale.setScalar(1.0),this.mesh.position.set(-2,-16,-4),this.isReady()}`
// We will replace that with a bounding-box aware scale so it automatically fits nicely on screen!
const endBlock = 'this.mesh.scale.setScalar(1.0),this.mesh.position.set(-2,-16,-4),this.isReady()}';
// Target size: around 40 units wide (like our 2D plane was 40x40).
const scaledBlock = 'const targetScale = 40.0 / bSizeX; this.mesh.scale.setScalar(targetScale),this.mesh.position.set(0,-16,0),this.isReady()}';
code = code.replace(endBlock, scaledBlock);

fs.writeFileSync('js/App3D-f554a111.js', code);
console.log('Patch complete!');
