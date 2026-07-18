import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEMA 1 CORRIGIDO: Water volta a ter ShaderMaterial com ondas FBM animadas
// PROBLEMA 2 CORRIGIDO: Morro calculado via boundingBox para base tocar a água
// ─────────────────────────────────────────────────────────────────────────────

// Sky (frozen)
const skyZenith  = '#1da2f6';
const skyMid     = '#5ec5ff';
const skyHorizon = '#aee5ff';

// Tone mapping: Linear preserves raw texture colors best
// ACES was compressing the photogrammetric texture mid-tones into flat grey
const toneMappingExposure = 0.88;
const hemiSky       = 0x7ec8f0;  // cool sky blue
const hemiGround    = 0x3d6e20;  // warm earth green
const hemiIntensity = 0.3;       // LOW: just enough to lift pitch-black shadows

// Sun positioned to illuminate the camera-facing rock face directly
// Previous (-600,800,200) was side-back = camera face in shadow = haze read
const dirColor      = 0xfffae0;  // warm golden sun
const dirIntensity  = 2.2;       // calibrated: enough contrast without burning highlights

// Rock: neutral mineral tint — lets photogrammetric texture breathe
const rockColor = 0xd4b896;  // warm sandy mineral

// Water level: raised from 75 → 92 (small final rise as requested)
const WATER_Y = 92;

// ─── SCENE ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();

// Sky background via canvas texture (sRGB-encoded for correct ACES/Reinhard input)
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 2; skyCanvas.height = 512;
const skyCtx = skyCanvas.getContext('2d');
const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
skyGrad.addColorStop(0,   skyZenith);
skyGrad.addColorStop(0.5, skyMid);
skyGrad.addColorStop(1.0, skyHorizon);
skyCtx.fillStyle = skyGrad;
skyCtx.fillRect(0, 0, 2, 512);
const skyTex = new THREE.CanvasTexture(skyCanvas);
skyTex.encoding = THREE.sRGBEncoding;
scene.background = skyTex;
// Gentle atmospheric fog to dissolve the water plane horizon into the sky dome
scene.fog = new THREE.Fog('#aee5ff', 1500, 4800);

// ─── CAMERA (frozen) ─────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 8000);
camera.position.set(400, 100, 1600);

// ─── RENDERER ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = toneMappingExposure;
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.width = '100vw';
renderer.domElement.style.height = '100vh';
renderer.domElement.style.zIndex = '-1';
renderer.domElement.style.pointerEvents = 'auto';
document.body.appendChild(renderer.domElement);
document.body.style.margin = "0";

// ─── CONTROLS ────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 280, 0);

