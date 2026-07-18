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
        
        const waterLevel = 0.05;
        
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        let fullMinX = Infinity, fullMaxX = -Infinity;
        let fullMinZ = Infinity, fullMaxZ = -Infinity;
        
        let bins = {
            '< -1.0': 0,
            '-1.0 to -0.5': 0,
            '-0.5 to 0': 0,
            '0 to 0.5': 0,
            '0.5 to 1.0': 0,
            '> 1.0': 0
        };
        
        let verticalWallCount = 0;
        let aboveWaterCount = 0;
        let totalVertices = posArray.length / 3;
        
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
            
            const wPos = [ [w0x,w0y,w0z], [w1x,w1y,w1z], [w2x,w2y,w2z] ];
            for (let v = 0; v < 3; v++) {
                const wx = wPos[v][0];
                const wy = wPos[v][1];
                const wz = wPos[v][2];
                
                if (wx < fullMinX) fullMinX = wx;
                if (wx > fullMaxX) fullMaxX = wx;
                if (wz < fullMinZ) fullMinZ = wz;
                if (wz > fullMaxZ) fullMaxZ = wz;
                
                if (wy > waterLevel) {
                    aboveWaterCount++;
                    if (wx < minX) minX = wx;
                    if (wx > maxX) maxX = wx;
                    if (wy < minY) minY = wy;
                    if (wy > maxY) maxY = wy;
                    if (wz < minZ) minZ = wz;
                    if (wz > maxZ) maxZ = wz;
                }
                
                if (wy < -1.0) bins['< -1.0']++;
                else if (wy < -0.5) bins['-1.0 to -0.5']++;
                else if (wy < 0.0) bins['-0.5 to 0']++;
                else if (wy < 0.5) bins['0 to 0.5']++;
                else if (wy < 1.0) bins['0.5 to 1.0']++;
                else bins['> 1.0']++;
                
                if (ny < 0.1 && wy < 0.2) {
                    verticalWallCount++;
                }
            }
        }
        
        const fullArea = (fullMaxX - fullMinX) * (fullMaxZ - fullMinZ);
        const peakArea = (maxX - minX) * (maxZ - minZ);
        
        return {
            bboxPeak: {
                min: { x: minX, y: minY, z: minZ },
                max: { x: maxX, y: maxY, z: maxZ },
                size: { x: maxX - minX, y: minY === Infinity ? 0 : maxY - minY, z: maxZ - minZ }
            },
            area: {
                fullArea,
                peakArea,
                percentage: (peakArea / fullArea) * 100
            },
            histogram: bins,
            verticalWallCount,
            totalVertices,
            aboveWaterCount
        };
    });
    
    fs.writeFileSync('scratch/deep_report.json', JSON.stringify(reportData, null, 2));
    
    // Now setup the scene for the requested captures
    await page.evaluate(() => {
        window.app3D.update = function(){}; // Lock update
        
        // Hide EVERYTHING except igloo
        window.app3D.scene.traverse(child => {
            if (child.isMesh && child.name !== 'igloo') {
                child.visible = false;
            }
        });
        
        // 1. peak_only_wireframe.png
        document.body.style.backgroundColor = '#000000';
        document.body.style.backgroundImage = 'none';
        const canvas = document.querySelector('canvas');
        if(canvas) canvas.style.background = '#000000';
        
        const mesh = window.app3D.mesh;
        mesh.material.wireframe = true;
        mesh.material.vertexShader = `
            attribute float batchId;
            uniform sampler2D batchingTexture;
            mat4 getBatchingMatrix(const in float i) {
                int size = textureSize(batchingTexture, 0).x;
                int j = int(i) * 4;
                int x = j % size;
                int y = j / size;
                vec4 v1 = texelFetch(batchingTexture, ivec2(x, y), 0);
                vec4 v2 = texelFetch(batchingTexture, ivec2(x + 1, y), 0);
                vec4 v3 = texelFetch(batchingTexture, ivec2(x + 2, y), 0);
                vec4 v4 = texelFetch(batchingTexture, ivec2(x + 3, y), 0);
                return mat4(v1, v2, v3, v4);
            }
            varying vec3 vWorldPosOut;
            void main() {
                mat4 batchingMatrix = getBatchingMatrix(batchId);
                vec3 pos = (batchingMatrix * vec4(position, 1.0)).xyz;
                vec4 wPos = modelMatrix * vec4(pos, 1.0);
                vWorldPosOut = wPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * wPos;
            }
        `;
        mesh.material.fragmentShader = `
            varying vec3 vWorldPosOut;
            void main() {
                if (vWorldPosOut.y < 0.05) discard;
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            }
        `;
        mesh.material.needsUpdate = true;
        
        // Position camera
        const camera = window.app3D.scene.camera;
        camera.position.set(0, 0.8, 7.5);
        camera.lookAt(0, 0.3, 0);
        camera.updateProjectionMatrix();
    });
    
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'scratch/peak_only_wireframe.png' });
    
    // 2. top_view.png
    await page.evaluate(() => {
        const camera = window.app3D.scene.camera;
        camera.fov = 5; // Zoom in
        camera.position.set(0, 50, 0);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        
        const mesh = window.app3D.mesh;
        mesh.material.wireframe = false;
        mesh.material.fragmentShader = `
            varying vec3 vWorldPosOut;
            void main() {
                if (vWorldPosOut.y > 0.05) {
                    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); // Peak is green
                } else {
                    gl_FragColor = vec4(0.3, 0.3, 0.3, 1.0); // Base is gray
                }
            }
        `;
        mesh.material.needsUpdate = true;
    });
    
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'scratch/top_view.png' });
    
    console.log('Done');
    await browser.close();
})();
