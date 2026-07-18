const { Document, NodeIO } = require('@gltf-transform/core');
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', '..', 'morro_clean_final.glb');
const OUT_BIN      = path.join(__dirname, '..', '..', 'morro_triangles.bin');
const OUT_NORM_BIN = path.join(__dirname, '..', '..', 'morro_normals.bin');
const OUT_UV_BIN   = path.join(__dirname, '..', '..', 'morro_uvs.bin');
const OUT_META     = path.join(__dirname, '..', '..', 'morro_meta.json');

(async () => {
    const io = new NodeIO();
    console.log('Reading:', TARGET);
    const doc = await io.read(TARGET);
    
    // Find the largest mesh
    let maxMesh = null;
    let maxPos = null;
    let maxNorm = null;
    let maxUv = null;
    let maxIndices = null;
    let maxTriangles = 0;

    for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
            const pos = prim.getAttribute('POSITION');
            if (pos && pos.getCount() > maxTriangles) {
                maxTriangles = pos.getCount();
                maxPos = pos;
                maxNorm = prim.getAttribute('NORMAL');
                maxUv = prim.getAttribute('TEXCOORD_0');
                maxIndices = prim.getIndices();
            }
        }
    }

    if (!maxPos) {
        console.error("No mesh found in GLB!");
        process.exit(1);
    }

    const indArray = maxIndices ? maxIndices.getArray() : null;

    let numTriangles = 0;
    if (indArray) {
        numTriangles = indArray.length / 3;
    } else {
        numTriangles = maxPos.getCount() / 3;
    }

    console.log(`Extracting ${numTriangles} triangles...`);

    const posOut = new Float32Array(numTriangles * 3 * 3);
    const normOut = maxNorm ? new Float32Array(numTriangles * 3 * 3) : null;
    const uvOut = maxUv ? new Float32Array(numTriangles * 3 * 2) : null;

    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    
    // Scratch arrays for getting elements
    const vPos = [];
    const vNorm = [];
    const vUv = [];

    for (let i = 0; i < numTriangles * 3; i++) {
        const vIdx = indArray ? indArray[i] : i;
        
        // Extract original Blender coordinates
        maxPos.getElement(vIdx, vPos);
        const bx = vPos[0];
        const by = vPos[1];
        const bz = vPos[2];
        
        // Convert Blender Z-up to Three.js Y-up natively
        // Three.X = Blender.X
        // Three.Y = Blender.Z (Up)
        // Three.Z = -Blender.Y (Forward)
        const px = bx;
        const py = bz;
        const pz = -by;
        
        posOut[i * 3 + 0] = px;
        posOut[i * 3 + 1] = py;
        posOut[i * 3 + 2] = pz;

        if (px < min[0]) min[0] = px;
        if (py < min[1]) min[1] = py;
        if (pz < min[2]) min[2] = pz;
        if (px > max[0]) max[0] = px;
        if (py > max[1]) max[1] = py;
        if (pz > max[2]) max[2] = pz;

        if (maxNorm) {
            maxNorm.getElement(vIdx, vNorm);
            const nx = vNorm[0];
            const ny = vNorm[1];
            const nz = vNorm[2];
            
            normOut[i * 3 + 0] = nx;
            normOut[i * 3 + 1] = nz;
            normOut[i * 3 + 2] = -ny;
        }

        if (maxUv) {
            maxUv.getElement(vIdx, vUv);
            uvOut[i * 2 + 0] = vUv[0];
            uvOut[i * 2 + 1] = vUv[1];
        }
    }

    fs.writeFileSync(OUT_BIN, Buffer.from(posOut.buffer));
    if (maxNorm) fs.writeFileSync(OUT_NORM_BIN, Buffer.from(normOut.buffer));
    if (maxUv) fs.writeFileSync(OUT_UV_BIN, Buffer.from(uvOut.buffer));

    const meta = {
        hasNormal: !!maxNorm,
        hasUV: !!maxUv,
        triangles: numTriangles,
        min, max
    };
    fs.writeFileSync(OUT_META, JSON.stringify(meta, null, 2));

    console.log("Extraction complete!");

})();