// ─── LIGHTING ────────────────────────────────────────────────────────────────
const hemiLight = new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity);
hemiLight.position.set(0, 500, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(dirColor, dirIntensity);
dirLight.position.set(500, 900, 1200); // REPOSITIONED: illuminates camera-facing face
scene.add(dirLight);

// ── LIGHTING STRATEGY ──────────────────────────────────────────────────
// dirLight: from camera-upper-front-right — illuminates the face the camera sees
//   This is the FIX for the previous haze: sun was from behind-left, leaving
//   the camera-facing rock face in shadow → appeared as flat grey/haze
// fillLight: single VERY subtle warm fill (0.18) for shadow lift ONLY
//   Not enough to cause flat ambient. Just prevents pitch-black on rock sides.
// rimLight from previous version REMOVED — the cool-blue rim was the "veil"
// ─────────────────────────────────────────────────────────────────────
// Camera is at (400, 100, 1600) — front-right. Sun from (500, 900, 1200)
// puts key light on the camera-facing face.
const fillLight = new THREE.DirectionalLight(0xffe0b0, 0.18);
fillLight.position.set(-400, 200, 800); // mild warm shadow fill from left
scene.add(fillLight);

// ─── SKY DOME ────────────────────────────────────────────────────────────────
const skyDomeGeo = new THREE.SphereGeometry(4000, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const skyDomeMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
const skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
scene.add(skyDome);

// ─── ANIMATED WATER — DEPTH GRADIENT + FBM TEXTURE ──────────────────────────
// Strategy: distance-from-rock-center drives the COLOR (shallow turquoise → deep blue)
// FBM drives wave TEXTURE + animation overlay (not color)
// This matches the reference: translucent light turquoise near rock, deep blue far
const waterGeo = new THREE.PlaneGeometry(10000, 10000, 1, 1);
const waterMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0.0 }
    },
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

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(
                mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                u.y
            );
        }
        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.45; }
            return v;
        }

        void main() {
            // ── DEPTH GRADIENT: distance from rock center (world XZ = 0,0) ────
            // Camera is at (400, 100, 1600) — 1650 units from rock center
            // At this distance the camera sees mostly mid/far zone from its viewpoint
            // Solution: stretch the shallow zone to cover the whole camera-visible area
            // Reference: near rock = light turquoise, mid = rich teal, far horizon = deep blue
            float dist = length(vWorldPos.xz);

            // Wider zones calibrated to 10000u water plane + camera at 1650u distance
            float dNear = smoothstep(0.0,    1800.0, dist);   // 0=at rock → 1=1800u (inner sea)
            float dMid  = smoothstep(1200.0, 3500.0, dist);   // ramps into mid zone
            float dFar  = smoothstep(2500.0, 5000.0, dist);   // ramps into deep/horizon

            // Tropical coastal palette — FINAL PRODUCTION: Arraial do Cabo / premium tropical
            vec3 vShallow = vec3(0.14, 0.84, 0.76);  // mais caribênho: verde-esmeralda puro
            vec3 cMid     = vec3(0.03, 0.43, 0.60);  // teal menos digital, mais oceânico
            vec3 cDeep    = vec3(0.02, 0.18, 0.40);  // azul oceânico escuro (mantido)

            // Layer gradient from shallow to deep
            vec3 depthCol = mix(vShallow, cMid,   dNear);
            depthCol      = mix(depthCol, cDeep,  dMid);
            depthCol      = mix(depthCol, cDeep * 0.85, dFar);

            // ── FBM WAVE TEXTURE (animation only — adds texture over gradient) ──
            vec2 p = vWorldPos.xz * 0.0022;
            float t = uTime * 0.08;
            float w = fbm(p * 0.7 + vec2(t, t * 0.5))
                    + fbm(p * 1.6 - vec2(t * 0.35, 0.08)) * 0.4;
            w /= 1.4;

            // Brightness modulation (±5%): textura sem engolir o gradiente de cor
            depthCol += (w - 0.5) * 0.05 * vec3(0.65, 1.0, 1.0);

            // Foam on wave crests (subtle white tips)
            float foamW = smoothstep(0.72, 0.90, w) * 0.30;
            depthCol = mix(depthCol, vec3(0.88, 0.97, 0.97), foamW);

            // Sun glitter — warm golden specular
            float glitter = pow(max(w - 0.70, 0.0) * 5.0, 2.0) * 0.26;
            depthCol += vec3(1.0, 0.90, 0.60) * glitter;

            // Alpha: 0.92 perto da rocha (era 0.88 — menos lavado), 0.97 no fundo
            float alpha = mix(0.92, 0.97, dMid);
            gl_FragColor = vec4(depthCol, alpha);
        }
    `,
    transparent: true,   // alpha 0.88–0.97 for coastal depth gradient
    depthWrite: false,   // prevents z-fighting at waterline
});

const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI / 2;
water.position.y = WATER_Y;
scene.add(water);

// ─── LOAD ROCK MESH ──────────────────────────────────────────────────────────
Promise.all([
    fetch('morro_triangles.bin').then(r => r.arrayBuffer()),
    fetch('morro_normals.bin').then(r => r.arrayBuffer()),
    fetch('morro_uvs.bin').then(r => r.arrayBuffer())
]).then(([posBuf, normBuf, uvBuf]) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posBuf), 3));
    geo.setAttribute('normal',   new THREE.BufferAttribute(new Float32Array(normBuf), 3));
    geo.setAttribute('uv',       new THREE.BufferAttribute(new Float32Array(uvBuf),  2));

    const texLoader = new THREE.TextureLoader();
    const tex = texLoader.load('pao_de_acucar_texture.webp');
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: new THREE.Color(rockColor),  // neutral mineral warm: preserves texture contrast
        roughness: 0.88,
        metalness: 0.0,
        side: THREE.DoubleSide,
        transparent: true,   // required for alpha fade near waterline
        depthWrite: true,    // keeps rock writing to depth — prevents water z-fight
    });

    // ── OPTION B: Waterline dissolve fade via onBeforeCompile ────────────────
    // Injects a smooth alpha dissolve into MeshStandardMaterial's GLSL pipeline.
    // The fade reads vWorldY (vertex world Y) and dissolves alpha:
    //   at y = WATER_Y          → alpha = 0  (fully dissolved)
    //   at y = WATER_Y + 55     → alpha = 1  (fully opaque — normal rock)
    // This hides only the shelf geometry at the waterline, not the body of morro.
    // Does NOT change: camera, WATER_Y, sinkFactor, preset da água, or composition.
    mat.onBeforeCompile = (shader) => {
        // Inject uniform declarations
        shader.uniforms.uWaterY     = { value: WATER_Y };
        shader.uniforms.uFadeRange  = { value: 30.0 };  // 30 world units: shelf only, not rock body

        // ── Vertex: pass world Y to fragment ─────────────────────────────────
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
            varying float vWorldY;`
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vWorldY = (modelMatrix * vec4(position, 1.0)).y;`
        );

        // ── Fragment: apply smooth dissolve at waterline ──────────────────────
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            varying float vWorldY;
            uniform float uWaterY;
            uniform float uFadeRange;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
            // Waterline dissolve: 0 at water surface, 1 at (water + fadeRange)
            // smoothstep gives a natural S-curve, not a hard cutoff
            float waterFade = smoothstep(uWaterY, uWaterY + uFadeRange, vWorldY);
            gl_FragColor.a *= waterFade;`
        );
    };

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 1;  // renders after water (renderOrder 0) — correct layering

    // ── PROBLEMA 2 FIX: calcula bounding box e ajusta Y para base tocar a água ──
    // A geometria tem min.y = -176.08 (base natural do mesh)
    // mesh.position.y precisa ser: WATER_Y - geo_min_y
    // Isso faz com que a base do mesh fique exatamente em WATER_Y
    // Um sink de 5% (worldAltitude * 0.05) submerge levemente a base para leitura natural
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const geoMinY = bb.min.y;              // base da geometria em espaço local (≈ -176)
    const geoMaxY = bb.max.y;              // topo em espaço local (≈ 234)
    const geoHeight = geoMaxY - geoMinY;   // altura total da geometria
    const sinkFactor = 0.07;               // 7%: slightly more submersion for natural waterline

    // mesh.position.y = WATER_Y - geoMinY faz base = WATER_Y
    // - (geoHeight * sinkFactor) afunda a base para waterline cortar naturalmente
    mesh.position.y = WATER_Y - geoMinY - (geoHeight * sinkFactor);

    console.log(`GeoMinY: ${geoMinY.toFixed(1)}, GeoHeight: ${geoHeight.toFixed(1)}`);
    console.log(`Mesh world base: ${(mesh.position.y + geoMinY).toFixed(1)}, WATER_Y: ${WATER_Y}`);
    console.log("Mesh added successfully!");

    scene.add(mesh);

    // ─── PROCEDURAL CABLE CAR (BONDINHO) SYSTEM ──────────────────────────────
    const meshY = mesh.position.y;
    // Station A: Peak of Pão de Açúcar (world position)
    const pPeak = new THREE.Vector3(-3.86, meshY + 234.49, 31.03);
    // Station B: Left Ridge/Shoulder
    const pRidge = new THREE.Vector3(-300.0, meshY + 35.0, -20.0);

    // Calculate perpendicular offset for dual-cable jig-back system
    const cableDir = new THREE.Vector3().subVectors(pPeak, pRidge);
    const perpVec = new THREE.Vector3(-cableDir.z, 0, cableDir.x).normalize().multiplyScalar(4.5);

    // Create curved paths with sag (gravity drop) in the middle
    const getCableCurve = (offset) => {
        const p1 = pRidge.clone().add(offset);
        const p2 = pPeak.clone().add(offset);
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        mid.y -= 7.0; // gravity sag
        return new THREE.CatmullRomCurve3([p1, mid, p2]);
    };

    window.cableCurve1 = getCableCurve(perpVec);
    window.cableCurve2 = getCableCurve(perpVec.clone().negate());

    // Materials
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 });
    const stationMat = new THREE.MeshStandardMaterial({ color: 0x2d3139, roughness: 0.8 });

    // Stations
    const stationAGeo = new THREE.BoxGeometry(18, 10, 18);
    const stationA = new THREE.Mesh(stationAGeo, stationMat);
    stationA.position.copy(pPeak);
    scene.add(stationA);

    const stationBGeo = new THREE.BoxGeometry(18, 8, 18);
    const stationB = new THREE.Mesh(stationBGeo, stationMat);
    stationB.position.copy(pRidge);
    scene.add(stationB);

    // Tubes for Cables
    const cableGeo1 = new THREE.TubeGeometry(window.cableCurve1, 64, 0.35, 8, false);
    const cableGeo2 = new THREE.TubeGeometry(window.cableCurve2, 64, 0.35, 8, false);
    scene.add(new THREE.Mesh(cableGeo1, cableMat));
    scene.add(new THREE.Mesh(cableGeo2, cableMat));

    // Helper to build a detailed cable car cabin
    function createCabin() {
        const cabinGroup = new THREE.Group();

        // Chassis & Roof (Red accent color matching iconic bondinho detailing)
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.7 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.2, 6.0), frameMat);
        base.position.y = -8.0;
        cabinGroup.add(base);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.8, 6.0), frameMat);
        roof.position.y = -4.0;
        cabinGroup.add(roof);

        // Glass cabin core
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xaae8ff,
            transparent: true,
            opacity: 0.5,
            roughness: 0.05,
            metalness: 0.95
        });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.8, 5.8), glassMat);
        glass.position.y = -6.0;
        cabinGroup.add(glass);

        // Suspension arm and wheels
        const armMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.2 });
        const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.0, 8), armMat);
        hanger.position.y = -2.0;
        cabinGroup.add(hanger);

        const wheelBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 3.5), armMat);
        wheelBox.position.y = 0.0; // sits directly on the cable
        cabinGroup.add(wheelBox);

        return cabinGroup;
    }

    window.cabin1 = createCabin();
    window.cabin1.scale.setScalar(0.85);
    window.cabin2 = createCabin();
    window.cabin2.scale.setScalar(0.85);
    scene.add(window.cabin1);
    scene.add(window.cabin2);

    window.meshReady = true;
    window.camera    = camera;
    window.controls  = controls;

}).catch(e => {
    console.error("Error loading bins:", e);
});

