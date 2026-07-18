const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const TARGET = path.join(__dirname, '..', '..', 'morro_clean.glb');
const OUT_BIN = path.join(__dirname, '..', '..', 'morro_triangles.bin');
const OUT_META = path.join(__dirname, '..', '..', 'morro_meta.json');

console.log('--- GEOMETRY INTAKE: BINARY CONVERSION ---');

if (!fs.existsSync(TARGET)) {
    console.error(`[FAIL] Input file not found: ${TARGET}`);
    console.error('Cannot proceed with conversion.');
    process.exit(1);
}

const glbBuffer = fs.readFileSync(TARGET);
const glbBase64 = glbBuffer.toString('base64');

const html = `
<!DOCTYPE html>
<html>
<body>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
async function runConversion(glbBase64) {
    const loader = new THREE.GLTFLoader();
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

    const candidates = [];
    scene.traverse(node => {
        if (node.isMesh) {
            const geo = node.geometry;
            const verts = geo.attributes.position ? geo.attributes.position.count : 0;
            const tris = geo.index ? geo.index.count / 3 : verts / 3;
            
            geo.computeBoundingBox();
            
            candidates.push({
                name: node.name || 'UnnamedMesh',
                uuid: node.uuid,
                vertices: verts,
                triangles: tris,
                boundingBox: geo.boundingBox,
                node: node
            });
        }
    });

    if (candidates.length === 0) {
        return { error: 'No meshes found in GLB.' };
    }

    // Selection Rule
    let selected = null;
    let ruleUsed = '';

    // 1. By Name
    const nameKeywords = ['morro_clean', 'morro', 'urca', 'island'];
    for (const c of candidates) {
        const nameLower = c.name.toLowerCase();
        if (nameKeywords.some(kw => nameLower.includes(kw))) {
            selected = c;
            ruleUsed = 'Name Keyword Match (' + c.name + ')';
            break;
        }
    }

    // 2. Single Mesh
    if (!selected && candidates.length === 1) {
        selected = candidates[0];
        ruleUsed = 'Single Mesh Fallback';
    }

    // 3. Largest Mesh by Triangle Count
    if (!selected && candidates.length > 1) {
        candidates.sort((a, b) => b.triangles - a.triangles);
        // check if ambiguous
        if (candidates[0].triangles === candidates[1].triangles && candidates[0].triangles > 0) {
            return { error: 'Ambiguity: Multiple meshes have the same triangle count. Please name the target mesh.' };
        }
        selected = candidates[0];
        ruleUsed = 'Highest Triangle Count (' + selected.triangles + ')';
    }

    if (!selected) {
        return { error: 'Could not resolve target mesh.' };
    }

    const mesh = selected.node;
    const geometry = mesh.geometry.clone();
    
    // Apply transformations
    geometry.applyMatrix4(mesh.matrixWorld);

    // Extract raw positions (flattening if indexed)
    let finalPositions = [];
    const posAttr = geometry.attributes.position;
    const indexAttr = geometry.index;

    if (indexAttr) {
        for (let i = 0; i < indexAttr.count; i++) {
            const idx = indexAttr.getX(i);
            const v = new THREE.Vector3().fromBufferAttribute(posAttr, idx);
            finalPositions.push(v.x, v.y, v.z);
        }
    } else {
        for (let i = 0; i < posAttr.count; i++) {
            const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
            finalPositions.push(v.x, v.y, v.z);
        }
    }

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const meta = {
        min: [bbox.min.x, bbox.min.y, bbox.min.z],
        max: [bbox.max.x, bbox.max.y, bbox.max.z],
        bSizeX: bbox.max.x - bbox.min.x,
        bSizeY: bbox.max.y - bbox.min.y,
        bSizeZ: bbox.max.z - bbox.min.z,
        numTriangles: finalPositions.length / 9
    };

    const floatArray = new Float32Array(finalPositions);
    const uint8Array = new Uint8Array(floatArray.buffer);

    // Encode to base64 to send back to node
    let binaryStr = '';
    const chunk = 8192;
    for (let i = 0; i < uint8Array.length; i += chunk) {
        binaryStr += String.fromCharCode.apply(null, uint8Array.subarray(i, i + chunk));
    }

    return {
        success: true,
        candidates: candidates.map(c => ({ name: c.name, triangles: c.triangles })),
        selectedName: selected.name,
        ruleUsed: ruleUsed,
        meta: meta,
        binaryBase64: btoa(binaryStr)
    };
}
</script>
</body>
</html>
`;

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    
    console.log('[INFO] Traversing GLTF Scene in headless environment...');
    
    const result = await page.evaluate(async (b64) => {
        return await window.runConversion(b64);
    }, glbBase64);
    
    await browser.close();

    if (result.error) {
        console.error('[FAIL] Scene Traversal Error:', result.error);
        process.exit(1);
    }

    console.log(`[PASS] Mesh Discovery completed.`);
    console.log(`       Found ${result.candidates.length} mesh(es).`);
    console.log(`       Target selected: "${result.selectedName}"`);
    console.log(`       Rule Applied: ${result.ruleUsed}`);
    console.log(`[PASS] Transformations (matrixWorld) applied to vertices.`);
    
    const binBuffer = Buffer.from(result.binaryBase64, 'base64');
    fs.writeFileSync(OUT_BIN, binBuffer);
    fs.writeFileSync(OUT_META, JSON.stringify(result.meta, null, 2));

    console.log(`[PASS] Wrote new binary file: ${OUT_BIN} (${(binBuffer.length/1024/1024).toFixed(2)} MB)`);
    console.log(`[PASS] Wrote new metadata file: ${OUT_META}`);
    console.log('\n[SUCCESS] Conversion complete. Drop-in ready.');
})();
