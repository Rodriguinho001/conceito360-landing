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
        
        let bottomFloorCount = 0;
        const keptTriangles = [];
        
        for (let i = 0; i < posArray.length; i += 9) {
            const v0x = posArray[i], v0y = posArray[i+1], v0z = posArray[i+2];
            const v1x = posArray[i+3], v1y = posArray[i+4], v1z = posArray[i+5];
            const v2x = posArray[i+6], v2y = posArray[i+7], v2z = posArray[i+8];
            
            const w0x = (v0x - globalCenterX) * targetScale;
            const w0y = (v0y - globalCenterY) * scaleY + posY;
            const w0z = (v0z - globalCenterZ) * targetScale;
            
            const w1x = (v1x - globalCenterX) * targetScale;
            const w1y = (v1y - globalCenterY) * scaleY + posY;
            const w1z = (v1z - globalCenterZ) * targetScale;
            
            const w2x = (v2x - globalCenterX) * targetScale;
            const w2y = (v2y - globalCenterY) * scaleY + posY;
            const w2z = (v2z - globalCenterZ) * targetScale;
            
            const e1x = w1x - w0x, e1y = w1y - w0y, e1z = w1z - w0z;
            const e2x = w2x - w0x, e2y = w2y - w0y, e2z = w2z - w0z;
            let nx = e1y * e2z - e1z * e2y;
            let ny = e1z * e2x - e1x * e2z;
            let nz = e1x * e2y - e1y * e2x;
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
            if(len > 0) { nx/=len; ny/=len; nz/=len; }
            
            let hasVertexBelow = false;
            const wy = [w0y, w1y, w2y];
            for(let v = 0; v < 3; v++) {
                if (wy[v] < -0.8) {
                    hasVertexBelow = true;
                    if (ny > 0.8) bottomFloorCount++; // As requested by user
                }
            }
            
            if (!hasVertexBelow) {
                keptTriangles.push(
                    w0x, w0y, w0z,
                    w1x, w1y, w1z,
                    w2x, w2y, w2z
                );
            }
        }
        
        // Inject THREE
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/three@0.128.0/build/three.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        // Inject GLTFExporter
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/three@0.128.0/examples/js/exporters/GLTFExporter.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        const geometry = new window.THREE.BufferGeometry();
        const vertices = new Float32Array(keptTriangles);
        geometry.setAttribute('position', new window.THREE.BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        
        const mesh = new window.THREE.Mesh(geometry, new window.THREE.MeshNormalMaterial());
        mesh.name = 'trimmed_igloo';
        
        // Export
        const exporter = new window.THREE.GLTFExporter();
        const glbData = await new Promise(resolve => {
            exporter.parse(mesh, (gltf) => {
                resolve(gltf);
            }, { binary: true });
        });
        
        // Add to scene to replace old igloo for rendering
        window.app3D.update = function(){};
        window.app3D.scene.traverse(child => {
            if (child.isMesh && child.name === 'igloo') {
                child.visible = false;
            }
        });
        window.app3D.scene.add(mesh);
        
        // base64 encode glb
        const uint8Array = new Uint8Array(glbData);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const b64 = btoa(binary);
        
        return {
            bottomFloorCount,
            originalTriangles: posArray.length / 9,
            keptTriangles: keptTriangles.length / 9,
            glbBase64: b64
        };
    });
    
    // Save GLB
    const glbBuffer = Buffer.from(reportData.glbBase64, 'base64');
    fs.writeFileSync('scratch/morro_trimmed.glb', glbBuffer);
    
    // Screenshots
    // 1. Perspective
    await page.evaluate(() => {
        document.body.style.backgroundColor = '#000000';
        document.body.style.backgroundImage = 'none';
        const canvas = document.querySelector('canvas');
        if(canvas) canvas.style.background = '#000000';
        
        const camera = window.app3D.scene.camera;
        camera.position.set(0, 0.8, 7.5);
        camera.lookAt(0, 0.3, 0);
        camera.updateProjectionMatrix();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'scratch/trimmed_perspective.png' });
    
    // 2. Top View
    await page.evaluate(() => {
        const camera = window.app3D.scene.camera;
        camera.fov = 5; 
        camera.position.set(0, 50, 0);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'scratch/trimmed_top.png' });
    
    fs.writeFileSync('scratch/trim_report.json', JSON.stringify({
        bottomFloorCount: reportData.bottomFloorCount,
        originalTriangles: reportData.originalTriangles,
        keptTriangles: reportData.keptTriangles
    }, null, 2));
    
    console.log('Done trimming');
    await browser.close();
})();
