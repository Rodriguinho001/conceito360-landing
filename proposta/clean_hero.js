import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── TERRAIN ASSUMPTION ───────────────────────────────────────────────────────
// Asset is a DEM (Digital Elevation Model) — horizontal terrain with altitude variation.
// It must NOT be forced into vertical orientation. Treat it as oblique terrain hero.
// Monumentality comes from framing, not from rotating the geometry.

// ─── SCENE ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc8e4f0); // clear tropical sky
scene.fog = new THREE.Fog(0xb8d8ec, 25, 70);  // gentle atmospheric haze

// ─── CAMERA (variant set by URL hash: #a, #b, #c) ────────────────────────────
// Variants will be set after mesh loads. Default = B (cinematic maritime).
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(-5, 2.5, 8); // maritime default — overridden per variant

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

window.appCamera   = camera;
window.appControls = controls;
window.appScene    = scene;

// ─── LIGHTING — warm solar tropical ──────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xfff8e8, 1.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfffbef, 4.0); // strong warm sun
sun.position.set(5, 12, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
sun.shadow.bias = -0.001;
scene.add(sun);

const skyBounce = new THREE.DirectionalLight(0xa8d4f0, 1.0); // cool sky fill
skyBounce.position.set(-3, 6, -10);
scene.add(skyBounce);

const oceanBounce = new THREE.HemisphereLight(0x87ceeb, 0x1a6fa0, 0.6); // sky/ocean bounce
scene.add(oceanBounce);

// ─── MATERIAL — warm rock, photographic ───────────────────────────────────────
const textureLoader = new THREE.TextureLoader();
const morroTex = textureLoader.load('morro.jpg', (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
});

const rockMat = new THREE.MeshStandardMaterial({
    map: morroTex,
    roughness: 0.85,
    metalness: 0.0,
    // warm sandstone tint pushes away from white-block read
    color: new THREE.Color(0xddd0b8),
});

// ─── WATER — tropical turquoise ────────────────────────────────────────────────
const waterGeo = new THREE.PlaneGeometry(120, 120, 1, 1);
const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
        varying vec3 vWorldPos;
        void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
        }
    `,
    fragmentShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p) {
            vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
        }
        float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){v+=a*noise(p);p*=2.1;a*=.5;} return v; }
        void main() {
            vec2 p = vWorldPos.xz;
            float t = uTime * 0.12;
            float w = fbm(p*0.4 + vec2(t, t*0.6)) + fbm(p*0.9 - vec2(t*0.35, 0.0)) * 0.5;
            w /= 1.5;
            // tropical blue-turquoise
            vec3 deep    = vec3(0.06, 0.25, 0.52);
            vec3 mid     = vec3(0.12, 0.50, 0.68);
            vec3 shallow = vec3(0.22, 0.72, 0.78);
            vec3 foam    = vec3(0.85, 0.95, 0.98);
            vec3 col = mix(deep, mid, w * 0.7);
            col = mix(col, shallow, smoothstep(0.55, 0.80, w));
            col = mix(col, foam,    smoothstep(0.78, 0.96, w) * 0.45);
            // sun glitter
            float glitter = pow(max(w - 0.70, 0.) * 3.0, 3.0) * 0.30;
            col += vec3(1.0, 0.96, 0.82) * glitter;
            float alpha = 0.92 * smoothstep(40.0, 18.0, length(p));
            gl_FragColor = vec4(col, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
});

const waterMesh = new THREE.Mesh(waterGeo, waterMat);
waterMesh.rotation.x = -Math.PI / 2;
scene.add(waterMesh);

// ─── LOAD TERRAIN ────────────────────────────────────────────────────────────
async function init() {
    const meta    = await (await fetch('morro_meta.json')).json();
    const posArr  = new Float32Array(await (await fetch('morro_triangles.bin')).arrayBuffer());
    const uvArr   = new Float32Array(await (await fetch('morro_uvs.bin')).arrayBuffer());
    const normArr = new Float32Array(await (await fetch('morro_normals.bin')).arrayBuffer());

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr,  3));
    geo.setAttribute('uv',       new THREE.BufferAttribute(uvArr,   2));
    geo.setAttribute('normal',   new THREE.BufferAttribute(normArr, 3));
    geo.computeBoundingBox();

    const bb = geo.boundingBox;
    // DEM natural dimensions (no rotation):
    // X=871 (east-west), Y=783 (north-south), Z=226 (altitude)
    // In glTF Y-up: X=width, Y=height(altitude), Z=depth
    // Wait — the meta shows min.z=-15, max.z=210, so Z IS altitude in local space
    // After standard glTF Y-up conversion this means Y is altitude.
    // Let's verify by actual data: bSizeY=783, bSizeZ=225
    // The large Y (783) = geographical north-south extent
    // The large Z (225) = altitude/elevation range... actually:
    // min: [~0, ~0, -15], max:[871, 783, 210]
    // → this is X=E/W, Y=N/S, Z=altitude
    // For THREE.js: X=right, Y=up, Z=toward camera
    // So if we DON'T rotate: the terrain lays in XY plane, Z extrudes toward camera
    // That means "up" (Z) is going toward the viewer — terrain is a vertical wall
    // If we rotate.x = -PI/2: XY terrain rotates to be horizontal, Z becomes Y (altitude → up) ✓
    // This IS correct but previous attempts showed weirdness from wrong center/scale

    // CORRECT APPROACH: rotate X = -PI/2 (terrain horizontal), NO Y flip
    // The earlier -PI/2 + PI_Y combination caused the interior to show
    // We need FrontSide rendering OR to fix normals direction

    const sizeX = bb.max.x - bb.min.x; // ~871 east-west
    const sizeY = bb.max.y - bb.min.y; // ~783 north-south  
    const sizeZ = bb.max.z - bb.min.z; // ~226 altitude

    // Scale: target the widest footprint to be 12 world units
    const footprint = Math.max(sizeX, sizeY);
    const meshScale = 12.0 / footprint;

    // Altitude range in world: sizeZ * meshScale ≈ 226 * (12/871) ≈ 3.1 units
    const worldAltitude = sizeZ * meshScale;
    console.log(`World altitude: ${worldAltitude.toFixed(2)}, footprint: ${(footprint * meshScale).toFixed(2)}`);

    const morro = new THREE.Mesh(geo, rockMat);

    // Stand terrain upright: rotate -PI/2 on X
    // This brings Z (altitude) up to world Y axis
    morro.rotation.x = -Math.PI / 2;
    morro.scale.setScalar(meshScale);
    morro.castShadow = true;
    morro.receiveShadow = false; // terrain doesn't self-shadow via this method

    // IMPORTANT: use DoubleSide to ensure terrain surface is visible regardless of normal orientation
    rockMat.side = THREE.DoubleSide;

    // After rotation, update world matrix to get correct bounds for placement
    morro.updateMatrixWorld(true);
    const worldBB = new THREE.Box3().setFromObject(morro);

    // Center on X/Z, sit terrain base at Y = waterLevel
    const waterLevel = 0.0;
    const terrainBaseY = worldBB.min.y;

    morro.position.x -= (worldBB.min.x + worldBB.max.x) / 2;
    morro.position.z -= (worldBB.min.z + worldBB.max.z) / 2;
    // Sink terrain slightly so base merges naturally with water:
    // We want the "sea" area of the terrain to be at or below water level
    // The terrain min altitude (near 0 in local Z, which was the ocean floor)
    // becomes world Y after rotation. Offset so terrain base sits at water Y.
    morro.position.y = waterLevel - terrainBaseY - (worldAltitude * 0.05); // 5% sink

    waterMesh.position.y = waterLevel;

    scene.add(morro);
    console.log('Terrain loaded.');
    console.log(`World bounds: Y from ${worldBB.min.y.toFixed(2)} to ${worldBB.max.y.toFixed(2)}`);

    // Expose terrain for camera setup
    window.morroMesh = morro;
    window.worldBB   = worldBB;
    window.worldAltitude = worldAltitude;

    setupCameras();
}

function setupCameras() {
    const alt = window.worldAltitude || 3.0;
    const mid = alt * 0.5;

    // Three camera variants for testing
    window.cameraVariants = {
        // VARIANT A — Low aerial oblique
        // Camera high and far, looking down at 30-35°
        // Gain: shows terrain topography as 3D landscape, textures fully visible
        // Loss: less drama, feels more like map/satellite
        a: { pos: [-4, alt * 1.4, 8],  target: [0, mid * 0.3, 0] },

        // VARIANT B — Maritime cinematic
        // Camera near water level, slight elevation, looking toward terrain center
        // Gain: dramatic horizon, terrain rises above water, most cinematic
        // Loss: footprint less visible, edge of terrain might clip
        b: { pos: [-3, alt * 0.25, 7],  target: [0, mid, 0] },

        // VARIANT C — Editorial 3/4 oblique
        // Camera elevated ~45°, far back, clean diagonal composition
        // Gain: balanced — shows shape, altitude AND water plane simultaneously
        // Loss: can feel clinical if not framed tightly
        c: { pos: [-7, alt * 0.8, 10], target: [0, mid * 0.4, 0] },
    };

    // Default: B (most cinematic)
    const hash = window.location.hash.replace('#', '') || 'b';
    const v    = window.cameraVariants[hash] || window.cameraVariants.b;
    camera.position.set(...v.pos);
    controls.target.set(...v.target);
    controls.update();
    console.log(`Camera variant: ${hash.toUpperCase()}`);
}

// ─── ANIMATE ──────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    waterMat.uniforms.uTime.value = clock.getElapsedTime();
    controls.update();
    renderer.render(scene, camera);
}

init().then(() => animate());

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