// ─── CINEMATIC MOTION & INTERACTION STATE ────────────────────────────────────
const clock = new THREE.Clock();
let userInteracted = false;

// Event listener to yield camera control back to user immediately on drag
controls.addEventListener('start', () => {
    userInteracted = true;
});

// Setup Initial Camera Pose for Cinematic Reveal
const ENTRY_DURATION = 4.5; // seconds
const startCamPos = new THREE.Vector3(480, 180, 1900);
const endCamPos = new THREE.Vector3(400, 100, 1600);
const startTarget = new THREE.Vector3(0, 240, 0);
const endTarget = new THREE.Vector3(0, 280, 0);

// Camera position on scroll end (revealing the wider scene)
const scrollCamPos = new THREE.Vector3(250, 320, 2100);

// Initialize camera at reveal starting point
camera.position.copy(startCamPos);
controls.target.copy(startTarget);
controls.update();

// Custom cursor interaction logic (required by cursor:none styling)
const cursor = document.getElementById('custom-cursor');
const follower = document.getElementById('custom-cursor-follower');
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let followerX = mouseX;
let followerY = mouseY;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (cursor) {
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
    }
});

function animateFollower() {
    followerX += (mouseX - followerX) * 0.14;
    followerY += (mouseY - followerY) * 0.14;
    if (follower) {
        follower.style.left = followerX + 'px';
        follower.style.top = followerY + 'px';
    }
    requestAnimationFrame(animateFollower);
}
animateFollower();

