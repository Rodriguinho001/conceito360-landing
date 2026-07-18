const fs = require('fs');
let code = fs.readFileSync('js/App3D-f554a111_original.js', 'utf8');

const correctInitContent = 'const e=await zt.batched("igloo.drc")';
const initContentIdx = code.indexOf(correctInitContent);
if (initContentIdx === -1) {
  console.error("Could not find the correct init content");
  process.exit(1);
}

const startIdx = code.lastIndexOf('async init(){', initContentIdx);
const endIdx = code.indexOf('this.isReady()}', startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find start or end index");
  process.exit(1);
}

const newInit = `async init() {
  window.sendLog = function(msg) {
    console.log(msg); // Stop network spam, just log locally
  };
  
  // Expose app instance globally for Puppeteer camera orchestration
  window.app3D = this;
  
  // Test 10: Set clean dark background for DOM body (WebGL uses its own bg gradient mesh)
  try {
    document.body.style.backgroundColor = '#111215';
    document.body.style.backgroundImage = 'none';
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
      canvas.style.filter = 'none';
    }

    // Aggressive Scene Cleanup Interval
    setInterval(() => {
        try {
            if (window.app3D && window.app3D.scene) {
                const toRemove = [];
                window.app3D.scene.traverse(child => {
                    if (child.name) {
                        const name = child.name;
                        if (name.startsWith("terrain") || 
                            name.startsWith("mountain") || 
                            name.startsWith("smoke") || 
                            name === "igloobase" || 
                            name === "igloo_cage" || 
                            name === "igloo_outline" || 
                            name === "snowparticles" || 
                            name === "intro_particles" ||
                            name.includes("plexus")) {
                            toRemove.push(child);
                        }
                    }
                });
                toRemove.forEach(child => {
                    if (child.parent) child.parent.remove(child);
                });
            }
        } catch (e) {}
    }, 500);

  } catch (e) {
    sendLog("ERROR OVERRIDING DOM STYLES: " + e.stack);
  }
  
  try {
    const meta = await fetch('morro_meta.json').then(r=>r.json());
    const buffer = await fetch('morro_triangles.bin').then(r=>r.arrayBuffer());
    const posArray = new Float32Array(buffer);
    
    const bSizeX = meta.bSizeX;
    const bSizeY = meta.bSizeY;
    const bSizeZ = meta.bSizeZ;
    
    const e = [];
    const numTriangles = meta.numTriangles;
    const numPieces = meta.numPieces || 1000;
    const tPP = meta.trianglesPerPiece || Math.ceil(numTriangles / numPieces);
    
    for(let i=0; i<numPieces; i++) {
       const startIdx = i * tPP;
       let endIdx = startIdx + tPP;
       if (endIdx > numTriangles) endIdx = numTriangles;
       if (startIdx >= endIdx) break;
       const pieceTriangles = endIdx - startIdx;
       
       const pA = posArray.slice(startIdx * 9, endIdx * 9);
       let g = new ot();
       g.setAttribute("position", new nt(pA, 3));
       
       let uvs = new Float32Array(pieceTriangles * 6);
       let emission = new Float32Array(pieceTriangles * 3);
       let indices = new Uint32Array(pieceTriangles * 3);
       
       for (let pt = 0; pt < pieceTriangles; pt++) {
          for(let j=0; j<3; j++) {
             const vIdx = pt * 3 + j;
             // Map X to U, Z to V (satellite mapping top-down)
             uvs[vIdx*2] = (pA[vIdx*3] - meta.min[0]) / bSizeX;
             uvs[vIdx*2+1] = (pA[vIdx*3+2] - meta.min[2]) / bSizeZ;
             emission[vIdx] = 0;
             indices[pt*3+j] = vIdx;
          }
       }
       
       g.setAttribute("uv", new nt(uvs, 2));
       g.setAttribute("emission", new nt(emission, 1));
       g.setIndex(new We(indices, 1));
       
       // Calculate face normals for slope-based vegetaton/rock lighting shading
       g.computeVertexNormals();
       
       e.push(g);
    }

    let n = Math.sqrt(e.length);
    n = Math.ceil(n / 4) * 4, n = Math.max(n, 4);
    
    const r = new Float32Array(n * n * 4);
    this.optionsTexture = new Hi(r, n, n, wt, Lt);
    this.optionsTexture.needsUpdate = true;

    const t = le.load("morro.jpg", "srgb");
    const s = le.load("morro.jpg", "srgb");

    // Setup visual shader with photograph texture and direct sun highlight shading
    const a = new fe({
        uniformsGroups: [he.UBO],
        uniforms: {
            tMap: { value: t },
            tMapExploded: { value: s },
            tTriangles: { value: le.load("igloo/triangles_tiling.ktx2", "srgb-repeat") },
            tNoise: { value: le.load("perlin-datatexture.ktx2", "srgb-repeat") },
            tOptions: { value: this.optionsTexture },
            uProgress: { value: 0 },
            uIntroGlow: { value: 1 },
            uIntroMaterialize: { value: 1.0 }
        },
        vertexShader: \`
            \${ae}

            /* BATCHING */
            attribute float batchId;
            uniform sampler2D batchingTexture;
            mat4 getBatchingMatrix(const in float i) {
                int size = textureSize(batchingTexture, 0).x;
                int j = int(i) * 4;
                int x = j % size;
                int y = j / size;
                vec4 v1 = texelFetch(batchingTexture, ivec2(x, y), 0);
                vec4 v2 = texelFetch(batchingTexture, ivec2(x + 1, y), 0);
                vec4 v3 = texelFetch(batchingTexture, ivec2(x + 2, y), 0);
                vec4 v4 = texelFetch(batchingTexture, ivec2(x + 3, y), 0);
                return mat4(v1, v2, v3, v4);
            }

            varying vec2 vUv;
            varying vec3 vWorldNormal;

            void main() {
                vUv = uv;

                mat4 batchingMatrix = getBatchingMatrix(batchId);
                vec3 pos = (batchingMatrix * vec4(position, 1.0)).xyz;

                // Transform the raw normal by the batch model matrix to world space
                vec3 transformedNormal = (batchingMatrix * vec4(normal, 0.0)).xyz;
                vWorldNormal = normalize(transformedNormal);

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        \`,
        fragmentShader: \`
            \${ae}
            \${Ue}

            varying vec2 vUv;
            varying vec3 vWorldNormal;

            uniform sampler2D tMap;

            void main() {
                vec3 normal = normalize(vWorldNormal);

                // Sample the photograph texture
                vec4 texColor = texture2D(tMap, vUv);
                
                // Enhance contrast slightly to bring out relief
                vec3 contrastColor = smoothstep(0.05, 0.95, texColor.rgb);

                // Blend subtly with a dark mineral tone to unify it without killing the photo
                vec3 mineralTone = vec3(0.12, 0.15, 0.18);
                vec3 baseAlbedo = mix(contrastColor, mineralTone, 0.35);

                // Clean daylight directional lighting
                vec3 lightDir = normalize(vec3(0.4, 1.0, 0.6));
                float diffuse = max(dot(normal, lightDir), 0.0);
                
                // Ambient fill
                vec3 ambient = vec3(0.25, 0.30, 0.35);
                
                vec3 finalColor = baseAlbedo * (ambient + diffuse * 0.9);

                gl_FragColor = vec4(finalColor, 1.0);
            }
        \`
    });

    const globalCenterX = (meta.min[0] + meta.max[0]) / 2;
    const globalCenterY = (meta.min[1] + meta.max[1]) / 2;
    const globalCenterZ = (meta.min[2] + meta.max[2]) / 2;

    this._objects = [];
    e.forEach((h, d) => {
        h.computeBoundingBox();
        h.boundingBox.getCenter(Bh);
        
        const relativeCentroid = Bh.clone();
        relativeCentroid.x -= globalCenterX;
        relativeCentroid.y -= globalCenterY;
        relativeCentroid.z -= globalCenterZ;

        const u = new It();
        u.targetDisplacement1 = 0;
        u.targetDisplacement2 = 0;
        u.targetBounce1 = 0;
        u.targetBounce2 = 0;
        u.displacement = 0;
        u.scrollDisplacement1 = 0;
        u.scrollDisplacement2 = 0;
        u.bounce = 0;
        u.centroid = relativeCentroid.clone();
        
        const rx = Math.random(), ry = Math.random(), rz = Math.random();
        u.rand = new b(rx, ry, rz);
        u.position.copy(relativeCentroid);
        u._pieceIndex = d;
        
        this._objects.push(u);

        const f = h.attributes.position.count;
        for (let p = 0; p < f; p++) {
            Ls.fromArray(h.attributes.position.array, p * 3);
            Ls.sub(Bh).toArray(h.attributes.position.array, p * 3);
        }
    });

    const o = e.length;
    const l = e.reduce((h, d) => h + d.attributes.position.count, 0);
    const c = e.reduce((h, d) => h + d.index.count, 0);

    this.mesh = new cI(o, l, c, a);
    Object.defineProperty(this.mesh, 'visible', {
        get: () => true,
        set: () => {},
        configurable: true
    });
    e.forEach(h => {
        this.mesh.addGeometry(h);
    });

    this.scene.beforeRenderCbs.push(this.update.bind(this));
    this.mesh.name = "igloo";
    this.mesh.sortObjects = !1;
    this.mesh.receiveShadow = !1;
    this.mesh.castShadow = !1;
    
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = true;
    
    this.plexus = new R3({ scene: this.scene, parent: this });
    await this.plexus.ready;
    this.scene.add(this.mesh);
    
    // Scale setup with vertical exaggeration for artistic steepness
    const targetScale = 2.0 / bSizeY;
    const yExaggeration = 1.35; // Reduce exaggeration slightly for a more natural look
    this.mesh.scale.set(targetScale, targetScale * yExaggeration, targetScale);
    
    // Calculate precise centering offset
    // The previous uncentered bounding box (after scale) was:
    // MIN: x: ~0, y: 0.07, z: -6.93
    // MAX: x: 7.71, y: 2.77, z: ~0
    // Center is around x: 3.85, z: -3.46
    // We apply the exact inverse to recenter the hero geometry
    this.mesh.position.set(-3.856, 0.22, 3.466); // Adjusted Y down slightly so it visually touches the water plane elegantly
    this.mesh.updateMatrix();
    
    // Create a circular water plane
    try {
        const numSegments = 64;
        const radius = 35.0; // Extends fully off-screen
        const waterPositions = [];
        const waterIndices = [];

        waterPositions.push(0, 0, 0); // Center

        for (let i = 0; i <= numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;
            waterPositions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        }

        for (let i = 1; i <= numSegments; i++) {
            waterIndices.push(0, i + 1, i);
        }

        const waterGeom = new ot();
        waterGeom.setAttribute("position", new nt(new Float32Array(waterPositions), 3));
        waterGeom.setIndex(new We(new Uint32Array(waterIndices), 1));
        
        const waterMaterial = new fe({
            uniformsGroups: [he.UBO],
            uniforms: {
                uTime: { value: 0 },
                uScrollVelocity: { value: 0 }
            },
            transparent: true,
            side: 2, // Explicitly set to THREE.DoubleSide (2) to bypass face culling
            vertexShader: \`
                \${ae}
                varying vec3 vWorldPosition;
                uniform float uScrollVelocity;
                void main() {
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            \`,
            fragmentShader: \`
                \${ae}
                \${Ue}
                varying vec3 vWorldPosition;
                uniform float uTime;
                uniform float uScrollVelocity;

                float waveNoise(vec2 p) {
                    float scrollFactor = clamp(abs(uScrollVelocity) * 0.05, 0.0, 2.0);
                    float t = uTime * (0.8 + scrollFactor);
                    return sin(p.x * 0.4 + t) * cos(p.y * 0.4 + t * 0.6) * 0.5 + 0.5;
                }

                void main() {
                    vec2 p = vWorldPosition.xz;
                    float scrollFactor = clamp(abs(uScrollVelocity) * 0.05, 0.0, 1.0);
                    
                    float wave1 = waveNoise(p * 0.6);
                    float wave2 = waveNoise(p * 1.5 - vec2(uTime * 0.2));
                    float wave = mix(wave1, wave2, 0.5 + scrollFactor * 0.2);

                    // Refined sophisticated water (not pitch black)
                    vec3 waterDeep = vec3(0.08, 0.12, 0.18); // Slate blue deep
                    vec3 waterShallow = vec3(0.18, 0.28, 0.35); // Teal/cyan shallow
                    vec3 waveCrest = vec3(0.85, 0.90, 0.95);

                    vec3 baseColor = mix(waterDeep, waterShallow, wave * 0.85);
                    
                    if (wave > 0.8) {
                        float crestFactor = smoothstep(0.8, 0.98, wave);
                        baseColor = mix(baseColor, waveCrest, crestFactor * (0.2 + scrollFactor * 0.4));
                    }

                    // Soft Specular
                    vec3 lightDir = normalize(vec3(0.2, 0.6, -0.8));
                    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                    vec3 halfDir = normalize(lightDir + viewDir);
                    
                    vec3 surfaceNormal = normalize(vec3((wave1 - 0.5) * 0.5, 1.0, (wave2 - 0.5) * 0.5));
                    float specular = pow(max(dot(surfaceNormal, halfDir), 0.0), 32.0);
                    vec3 specColor = vec3(1.0, 0.95, 0.8) * specular * (0.15 + scrollFactor * 0.2);

                    baseColor += specColor;

                    // Edge contact alpha - smoother fade around the Morro base
                    float dist = length(p);
                    // Morro is centered, radius is ~4 units. We make water more transparent near the Morro
                    float intersectionFade = smoothstep(3.0, 4.8, dist);
                    float horizonFade = smoothstep(30.0, 15.0, dist); // Fade out far away
                    float finalAlpha = mix(0.3, 0.98, intersectionFade) * horizonFade;

                    gl_FragColor = vec4(baseColor, finalAlpha);
                }
            \`
        });
        
        const waterMesh = new Ce(waterGeom, waterMaterial);
        waterMesh.name = "water";
        waterMesh.position.set(0, 0.0, 0); // Positioned at base zero
        waterMesh.renderOrder = 10; // Render after sky dome
        waterMesh.updateMatrix();
        waterMesh.matrixAutoUpdate = true;
        this.scene.add(waterMesh);
        this.waterMesh = waterMesh; // Expose water mesh
        
        sendLog("Ocean water plane created successfully.");
    } catch (waterErr) {
        sendLog("ERROR CREATING WATER: " + waterErr.stack);
    }
    
    // CREATE VARIANT B PARTICLES (Fios Magnéticos)
    try {
        const pCount = 300; // Presença média
        const pPositions = new Float32Array(pCount * 3 * 3);
        const pRandoms = new Float32Array(pCount * 3 * 3);
        const pIndices = new Uint32Array(pCount * 3);
        
        for (let i = 0; i < pCount; i++) {
            let angle = Math.random() * Math.PI * 2;
            let radius = 4.0 + Math.random() * 7.0; 
            let y = 0.5 + Math.random() * 5.0; 
            
            let px = Math.cos(angle) * radius;
            let py = y;
            let pz = Math.sin(angle) * radius;
            
            let rx = Math.random();
            let ry = Math.random();
            let rz = Math.random();

            for (let v = 0; v < 3; v++) {
                pPositions[i*9 + v*3] = px; 
                pPositions[i*9 + v*3 + 1] = py; 
                pPositions[i*9 + v*3 + 2] = pz;
                
                pRandoms[i*9 + v*3] = rx; 
                pRandoms[i*9 + v*3 + 1] = ry; 
                pRandoms[i*9 + v*3 + 2] = rz;
            }
            
            pIndices[i*3] = i*3;
            pIndices[i*3+1] = i*3+1;
            pIndices[i*3+2] = i*3+2;
        }
        
        const pGeom = new ot(); // BufferGeometry
        pGeom.setAttribute("position", new nt(pPositions, 3));
        pGeom.setAttribute("aRandom", new nt(pRandoms, 3));
        
        const pVType = new Float32Array(pCount * 3);
        for(let i=0; i<pCount; i++){
            pVType[i*3] = 0.0;
            pVType[i*3+1] = 1.0;
            pVType[i*3+2] = 2.0;
        }
        pGeom.setAttribute("aVType", new nt(pVType, 1));
        pGeom.setIndex(new We(pIndices, 1));
        
        const pMat = new fe({
            uniformsGroups: [he.UBO],
            uniforms: {
                uTime: { value: 0 },
                uScrollVelocity: { value: 0 },
                uMouseX: { value: 0 },
                uMouseY: { value: 0 }
            },
            transparent: true,
            depthWrite: false,
            side: 2,
            blending: 2, // AdditiveBlending for fibers
            vertexShader: \`
                \${ae}
                varying float vAlpha;
                varying vec2 vType;
                attribute vec3 aRandom;
                attribute float aVType;
                uniform float uScrollVelocity;
                uniform float uTime;
                uniform float uMouseX;
                uniform float uMouseY;

                void main() {
                    vec3 pos = position;
                    
                    float t = uTime * (0.2 + aRandom.x * 0.3);
                    float radiusOrbit = length(pos.xz);
                    float angleOrbit = atan(pos.z, pos.x) + t * 0.3 * (aRandom.y > 0.5 ? 1.0 : -1.0);
                    
                    vec3 mouseWorld = vec3(uMouseX * 12.0, -uMouseY * 12.0 + 2.0, 0.0);
                    vec3 toMouse = mouseWorld - pos;
                    float distToMouse = length(toMouse);
                    float attraction = smoothstep(10.0, 0.0, distToMouse) * 0.4;
                    
                    pos.x = cos(angleOrbit) * radiusOrbit;
                    pos.z = sin(angleOrbit) * radiusOrbit;
                    
                    pos += normalize(toMouse + vec3(0.001)) * attraction;
                    pos.y += sin(t * 2.0 + aRandom.z * 10.0) * 0.3;
                    
                    vec3 vel = vec3(-sin(angleOrbit), 0.0, cos(angleOrbit)) * 0.05;
                    float scrollFactor = clamp(uScrollVelocity * 0.02, -1.0, 1.0);
                    vel.y += scrollFactor * 0.4;
                    vel += vec3(sin(t*3.0+aRandom.x*10.0), cos(t*2.0+aRandom.y*10.0), sin(t*4.0+aRandom.z*10.0)) * 0.01;
                    
                    float thickness = 0.012; // Thin subtle fiber
                    
                    vec3 camPos = cameraPosition;
                    vec3 viewDir = normalize(camPos - pos);
                    vec3 right = normalize(cross(vel + vec3(0.001, 0.001, 0.0), viewDir));
                    
                    if (aVType < 0.5) {
                        pos += right * thickness;
                        vType = vec2(-1.0, 1.0);
                    } else if (aVType < 1.5) {
                        pos -= right * thickness;
                        vType = vec2(1.0, 1.0);
                    } else {
                        float speed = length(vel);
                        float tailLength = 0.15 + speed * 12.0; 
                        pos -= normalize(vel + vec3(0.001)) * tailLength;
                        vType = vec2(0.0, 0.0);
                    }
                    
                    vAlpha = 0.2 + (aRandom.z * 0.3); 
                    vAlpha *= clamp(1.0 - abs(scrollFactor)*0.5, 0.1, 1.0);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            \`,
            fragmentShader: \`
                \${ae}
                \${Ue}
                varying float vAlpha;
                varying vec2 vType;
                
                void main() {
                    float d = length(vec2(vType.x, 0.0));
                    float edgeFade = smoothstep(1.0, 0.0, d);
                    float tailFade = vType.y;
                    
                    vec3 fiberColor = vec3(0.75, 0.88, 0.98); 
                    fiberColor = mix(fiberColor, vec3(0.9, 0.8, 0.6), vAlpha);
                    
                    gl_FragColor = vec4(fiberColor, vAlpha * edgeFade * tailFade * 0.6);
                }
            \`
        });
        
        const particlesMesh = new Ce(pGeom, pMat);
        particlesMesh.name = "variantBParticles";
        particlesMesh.renderOrder = 20;
        this.scene.add(particlesMesh);
        this.particlesMesh = particlesMesh;
        
        if (!window.particleMouseInit) {
            window.particleMouseInit = true;
            window.globalMouseX = 0;
            window.globalMouseY = 0;
            window.addEventListener('mousemove', (e) => {
                window.globalMouseX = (e.clientX / window.innerWidth) * 2 - 1;
                window.globalMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
            });
        }
        
        sendLog("Variant B Particles created successfully.");
    } catch (partErr) {
        sendLog("ERROR CREATING PARTICLES: " + partErr.stack);
    }
    
    // Keydown interactive developer controls for live framing of Morro da Urca
    window.addEventListener('keydown', (event) => {
        const step = 0.1;
        
        if (event.code === 'KeyW') this.mesh.position.y += step;
        if (event.code === 'KeyS') this.mesh.position.y -= step;
        if (event.code === 'KeyA') this.mesh.position.x -= step;
        if (event.code === 'KeyD') this.mesh.position.x += step;
        if (event.code === 'KeyQ') this.mesh.position.z -= step;
        if (event.code === 'KeyE') this.mesh.position.z += step;
        
        if (event.code === 'KeyI') {
            const newScale = this.mesh.scale.x * 1.05;
            this.mesh.scale.set(newScale, newScale * yExaggeration, newScale);
        }
        if (event.code === 'KeyK') {
            const newScale = Math.max(0.0001, this.mesh.scale.x * 0.95);
            this.mesh.scale.set(newScale, newScale * yExaggeration, newScale);
        }
        
        if (event.code === 'KeyJ') this.mesh.rotation.y += 0.05;
        if (event.code === 'KeyL') this.mesh.rotation.y -= 0.05;
        if (event.code === 'KeyU') this.mesh.rotation.x += 0.05;
        if (event.code === 'KeyO') this.mesh.rotation.x -= 0.05;
        
        if (event.code === 'KeyR') {
            this.mesh.position.set(0, 0.25, 0);
            this.mesh.scale.set(targetScale, targetScale * yExaggeration, targetScale);
            this.mesh.rotation.set(0, 0, 0);
        }
        
        this.mesh.updateMatrix();
        
        sendLog("UPDATED - Scale: " + this.mesh.scale.x.toFixed(6) + " | Pos: " + JSON.stringify(this.mesh.position) + " | RotY: " + this.mesh.rotation.y.toFixed(3));
    });
    
    // Test 1, 3, 5, 6, 7 & 8: Reflective Scale/position/Box3 inspections
    try {
        const Box3 = e[0].boundingBox.constructor;
        const Vector3 = Bh.constructor;
        
        const box = new Box3().setFromObject(this.mesh);
        const center = new Vector3();
        box.getCenter(center);
        
        sendLog("--- THREE.JS RUNTIME REPORT ---");
        sendLog("[TEST 1] BOX MIN: " + JSON.stringify(box.min));
        sendLog("[TEST 1] BOX MAX: " + JSON.stringify(box.max));
        sendLog("[TEST 1] BOX SIZE: " + JSON.stringify(box.getSize(new Vector3())));
        sendLog("[TEST 3] BOX CENTER: " + JSON.stringify(center));
        sendLog("[TEST 5] POSITION COUNT: " + this.mesh.geometry.attributes.position.count);
        sendLog("[TEST 5] GEOMETRY INDEX: " + (this.mesh.geometry.index ? this.mesh.geometry.index.count : "null"));
        sendLog("[TEST 5] MESH VISIBLE: " + this.mesh.visible);
        sendLog("[TEST 6] MESH FRUSTUM CULLED: " + this.mesh.frustumCulled);
        sendLog("[TEST 7] MESH SCALE: " + JSON.stringify(this.mesh.scale));
        sendLog("[TEST 7] MESH POSITION: " + JSON.stringify(this.mesh.position));
        sendLog("[TEST 7] MESH ROTATION: " + JSON.stringify({ x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z }));
        
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < posArray.length; i += 3) {
            const x = posArray[i];
            const y = posArray[i+1];
            const z = posArray[i+2];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        }
        sendLog("RAW GEOMETRY MIN: " + minX + ", " + minY + ", " + minZ);
        sendLog("RAW GEOMETRY MAX: " + maxX + ", " + maxY + ", " + maxZ);
        sendLog("RAW GEOMETRY SIZE: " + (maxX - minX) + ", " + (maxY - minY) + ", " + (maxZ - minZ));
        sendLog("--------------------------------");
    } catch(boxErr) {
        sendLog("ERROR BOX: " + boxErr.stack);
    }
    
    sendLog("Init finished successfully with " + o + " pieces.");
  } catch (err) {
    sendLog("ERROR IN INIT: " + err.stack);
  }
  
  // Hide the original IGLOO image logo
  if (this.logo && this.logo.mesh) {
      this.logo.mesh.visible = false;
  }
  
  // --- UI REINTEGRATION (VARIANTE B) ---
  if (typeof this.createManifesto === "function") {
      await this.createManifesto();
  }
  setTimeout(() => {
      try { window.Q && window.Q.emit("webgl_show_ui_intro"); } catch(e) {}
      try { window.Q && window.Q.emit("webgl_play_audio", "manifesto"); } catch(e) {}
  }, 1500);
  
  this.isReady();
}`;

