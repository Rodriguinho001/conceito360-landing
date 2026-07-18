const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const TARGET = path.join(__dirname, '..', '..', '..', 'morro_clean_sculpt.glb');

const OUT_BIN      = path.join(__dirname, '..', '..', 'morro_triangles.bin');
const OUT_NORM_BIN = path.join(__dirname, '..', '..', 'morro_normals.bin');
const OUT_UV_BIN   = path.join(__dirname, '..', '..', 'morro_uvs.bin');
const OUT_META     = path.join(__dirname, '..', '..', 'morro_meta.json');

console.log('--- GEOMETRY INTAKE: SCULPT -> BIN ---');
console.log(`Source: ${TARGET}`);

if (!fs.existsSync(TARGET)) {
    console.error(`[ERROR] File not found: ${TARGET}`);
    console.error('Please complete the Blender sculpt and export as morro_clean_sculpt.glb to the workspace root.');
    process.exit(1);
}

const html = `
<!DOCTYPE html>
<html>
<head><script src="https://unpkg.com/three@0.150.1/build/three.min.js"></script></head>
<body>
<script type="module">
import { GLTFLoader } from 'https://unpkg.com/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
// Carrega o GLB injetado como base64
loader.load("DATA_PLACEHOLDER", (gltf) => {
    let targetMesh = null;
    gltf.scene.traverse(c => {
        if (c.isMesh && (!targetMesh || c.geometry.attributes.position.count > targetMesh.geometry.attributes.position.count)) {
            targetMesh = c;
        }
    });

    if (!targetMesh) {
        console.error("No mesh found");
        return;
    }

    const geo = targetMesh.geometry;
    if (!geo.index) {
        console.error("Geometry must be indexed");
        return;
    }

    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const idx = geo.index;

    // Desempacota vértices para buffer não-indexado (formato que o runtime espera na linha 6036)
    const numTriangles = idx.count / 3;
    const posOut = new Float32Array(numTriangles * 3 * 3);
    const normOut = norm ? new Float32Array(numTriangles * 3 * 3) : null;
    const uvOut = uv ? new Float32Array(numTriangles * 3 * 2) : null;

    geo.computeBoundingBox();
    const bb = geo.boundingBox;

    for (let i = 0; i < idx.count; i++) {
        const vertexIndex = idx.array[i];
        
        posOut[i*3 + 0] = pos.getX(vertexIndex);
        posOut[i*3 + 1] = pos.getY(vertexIndex);
        posOut[i*3 + 2] = pos.getZ(vertexIndex);

        if (norm) {
            normOut[i*3 + 0] = norm.getX(vertexIndex);
            normOut[i*3 + 1] = norm.getY(vertexIndex);
            normOut[i*3 + 2] = norm.getZ(vertexIndex);
        }

        if (uv) {
            uvOut[i*2 + 0] = uv.getX(vertexIndex);
            uvOut[i*2 + 1] = uv.getY(vertexIndex);
        }
    }

    // Retorna buffers em base64 + metadados
    const result = {
        meta: {
            hasNormal: !!norm,
            hasUV: !!uv,
            triangles: numTriangles,
            min: [bb.min.x, bb.min.y, bb.min.z],
            max: [bb.max.x, bb.max.y, bb.max.z]
        },
        posBase64:  btoa(String.fromCharCode(...new Uint8Array(posOut.buffer))),
        normBase64: norm ? btoa(String.fromCharCode(...new Uint8Array(normOut.buffer))) : null,
        uvBase64:   uv ? btoa(String.fromCharCode(...new Uint8Array(uvOut.buffer))) : null
    };

    window.meshResult = result;
});
</script>
</body>
</html>
`;

(async () => {
    console.log('[INFO] Extracting POSITION + NORMAL + UV from GLB...');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log(msg.text()));

    const base64Glb = fs.readFileSync(TARGET).toString('base64');
    const dataUri = `data:model/gltf-binary;base64,${base64Glb}`;
    const finalHtml = html.replace('DATA_PLACEHOLDER', dataUri);

    await page.setContent(finalHtml);

    try {
        await page.waitForFunction('window.meshResult !== undefined', { timeout: 15000 });
        const res = await page.evaluate(() => window.meshResult);

        if (!res) throw new Error("Result is null");

        if (res.uvBase64) {
            fs.writeFileSync(OUT_UV_BIN, Buffer.from(res.uvBase64, 'base64'));
            console.log(`[PASS] UV binary written: ${OUT_UV_BIN}`);
        }
        
        fs.writeFileSync(OUT_BIN, Buffer.from(res.posBase64, 'base64'));
        const posSize = fs.statSync(OUT_BIN).size / 1024 / 1024;
        console.log(`[PASS] Position binary : ${OUT_BIN} (${posSize.toFixed(2)} MB)`);

        if (res.normBase64) {
            fs.writeFileSync(OUT_NORM_BIN, Buffer.from(res.normBase64, 'base64'));
            const normSize = fs.statSync(OUT_NORM_BIN).size / 1024 / 1024;
            console.log(`[PASS] Normal binary   : ${OUT_NORM_BIN} (${normSize.toFixed(2)} MB)`);
        }

        fs.writeFileSync(OUT_META, JSON.stringify(res.meta, null, 2));
        console.log(`[PASS] Meta            : ${OUT_META}`);
        console.log(`\n  hasNormal : ${res.meta.hasNormal}`);
        console.log(`  hasUV     : ${res.meta.hasUV}`);
        console.log(`  triangles : ${res.meta.triangles}\n`);
        console.log('[SUCCESS] Conversion complete. Files ready for the runtime.');

    } catch (e) {
        console.error(`[ERROR] Processing failed: ${e.message}`);
    } finally {
        await browser.close();
    }
})();
