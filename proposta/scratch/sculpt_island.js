const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    await page.goto('http://localhost:3000');
    await new Promise(r => setTimeout(r, 6000));
    
    const reportData = await page.evaluate(async () => {
        const meta = await fetch('morro_meta.json').then(r=>r.json());
        const buffer = await fetch('morro_triangles.bin').then(r=>r.arrayBuffer());
        const posArray = new Float32Array(buffer);
        
        const globalCenterX = (meta.min[0] + meta.max[0]) / 2;
        const globalCenterY = (meta.min[1] + meta.max[1]) / 2;
        const globalCenterZ = (meta.min[2] + meta.max[2]) / 2;
        
        const targetScale = 2.0 / meta.bSizeY;
        const yExaggeration = 1.65;
        const scaleY = targetScale * yExaggeration;
        const posY = -0.22;
        
        // 1. Indexing vertices and computing world positions
        const uniqueVertices = [];
        const vertexMap = new Map();
        const indices = [];
        
        for (let i = 0; i < posArray.length; i += 3) {
            const vx = posArray[i];
            const vy = posArray[i+1];
            const vz = posArray[i+2];
            
            const wx = (vx - globalCenterX) * targetScale;
            let wy = (vy - globalCenterY) * scaleY + posY;
            const wz = (vz - globalCenterZ) * targetScale;
            
            // Apply radial falloff (Islandification)
            // Center roughly at X: 0.27, Z: -1.11
            const dx = (wx - 0.27) / 4.0;
            const dz = (wz + 1.11) / 3.0;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist > 0.8) {
                // Smooth falloff pushing edges down
                const falloff = Math.pow(dist - 0.8, 1.5) * 2.0; 
                wy -= falloff;
            }
            
            const key = wx.toFixed(4) + ',' + wy.toFixed(4) + ',' + wz.toFixed(4);
            let idx = vertexMap.get(key);
            if (idx === undefined) {
                idx = uniqueVertices.length;
                uniqueVertices.push({ x: wx, y: wy, z: wz });
                vertexMap.set(key, idx);
            }
            indices.push(idx);
        }
        
        // 2. Filter Triangles (Keep if at least one vertex is above -0.8)
        const keptIndices = [];
        for (let i = 0; i < indices.length; i += 3) {
            const iA = indices[i];
            const iB = indices[i+1];
            const iC = indices[i+2];
            
            const yA = uniqueVertices[iA].y;
            const yB = uniqueVertices[iB].y;
            const yC = uniqueVertices[iC].y;
            
            if (yA >= -0.8 || yB >= -0.8 || yC >= -0.8) {
                keptIndices.push(iA, iB, iC);
            }
        }
        
        // 3. Find boundary edges to cap the bottom
        const edgeMap = new Map();
        for (let i = 0; i < keptIndices.length; i += 3) {
            const iA = keptIndices[i];
            const iB = keptIndices[i+1];
            const iC = keptIndices[i+2];
            
            const edges = [
                { a: iA, b: iB },
                { a: iB, b: iC },
                { a: iC, b: iA }
            ];
            
            for (const e of edges) {
                const min = Math.min(e.a, e.b);
                const max = Math.max(e.a, e.b);
                const key = min + '-' + max;
                if (!edgeMap.has(key)) {
                    edgeMap.set(key, { count: 1, a: e.a, b: e.b });
                } else {
                    edgeMap.get(key).count++;
                }
            }
        }
        
        // 4. Create bottom cap
        // Flatten the bottom vertices to exactly -0.8 to create a perfect flat base
        for(let i=0; i<uniqueVertices.length; i++) {
            if(uniqueVertices[i].y < -0.8) uniqueVertices[i].y = -0.8;
        }
        
        const bottomCenterIdx = uniqueVertices.length;
        uniqueVertices.push({ x: 0.27, y: -0.8, z: -1.11 });
        
        let cappedFaces = 0;
        for (const [key, edge] of edgeMap.entries()) {
            if (edge.count === 1) {
                // Boundary edge. Winding order must be reversed to face down/outward.
                // The original edge is A -> B. The cap triangle should be B -> A -> BottomCenter.
                keptIndices.push(edge.b, edge.a, bottomCenterIdx);
                cappedFaces++;
            }
        }
        
        // 5. Build final flat array for Three.js
        const finalTriangles = new Float32Array(keptIndices.length * 3);
        for (let i = 0; i < keptIndices.length; i++) {
            const v = uniqueVertices[keptIndices[i]];
            finalTriangles[i*3] = v.x;
            finalTriangles[i*3+1] = v.y;
            finalTriangles[i*3+2] = v.z;
        }
        
        // Inject dependencies
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/three@0.128.0/build/three.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/three@0.128.0/examples/js/exporters/GLTFExporter.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
        
        const geometry = new window.THREE.BufferGeometry();
        geometry.setAttribute('position', new window.THREE.BufferAttribute(finalTriangles, 3));
        geometry.computeVertexNormals();
        
        const material = new window.THREE.MeshStandardMaterial({ color: 0x888888, wireframe: false });
        const mesh = new window.THREE.Mesh(geometry, material);
        mesh.name = 'organic_igloo';
        
        // Export
        const exporter = new window.THREE.GLTFExporter();
        const glbData = await new Promise(resolve => {
            exporter.parse(mesh, (gltf) => {
                resolve(gltf);
            }, { binary: true });
        });
        
        const uint8Array = new Uint8Array(glbData);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        
        return {
            originalVertices: posArray.length / 3,
            uniqueVertices: uniqueVertices.length,
            keptFaces: keptIndices.length / 3,
            cappedFaces,
            glbBase64: btoa(binary)
        };
    });
    
    fs.writeFileSync('scratch/morro_organic.glb', Buffer.from(reportData.glbBase64, 'base64'));
    
    fs.writeFileSync('scratch/sculpt_report.json', JSON.stringify({
        originalVertices: reportData.originalVertices,
        uniqueVertices: reportData.uniqueVertices,
        keptFaces: reportData.keptFaces,
        cappedFaces: reportData.cappedFaces
    }, null, 2));
    
    console.log('Done sculpting organic island');
    await browser.close();
})();