const patchedInitCode = code.substring(0, startIdx) + newInit + code.substring(endIdx + 15);

const finalCode = patchedInitCode.replace(
  "update(){var r;Si.planeInteraction.setCamera(this.scene.camera)",
  `update(){
    // Test 2: Log camera params once
    try {
        const camera = this.scene.camera;
        if (camera && !window.loggedCameraInfo) {
            window.loggedCameraInfo = true;
            sendLog("--- CAMERA RUNTIME INFO ---");
            sendLog("[TEST 2] CAMERA POSITION: " + JSON.stringify(camera.position));
            sendLog("[TEST 2] CAMERA ROTATION: " + JSON.stringify({ x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z }));
            sendLog("[TEST 2] CAMERA FOV: " + camera.fov);
            sendLog("----------------------------");
        }
    } catch(camErr) {}

    // Clean up arctic and original landscape/interface elements, and update custom animations
    try {
        window.iglooScene = this.scene;
        // Ensure our custom ocean water remains visible and updates its time animation smoothly
        if (this.waterMesh) {
            if (this.waterMesh.material.uniforms && this.waterMesh.material.uniforms.uTime) {
                this.waterMesh.material.uniforms.uTime.value = performance.now() * 0.001;
                
                if (window.waterScrollBase === undefined) window.waterScrollBase = window.scrollY || 0;
                let currentScroll = window.scrollY || 0;
                let scrollDelta = currentScroll - window.waterScrollBase;
                window.waterScrollBase = currentScroll;
                
                if (window.waterScrollVelocity === undefined) window.waterScrollVelocity = 0;
                // Inércia média-alta: blend lento, a velocidade cai gradualmente
                window.waterScrollVelocity = window.waterScrollVelocity * 0.92 + scrollDelta * 0.08;
                
                if (this.waterMesh.material.uniforms.uScrollVelocity) {
                    this.waterMesh.material.uniforms.uScrollVelocity.value = window.waterScrollVelocity;
                }
            }
            this.waterMesh.visible = true;
        }

        // Ensure particles remain visible and updated
        if (this.particlesMesh) {
            if (this.particlesMesh.material.uniforms.uTime) {
                this.particlesMesh.material.uniforms.uTime.value = performance.now() * 0.001;
            }
            if (this.particlesMesh.material.uniforms.uScrollVelocity) {
                this.particlesMesh.material.uniforms.uScrollVelocity.value = window.waterScrollVelocity || 0;
            }
            if (this.particlesMesh.material.uniforms.uMouseX) {
                this.particlesMesh.material.uniforms.uMouseX.value = window.globalMouseX || 0;
                this.particlesMesh.material.uniforms.uMouseY.value = window.globalMouseY || 0;
            }
            this.particlesMesh.rotation.y += 0.0005; // Slow ambient rotation
            this.particlesMesh.visible = true;
        }

        // Apply dynamic peachy golden-hour sunset gradients on the original sky dome mesh
        if (this.scene.sky && this.scene.sky.mesh) {
            this.scene.sky.mesh.visible = true;
            if (this.scene.sky.mesh.material && this.scene.sky.mesh.material.uniforms) {
                if (this.scene.sky.mesh.material.uniforms.uColor1) {
                    this.scene.sky.mesh.material.uniforms.uColor1.value.set("#7da2db");
                }
                if (this.scene.sky.mesh.material.uniforms.uColor2) {
                    this.scene.sky.mesh.material.uniforms.uColor2.value.set("#fcae8b");
                }
                // Fade in the sky during transition
                if (this.scene.sky.mesh.material.uniforms.uProgress) {
                    this.scene.sky.mesh.material.uniforms.uProgress.value = 1.0;
                }
            }
        }

        // Extremely robust traversal of scene children to clean up all unwanted meshes and interface elements
        this.scene.children.forEach(child => {
            if (child.name) {
                const name = child.name;
                if (name.startsWith("terrain") || 
                    name.startsWith("mountain") || 
                    name.startsWith("smoke") || 
                    name === "igloobase" || 
                    name === "igloo_outline" || 
                    name === "snowparticles") {
                    child.visible = false;
                }
                
                // Keep text components visible for inspection
                if (name === "group_text" || 
                    name === "words" || 
                    name === "text" || 
                    name === "title" || 
                    name === "copyright" || 
                    name === "rights") {
                    child.visible = true;
                    // Note: We don't override the color, we want the original MSDF rendering
                }
                
                // Repurpose the igloo_cage as the frosted glass UI panel
                if (name === "igloo_cage") {
                    child.visible = true;
                    if (!window.cageTransformed) {
                        window.cageTransformed = true;
                        const quadGeom = new ot(); 
                        const vertices = new Float32Array([
                            -10.0, -10.0,  0.0,
                             10.0, -10.0,  0.0,
                             10.0,  10.0,  0.0,
                            -10.0,  10.0,  0.0,
                        ]);
                        const uvs = new Float32Array([
                             0.0,  0.0,
                             1.0,  0.0,
                             1.0,  1.0,
                             0.0,  1.0,
                        ]);
                        const indices = new Uint16Array([0, 1, 2,  0, 2, 3]);
                        
                        quadGeom.setAttribute('position', new nt(vertices, 3));
                        quadGeom.setAttribute('uv', new nt(uvs, 2));
                        quadGeom.setIndex(new We(indices, 1));
                        
                        child.geometry = quadGeom;
                        child.frustumCulled = false;
                        
                        child.scale.set(100.0, 100.0, 1.0); 
                        child.position.set(0, 0, -1.0); 
                        child.rotation.set(0, 0, 0);
                        
                        child.renderOrder = 1000; 
                        
                        const glassMat = new fe({
                            uniformsGroups: [he.UBO],
                            uniforms: {
                                uTime: { value: 0 }
                            },
                            vertexShader: \`
                                \${ae}
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                varying vec3 vViewPosition;
                                void main() {
                                    vUv = uv;
                                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                                    vViewPosition = -mvPosition.xyz;
                                    vNormal = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
                                    gl_Position = projectionMatrix * mvPosition;
                                }
                            \`,
                            fragmentShader: \`
                                \${ae}
                                varying vec2 vUv;
                                varying vec3 vNormal;
                                varying vec3 vViewPosition;
                                void main() {
                                    vec3 normal = normalize(vNormal);
                                    vec3 viewDir = normalize(vViewPosition);
                                    
                                    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
                                    
                                    vec3 glassColor = vec3(0.92, 0.94, 0.96);
                                    vec3 edgeGlow = vec3(1.0, 0.98, 0.95); 
                                    
                                    vec2 centeredUv = vUv * 2.0 - 1.0;
                                    float dist = length(centeredUv);
                                    
                                    float edgeDensity = smoothstep(0.65, 1.0, dist);
                                    
                                    vec3 finalColor = mix(glassColor, edgeGlow, fresnel);
                                    
                                    // Base opacity + edge thickness + fresnel volume
                                    float alpha = 0.05 + (edgeDensity * 0.4) + (fresnel * 0.2);
                                    
                                    gl_FragColor = vec4(finalColor, alpha);
                                }
                            \`,
                            transparent: true,
                            side: 2, // THREE.DoubleSide
                            depthWrite: false,
                            blending: 1 // Normal blending
                        });
                        
                        child.material = glassMat;
                        child.updateMatrix();
                        sendLog("Glass UI Panel injected using original igloo_cage geometry.");
                    }
                }
            }
        });

        if (this.mesh) {
            this.mesh.updateMatrix();
        }
    } catch (updateErr) {
        sendLog("ERROR IN PATCHED UPDATE: " + updateErr.stack);
    }
    var r;Si.planeInteraction.setCamera(this.scene.camera)`
);

