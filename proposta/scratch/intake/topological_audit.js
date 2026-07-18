const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const TARGET = path.join(__dirname, '..', '..', 'morro_clean.glb');
console.log('--- GEOMETRY INTAKE: TOPOLOGICAL AUDIT ---');

if (!fs.existsSync(TARGET)) {
    console.error(`[FAIL] Input file not found: ${TARGET}`);
    console.error('Cannot proceed with topology audit.');
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

function analyzeTopology(geometry) {
    let vertices = [];
    let faces = [];
    
    const positionAttr = geometry.attributes.position;
    const indexAttr = geometry.index;

    if (indexAttr) {
        for (let i = 0; i < positionAttr.count; i++) {
            vertices.push(new THREE.Vector3().fromBufferAttribute(positionAttr, i));
        }
        for (let i = 0; i < indexAttr.count; i += 3) {
            faces.push([indexAttr.getX(i), indexAttr.getX(i+1), indexAttr.getX(i+2)]);
        }
    } else {
        const vMap = new Map();
        for (let i = 0; i < positionAttr.count; i++) {
            const v = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
            const key = v.x.toFixed(4)+','+v.y.toFixed(4)+','+v.z.toFixed(4);
            if (!vMap.has(key)) {
                vMap.set(key, vertices.length);
                vertices.push(v);
            }
            if (i % 3 === 2) {
                faces.push([
                    vMap.get(new THREE.Vector3().fromBufferAttribute(positionAttr, i-2).x.toFixed(4)+','+new THREE.Vector3().fromBufferAttribute(positionAttr, i-2).y.toFixed(4)+','+new THREE.Vector3().fromBufferAttribute(positionAttr, i-2).z.toFixed(4)),
                    vMap.get(new THREE.Vector3().fromBufferAttribute(positionAttr, i-1).x.toFixed(4)+','+new THREE.Vector3().fromBufferAttribute(positionAttr, i-1).y.toFixed(4)+','+new THREE.Vector3().fromBufferAttribute(positionAttr, i-1).z.toFixed(4)),
                    vMap.get(new THREE.Vector3().fromBufferAttribute(positionAttr, i).x.toFixed(4)+','+new THREE.Vector3().fromBufferAttribute(positionAttr, i).y.toFixed(4)+','+new THREE.Vector3().fromBufferAttribute(positionAttr, i).z.toFixed(4))
                ]);
            }
        }
    }

    const edges = new Map();
    for (let f = 0; f < faces.length; f++) {
        const face = faces[f];
        for (let i = 0; i < 3; i++) {
            const a = face[i];
            const b = face[(i+1)%3];
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            const key = min + '-' + max;
            if (!edges.has(key)) edges.set(key, []);
            edges.get(key).push({ face: f, a, b });
        }
    }

    let boundaryEdges = 0;
    let nonManifoldEdges = 0;

    for (const [key, list] of edges.entries()) {
        if (list.length === 1) boundaryEdges++;
        else if (list.length > 2) nonManifoldEdges++;
    }

    return {
        uniqueVertices: vertices.length,
        triangles: faces.length,
        boundaryEdges,
        nonManifoldEdges
    };
}

async function runAudit(glbBase64) {
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
            candidates.push({
                name: node.name || 'UnnamedMesh',
                triangles: tris,
                node: node
            });
        }
    });

    if (candidates.length === 0) return { error: 'No meshes found.' };

    let selected = null;
    let ruleUsed = '';

    const nameKeywords = ['morro_clean', 'morro', 'urca', 'island'];
    for (const c of candidates) {
        const nameLower = c.name.toLowerCase();
        if (nameKeywords.some(kw => nameLower.includes(kw))) {
            selected = c;
            ruleUsed = 'Name Keyword Match (' + c.name + ')';
            break;
        }
    }

    if (!selected && candidates.length === 1) {
        selected = candidates[0];
        ruleUsed = 'Single Mesh Fallback';
    }

    if (!selected && candidates.length > 1) {
        candidates.sort((a, b) => b.triangles - a.triangles);
        if (candidates[0].triangles === candidates[1].triangles && candidates[0].triangles > 0) {
            return { error: 'Ambiguity: Multiple meshes have the same triangle count.' };
        }
        selected = candidates[0];
        ruleUsed = 'Highest Triangle Count (' + selected.triangles + ')';
    }

    if (!selected) return { error: 'Could not resolve target mesh.' };

    const mesh = selected.node;
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    
    // Analyze topological health (Watertight)
    const stats = analyzeTopology(geometry);

    return {
        success: true,
        selectedName: selected.name,
        ruleUsed: ruleUsed,
        bbox: { min: bbox.min, max: bbox.max },
        stats: stats
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
    
    console.log('[INFO] Traversing GLTF Scene for topological audit...');
    
    const result = await page.evaluate(async (b64) => {
        return await window.runAudit(b64);
    }, glbBase64);
    
    await browser.close();

    if (result.error) {
        console.error('[FAIL] Audit Error:', result.error);
        process.exit(1);
    }

    console.log(`[PASS] Mesh Discovery completed.`);
    console.log(`       Target selected: "${result.selectedName}"`);
    console.log(`       Rule Applied: ${result.ruleUsed}`);
    console.log(`[PASS] Transformations applied for spatial audit.`);

    console.log('\\n--- METRICS ---');
    console.log(`Unique Vertices:  ${result.stats.uniqueVertices}`);
    console.log(`Triangles:        ${result.stats.triangles}`);
    console.log(`Boundary Edges:   ${result.stats.boundaryEdges} ${result.stats.boundaryEdges === 0 ? '(Watertight)' : '(Not Watertight)'}`);
    console.log(`Non-Manifold:     ${result.stats.nonManifoldEdges}`);
    console.log(`Bounding Box Min: [${result.bbox.min.x.toFixed(2)}, ${result.bbox.min.y.toFixed(2)}, ${result.bbox.min.z.toFixed(2)}]`);
    console.log(`Bounding Box Max: [${result.bbox.max.x.toFixed(2)}, ${result.bbox.max.y.toFixed(2)}, ${result.bbox.max.z.toFixed(2)}]`);
    console.log('\\n[SUCCESS] Topological Audit passed structural dry run.');
})();
