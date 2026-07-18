const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const binBuffer = fs.readFileSync('morro_triangles.bin');
    const binBase64 = binBuffer.toString('base64');
    const glbBuffer = fs.readFileSync('scratch/morro_organic.glb');
    const glbBase64 = glbBuffer.toString('base64');
    const metaStr = fs.readFileSync('morro_meta.json', 'utf8');

    const html = `
<!DOCTYPE html>
<html>
<head><style>body{margin:0;overflow:hidden;background:#333;}</style></head>
<body>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
window.auditData = null;

function analyzeTopology(positionAttr, indexAttr) {
    let vertices = [];
    let faces = [];
    
    if (indexAttr) {
        for (let i = 0; i < positionAttr.count; i++) {
            vertices.push(new THREE.Vector3().fromBufferAttribute(positionAttr, i));
        }
        for (let i = 0; i < indexAttr.count; i += 3) {
            faces.push([indexAttr.getX(i), indexAttr.getX(i+1), indexAttr.getX(i+2)]);
        }
    } else {
        // Non-indexed: find unique vertices
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

    // Edges
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
    let inconsistentNormals = 0;

    for (const [key, list] of edges.entries()) {
        if (list.length === 1) boundaryEdges++;
        else if (list.length > 2) nonManifoldEdges++;
        else if (list.length === 2) {
            // Check orientation
            // If face 1 uses A->B, face 2 must use B->A
            if (list[0].a === list[1].a && list[0].b === list[1].b) {
                inconsistentNormals++;
            }
        }
    }

    // Connected components
    const adj = new Map();
    for(let f=0; f<faces.length; f++) adj.set(f, []);
    for (const [key, list] of edges.entries()) {
        if (list.length === 2) {
            adj.get(list[0].face).push(list[1].face);
            adj.get(list[1].face).push(list[0].face);
        }
    }

    const visited = new Set();
    let components = 0;
    for (let i = 0; i < faces.length; i++) {
        if (!visited.has(i)) {
            components++;
            const q = [i];
            visited.add(i);
            let head = 0;
            while(head < q.length) {
                const curr = q[head++];
                for (const next of adj.get(curr)) {
                    if (!visited.has(next)) {
                        visited.add(next);
                        q.push(next);
                    }
                }
            }
        }
    }

    // Volume & Area
    let volume = 0;
    let surfaceArea = 0;
    for (const face of faces) {
        const v0 = vertices[face[0]];
        const v1 = vertices[face[1]];
        const v2 = vertices[face[2]];
        
        // Signed volume
        volume += v0.dot(new THREE.Vector3().crossVectors(v1, v2)) / 6.0;
        
        // Area
        const e1 = new THREE.Vector3().subVectors(v1, v0);
        const e2 = new THREE.Vector3().subVectors(v2, v0);
        surfaceArea += e1.cross(e2).length() * 0.5;
    }

    return {
        uniqueVertices: vertices.length,
        triangles: faces.length,
        boundaryEdges,
        nonManifoldEdges,
        inconsistentNormals,
        components,
        volume: Math.abs(volume),
        surfaceArea
    };
}

window.runAudit = async function(binBase64, glbBase64, metaStr) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    // Use an offscreen canvas for rendering the 8 panels
    const renderWidth = 800;
    const renderHeight = 800;
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(renderWidth, renderHeight);
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Load original
    const meta = JSON.parse(metaStr);
    const binBytes = Uint8Array.from(atob(binBase64), c => c.charCodeAt(0));
    const posArray = new Float32Array(binBytes.buffer);
    const globalCenterX = (meta.min[0] + meta.max[0]) / 2;
    const globalCenterY = (meta.min[1] + meta.max[1]) / 2;
    const globalCenterZ = (meta.min[2] + meta.max[2]) / 2;
    const targetScale = 2.0 / meta.bSizeY;
    const scaleY = targetScale * 1.65;
    const posY = -0.22;
    
    const originalVerts = new Float32Array(posArray.length);
    for (let i = 0; i < posArray.length; i += 3) {
        originalVerts[i] = (posArray[i] - globalCenterX) * targetScale;
        originalVerts[i+1] = (posArray[i+1] - globalCenterY) * scaleY + posY;
        originalVerts[i+2] = (posArray[i+2] - globalCenterZ) * targetScale;
    }
    const geoOrig = new THREE.BufferGeometry();
    geoOrig.setAttribute('position', new THREE.BufferAttribute(originalVerts, 3));
    geoOrig.computeVertexNormals();
    geoOrig.computeBoundingBox();
    const meshOrig = new THREE.Mesh(geoOrig, new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }));

    // Load organic
    const loader = new THREE.GLTFLoader();
    const glbBytes = Uint8Array.from(atob(glbBase64), c => c.charCodeAt(0));
    const gltf = await new Promise(r => loader.parse(glbBytes.buffer, '', r));
    const meshOrg = gltf.scene.children[0];
    meshOrg.material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    meshOrg.geometry.computeBoundingBox();

    // Stats calculation
    const origStats = analyzeTopology(geoOrig.attributes.position, geoOrig.index);
    origStats.bbox = { min: geoOrig.boundingBox.min, max: geoOrig.boundingBox.max };
    origStats.bufferVertices = geoOrig.attributes.position.count;
    origStats.dimensions = new THREE.Vector3().subVectors(geoOrig.boundingBox.max, geoOrig.boundingBox.min);

    const orgStats = analyzeTopology(meshOrg.geometry.attributes.position, meshOrg.geometry.index);
    orgStats.bbox = { min: meshOrg.geometry.boundingBox.min, max: meshOrg.geometry.boundingBox.max };
    orgStats.bufferVertices = meshOrg.geometry.attributes.position.count;
    orgStats.dimensions = new THREE.Vector3().subVectors(meshOrg.geometry.boundingBox.max, meshOrg.geometry.boundingBox.min);

    window.auditData = { original: origStats, organic: orgStats };

    // Rendering the 2x4 matrix
    const matrixCanvas = document.createElement('canvas');
    matrixCanvas.width = renderWidth * 4;
    matrixCanvas.height = renderHeight * 2;
    const ctx = matrixCanvas.getContext('2d');
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

    async function renderView(mesh, row, col, type) {
        scene.add(mesh);
        const center = new THREE.Vector3();
        mesh.geometry.boundingBox.getCenter(center);
        const size = new THREE.Vector3();
        mesh.geometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = maxDim * 1.5;

        mesh.material.wireframe = (type === 'wireframe');

        if(type === 'perspective' || type === 'wireframe') {
            camera.position.set(center.x + dist, center.y + dist*0.8, center.z + dist);
        } else if(type === 'top') {
            camera.position.set(center.x, center.y + dist, center.z);
        } else if(type === 'side') {
            camera.position.set(center.x + dist, center.y, center.z);
        }
        camera.lookAt(center);
        camera.updateProjectionMatrix();
        
        renderer.render(scene, camera);
        
        ctx.drawImage(renderer.domElement, col * renderWidth, row * renderHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(type.toUpperCase(), col * renderWidth + 20, row * renderHeight + 60);

        scene.remove(mesh);
    }

    await renderView(meshOrig, 0, 0, 'perspective');
    await renderView(meshOrig, 0, 1, 'top');
    await renderView(meshOrig, 0, 2, 'side');
    await renderView(meshOrig, 0, 3, 'wireframe');

    await renderView(meshOrg, 1, 0, 'perspective');
    await renderView(meshOrg, 1, 1, 'top');
    await renderView(meshOrg, 1, 2, 'side');
    await renderView(meshOrg, 1, 3, 'wireframe');

    // Add row labels
    ctx.fillStyle = 'yellow';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText('ORIGINAL DEM', 20, 120);
    ctx.fillText('MORRO_ORGANIC', 20, renderHeight + 120);

    return matrixCanvas.toDataURL('image/png');
};
</script>
</body>
</html>
    `;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    await page.setContent(html);
    await new Promise(r => setTimeout(r, 1000));
    
    const dataURL = await page.evaluate(async (binBase64, glbBase64, metaStr) => {
        return await window.runAudit(binBase64, glbBase64, metaStr);
    }, binBase64, glbBase64, metaStr);
    
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync('scratch/matrix_2x4.png', base64Data, 'base64');
    
    const stats = await page.evaluate(() => window.auditData);
    fs.writeFileSync('scratch/audit_stats.json', JSON.stringify(stats, null, 2));
    
    console.log('Topological audit complete');
    await browser.close();
})();
