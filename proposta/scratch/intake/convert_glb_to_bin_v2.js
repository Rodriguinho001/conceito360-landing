const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Priority: sculpted (Rota 3.5) > v2 (Blender UV) > clean (original)
const TARGETS = [
    path.join(__dirname, '..', '..', '..', 'morro_sculpted.glb'),
    path.join(__dirname, '..', '..', '..', 'morro_clean_v2.glb'),
    path.join(__dirname, '..', '..', 'morro_clean.glb'),
];
const glbPath = TARGETS.find(p => fs.existsSync(p));

const OUT_BIN      = path.join(__dirname, '..', '..', 'morro_triangles.bin');
const OUT_NORM_BIN = path.join(__dirname, '..', '..', 'morro_normals.bin');
const OUT_UV_BIN   = path.join(__dirname, '..', '..', 'morro_uvs.bin');
const OUT_META     = path.join(__dirname, '..', '..', 'morro_meta.json');


console.log('--- GEOMETRY INTAKE v2: POSITION + NORMAL + UV ---');
console.log(`Source: ${glbPath}`);

if (!fs.existsSync(glbPath)) {
    console.error(`[FAIL] No input GLB found. Tried: ${TARGET} and ${FALLBACK}`);
    process.exit(1);
}

const glbBuffer = fs.readFileSync(glbPath);
const glbBase64 = glbBuffer.toString('base64');

// ─── BROWSER-SIDE EXTRACTION ──────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html>
<body>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.150.1/build/three.module.js","three/addons/":"https://unpkg.com/three@0.150.1/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.runConversion = async function(glbBase64) {
    const loader = new GLTFLoader();
    const glbBytes = Uint8Array.from(atob(glbBase64), c => c.charCodeAt(0));

    let gltf;
    try {
        gltf = await new Promise((resolve, reject) => {
            loader.parse(glbBytes.buffer, '', resolve, reject);
        });
    } catch (e) {
        return { error: 'Failed to parse GLB: ' + e.message };
    }

    const scene = gltf.scene;
    scene.updateMatrixWorld(true);

    // ── Mesh discovery ──
    const candidates = [];
    scene.traverse(node => {
        if (node.isMesh) {
            const geo = node.geometry;
            const verts = geo.attributes.position ? geo.attributes.position.count : 0;
            const tris  = geo.index ? geo.index.count / 3 : verts / 3;
            geo.computeBoundingBox();
            candidates.push({ name: node.name || 'Unnamed', uuid: node.uuid,
                              vertices: verts, triangles: tris, node });
        }
    });

    if (!candidates.length) return { error: 'No meshes found.' };

    // Select: name keyword → single → largest
    const kws = ['morro', 'urca', 'island', 'terrain'];
    let selected = candidates.find(c => kws.some(k => c.name.toLowerCase().includes(k)));
    if (!selected && candidates.length === 1) selected = candidates[0];
    if (!selected) {
        candidates.sort((a,b) => b.triangles - a.triangles);
        selected = candidates[0];
    }

    const mesh     = selected.node;
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);

    const posAttr  = geometry.attributes.position;
    const normAttr = geometry.attributes.normal;
    const uvAttr   = geometry.attributes.uv;
    const idxAttr  = geometry.index;

    const hasNormal = !!normAttr;
    const hasUV     = !!uvAttr;

    // Compute normals if absent
    if (!hasNormal) geometry.computeVertexNormals();

    // Flatten indexed → unindexed (one entry per triangle vertex)
    const count = idxAttr ? idxAttr.count : posAttr.count;

    const positions = new Float32Array(count * 3);
    const normals   = new Float32Array(count * 3);
    const uvs       = hasUV ? new Float32Array(count * 2) : null;

    for (let i = 0; i < count; i++) {
        const idx = idxAttr ? idxAttr.getX(i) : i;

        positions[i*3]   = posAttr.getX(idx);
        positions[i*3+1] = posAttr.getY(idx);
        positions[i*3+2] = posAttr.getZ(idx);

        const n = geometry.attributes.normal;
        normals[i*3]   = n.getX(idx);
        normals[i*3+1] = n.getY(idx);
        normals[i*3+2] = n.getZ(idx);

        if (hasUV) {
            uvs[i*2]   = uvAttr.getX(idx);
            uvs[i*2+1] = uvAttr.getY(idx);
        }
    }

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const meta = {
        selectedName:  selected.name,
        hasNormal,
        hasUV,
        numVertices:   count,
        numTriangles:  count / 3,
        numPieces:     1000,
        trianglesPerPiece: Math.ceil((count / 3) / 1000),
        min:   [bbox.min.x, bbox.min.y, bbox.min.z],
        max:   [bbox.max.x, bbox.max.y, bbox.max.z],
        bSizeX: bbox.max.x - bbox.min.x,
        bSizeY: bbox.max.y - bbox.min.y,
        bSizeZ: bbox.max.z - bbox.min.z,
    };

    function toBase64(arr) {
        let s = '', chunk = 8192;
        const u8 = new Uint8Array(arr.buffer);
        for (let i = 0; i < u8.length; i += chunk)
            s += String.fromCharCode.apply(null, u8.subarray(i, i+chunk));
        return btoa(s);
    }

    return {
        success: true,
        meta,
        posBase64:  toBase64(positions),
        normBase64: toBase64(normals),
        uvBase64:   hasUV ? toBase64(uvs) : null,
    };
}
</script>
</body>
</html>`;

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page    = await browser.newPage();

    page.on('console', m => console.log('[BROWSER]', m.text()));
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // ES module sets window.runConversion asynchronously — wait for it
    await page.waitForFunction('typeof window.runConversion === "function"', { timeout: 15000 });

    console.log('[INFO] Extracting POSITION + NORMAL + UV from GLB...');
    const result = await page.evaluate(async (b64) => {
        return await window.runConversion(b64);
    }, glbBase64);

    await browser.close();

    if (result.error) {
        console.error('[FAIL]', result.error);
        process.exit(1);
    }

    const { meta, posBase64, normBase64, uvBase64 } = result;

    // Write binaries
    fs.writeFileSync(OUT_BIN,      Buffer.from(posBase64,  'base64'));
    fs.writeFileSync(OUT_NORM_BIN, Buffer.from(normBase64, 'base64'));
    if (uvBase64) {
        fs.writeFileSync(OUT_UV_BIN, Buffer.from(uvBase64, 'base64'));
        console.log(`[PASS] UV binary written: ${OUT_UV_BIN}`);
    } else {
        console.log('[WARN] No TEXCOORD_0 in source GLB — UV binary NOT written.');
        console.log('       Triplanar mapping will be used in clean_hero.js as fallback.');
        // Remove stale UV file if present
        if (fs.existsSync(OUT_UV_BIN)) fs.unlinkSync(OUT_UV_BIN);
    }
    fs.writeFileSync(OUT_META, JSON.stringify(meta, null, 2));

    console.log(`[PASS] Position binary : ${OUT_BIN}      (${(Buffer.byteLength(Buffer.from(posBase64,'base64'))/1024/1024).toFixed(2)} MB)`);
    console.log(`[PASS] Normal binary   : ${OUT_NORM_BIN} (${(Buffer.byteLength(Buffer.from(normBase64,'base64'))/1024/1024).toFixed(2)} MB)`);
    console.log(`[PASS] Meta            : ${OUT_META}`);
    console.log(`\n  hasNormal : ${meta.hasNormal}`);
    console.log(`  hasUV     : ${meta.hasUV}`);
    console.log(`  triangles : ${meta.numTriangles}`);
    console.log('\n[SUCCESS] Conversion v2 complete.');
})();