// Add class for premium hover states on cursor follower
function setupCursorHover() {
    const interactives = document.querySelectorAll('a, button, .header-cta, .editorial-cta-link');
    interactives.forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
    });
}
setupCursorHover();

// Recalculate hover states if new elements are added dynamically
setInterval(setupCursorHover, 1000);

function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // 1. Water Shader Animation
    waterMat.uniforms.uTime.value = elapsed;

    // 2. Bondinho (Cable Car) Jig-back Animation (Decelerates near stations)
    if (window.cabin1 && window.cabin2 && window.cableCurve1 && window.cableCurve2) {
        const t = Math.sin(elapsed * 0.08) * 0.5 + 0.5;

        // Position Cabin 1
        const pos1 = window.cableCurve1.getPointAt(t);
        const tan1 = window.cableCurve1.getTangentAt(t);
        window.cabin1.position.copy(pos1);
        window.cabin1.quaternion.setFromRotationMatrix(
            new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), tan1, new THREE.Vector3(0, 1, 0))
        );

        // Position Cabin 2 (jig-back: moving in exact opposition)
        const t2 = 1.0 - t;
        const pos2 = window.cableCurve2.getPointAt(t2);
        const tan2 = window.cableCurve2.getTangentAt(t2);
        window.cabin2.position.copy(pos2);
        window.cabin2.quaternion.setFromRotationMatrix(
            new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), tan2, new THREE.Vector3(0, 1, 0))
        );
    }

    // 3. Scroll Progress and Overlay Fade-out
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;

    const heroText = document.getElementById('hero-text-block');
    const scrollNotice = document.querySelector('.scroll-down-notice');
    if (heroText) {
        heroText.style.opacity = Math.max(0, 1.0 - scrollProgress * 2.5);
    }
    if (scrollNotice) {
        scrollNotice.style.opacity = Math.max(0, 1.0 - scrollProgress * 2.5);
    }

    // 4. Cinematic Reveal, Scroll Interpolation & Sway
    if (!userInteracted) {
        if (elapsed < ENTRY_DURATION) {
            const p = elapsed / ENTRY_DURATION;
            const ease = 1.0 - Math.pow(1.0 - p, 3); // Cubic Ease-out
            camera.position.lerpVectors(startCamPos, endCamPos, ease);
            controls.target.lerpVectors(startTarget, endTarget, ease);
        } else {
            // Idle Sway (parallax movement simulating gentle wind/sea drift)
            const tIdle = elapsed - ENTRY_DURATION;
            const swayX = Math.sin(tIdle * 0.15) * 2.0;
            const swayY = Math.cos(tIdle * 0.12) * 1.0;
            
            const basePos = new THREE.Vector3(400 + swayX, 100 + swayY, 1600);
            camera.position.lerpVectors(basePos, scrollCamPos, scrollProgress);
            controls.target.set(0, 280, 0);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
