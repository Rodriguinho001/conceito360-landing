const fs = require('fs');
let code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');

const originalInit = `async init(){const e=await zt.batched("igloo.drc"),t=le.load("igloo/igloo_color.ktx2","srgb"),s=le.load("igloo/igloo_exploded_color.ktx2","srgb");`;

// We inject a PlaneGeometry broken into 1800 triangles (60x30).
// Each triangle is its own BufferGeometry inside array e.
const patchedInit = `async init(){
  const sizeX = 40;
  const sizeY = 40;
  const segsX = 80;
  const segsY = 60;
  const halfX = sizeX / 2;
  const halfY = sizeY / 2;
  const stepX = sizeX / segsX;
  const stepY = sizeY / segsY;
  const e = [];
  
  for(let y=0; y<segsY; y++) {
    for(let x=0; x<segsX; x++) {
       let px = -halfX + x * stepX;
       let py = -halfY + y * stepY;
       
       let u1 = x / segsX, v1 = y / segsY;
       let u2 = (x+1)/segsX, v2 = y / segsY;
       let u3 = x / segsX, v3 = (y+1)/segsY;
       
       let pos1 = new Float32Array([px, py, 0,  px+stepX, py, 0,  px, py+stepY, 0]);
       let uv1 = new Float32Array([u1, v1,  u2, v2,  u3, v3]);
       let norm1 = new Float32Array([0,0,1, 0,0,1, 0,0,1]);
       let emit1 = new Float32Array([0,0,0]);
       let cx1 = (px + px+stepX + px)/3;
       let cy1 = (py + py + py+stepY)/3;
       let rx1 = Math.random(), ry1 = Math.random(), rz1 = Math.random();
       let centr1 = new Float32Array([cx1,cy1,0, cx1,cy1,0, cx1,cy1,0]);
       let rand1 = new Float32Array([rx1,ry1,rz1, rx1,ry1,rz1, rx1,ry1,rz1]);
       
       let g1 = new ot();
       g1.setAttribute('position', new nt(pos1, 3));
       g1.setAttribute('uv', new nt(uv1, 2));
       g1.setAttribute('normal', new nt(norm1, 3));
       g1.setAttribute('emission', new nt(emit1, 1));
       g1.setAttribute('centr', new nt(centr1, 3));
       g1.setAttribute('rand', new nt(rand1, 3));
       g1.setIndex(new We(new Uint32Array([0,1,2]), 1));
       e.push(g1);
       
       let u4 = (x+1)/segsX, v4 = (y+1)/segsY;
       let pos2 = new Float32Array([px, py+stepY, 0,  px+stepX, py, 0,  px+stepX, py+stepY, 0]);
       let uv2 = new Float32Array([u3, v3,  u2, v2,  u4, v4]);
       let norm2 = new Float32Array([0,0,1, 0,0,1, 0,0,1]);
       let emit2 = new Float32Array([0,0,0]);
       let cx2 = (px + px+stepX + px+stepX)/3;
       let cy2 = (py+stepY + py + py+stepY)/3;
       let rx2 = Math.random(), ry2 = Math.random(), rz2 = Math.random();
       let centr2 = new Float32Array([cx2,cy2,0, cx2,cy2,0, cx2,cy2,0]);
       let rand2 = new Float32Array([rx2,ry2,rz2, rx2,ry2,rz2, rx2,ry2,rz2]);
       
       let g2 = new ot();
       g2.setAttribute('position', new nt(pos2, 3));
       g2.setAttribute('uv', new nt(uv2, 2));
       g2.setAttribute('normal', new nt(norm2, 3));
       g2.setAttribute('emission', new nt(emit2, 1));
       g2.setAttribute('centr', new nt(centr2, 3));
       g2.setAttribute('rand', new nt(rand2, 3));
       g2.setIndex(new We(new Uint32Array([0,1,2]), 1));
       e.push(g2);
    }
  }
  const t = new Ts().load("morro.jpg");
  t.colorSpace = "srgb";
  const s = t;
`;

const u3Idx = code.indexOf('class U3');
const fragIdx = code.indexOf('fragmentShader:`', u3Idx);
const fragEndIdx = code.indexOf('\`});', fragIdx);
const originalFragStr = code.substring(fragIdx, fragEndIdx);

const patchedFragStr = `fragmentShader:\`
                //- edit
                \${ae}
                \${Ue}

                varying vec2 vUv;
                varying vec3 vPos;
                varying float vDisplacement;
                varying float vEmission;
                varying float vBounce;
                varying vec3 vNormal;

                uniform sampler2D tMap;
                uniform float uIntroMaterialize;

                void main() {
                    vec4 color = texture2D(tMap, vUv);
                    
                    // Add subtle shadow/depth on displaced pieces
                    color.rgb *= 1.0 - clamp(vDisplacement * 0.20, 0.0, 0.35);

                    if (uIntroMaterialize < 1.0) {
                        float ie = 1.0 - falloffsmooth(vPos.y, 3.95, -0.4, 1.5, uIntroMaterialize);
                        if (ie > 0.9999) discard;
                    }

                    gl_FragColor = color;
                }\``;

let newCode = code.replace(originalInit, patchedInit);
newCode = newCode.replace(originalFragStr, patchedFragStr);

// We should also remove the igloo scaling, since our plane is already correctly sized (40x40).
// In U3: this.mesh.scale.setScalar(38.0),this.mesh.position.set(-6,-30,2)
const originalScale = 'this.mesh.scale.setScalar(38.0),this.mesh.position.set(-6,-30,2)';
const patchedScale = 'this.mesh.scale.setScalar(1.0),this.mesh.position.set(-2,-16,-4)';
newCode = newCode.replace(originalScale, patchedScale);

fs.writeFileSync('js/App3D-f554a111.js', newCode);
console.log('Patch complete!');