const updateTarget = 'this.optionsTexture.image.data[o*4+1]=a.bounce,a.position.copy(a.centroid).addScaledVector(a.centroid,a.displacement);const u=ie.smoothstep(.3,1,a.centroid.y),f=ie.fit(a.rand.x,.4,1,0,1)*2,p=s*u*f;a.scrollDisplacement1=ie.lerp(a.scrollDisplacement1,p,n),a.scrollDisplacement2=ie.lerpFPS(a.scrollDisplacement2,a.scrollDisplacement1,n),a.position.addScaledVector(a.centroid,a.scrollDisplacement2);';

const updateReplacement = 'this.optionsTexture.image.data[o*4+1]=a.bounce;a.position.copy(a.centroid);';

const superFinalCode = finalCode.replace(updateTarget, updateReplacement)
    .replace('text:"IGLOO"', 'text:"CONCEITO 360"')
    .replace('title:"////// Manifesto"', 'title:"////// MORRO DA URCA"')
    .replace('text:"Our mission is to build the next generation of consumer brands at the intersection of Community, AI, and crypto."', 'text:"A landmark of Rio de Janeiro. Reimagining the intersection of nature, architecture, and technology."')
    .replace('copyright:"// Copyright © 2026"', 'copyright:"// Grupo Conceito 360 © 2026"')
    .replace('Igloo, Inc.', 'Conceito 360')
    .replace('scroll:"Scroll down to discover."', 'scroll:"Role para baixo para descobrir."')
    .replace('click:"Click to explore"', 'click:"Clique para explorar"')
    .replace('close:"Close"', 'close:"Fechar"')
    .replace('Sound: On', 'Som: Ligado')
    .replace('Sound: Off', 'Som: Desligado');

fs.writeFileSync('js/App3D-f554a111.js', superFinalCode);
console.log("Patched successfully.");
