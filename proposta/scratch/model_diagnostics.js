const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Catch console logs
    page.on('console', msg => console.log('PAGE:', msg.text()));

    await page.goto('http://localhost:3000');
    await new Promise(r => setTimeout(r, 6000));
    
    // Evaluate geometry metrics
    const metrics = await page.evaluate(() => {
        const mesh = window.app3D.mesh;
        if (!mesh) return { error: 'No mesh found' };
        
        mesh.geometry.computeBoundingBox();
        const bbox = mesh.geometry.boundingBox;
        
        const posAttr = mesh.geometry.attributes.position;
        let maxRelY = -Infinity;
        let minRelY = Infinity;
        
        mesh.updateMatrixWorld(true);
        const matrix = mesh.matrixWorld;
        
        let aboveWater = 0;
        let belowWater = 0;
        const waterLevel = 0.05; 
        
        const e = matrix.elements;
        
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const z = posAttr.getZ(i);
            
            const worldY = e[1]*x + e[5]*y + e[9]*z + e[13];
            
            if (worldY > maxRelY) maxRelY = worldY;
            if (worldY < minRelY) minRelY = worldY;
            
            if (worldY > waterLevel) aboveWater++;
            else belowWater++;
        }
        
        return {
            boxMin: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
            boxMax: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
            aboveWater,
            belowWater,
            maxWorldY: maxRelY,
            minWorldY: minRelY,
            totalVertices: posAttr.count
        };
    });
    
    console.log("Metrics:", JSON.stringify(metrics, null, 2));
    fs.writeFileSync('scratch/model_metrics.json', JSON.stringify(metrics, null, 2));
    
    // Now setup screenshots by injecting a script to change materials
    await page.evaluate(() => {
        window.app3D.update = function(){}; // Lock update
        
        // Hide water and everything else except igloo
        window.app3D.scene.traverse(child => {
            if (child.isMesh && child.name !== 'igloo') {
                child.visible = false;
            }
        });
        
        const mesh = window.app3D.mesh;
        // Keep current position/scale, just adjust camera
        const camera = window.app3D.scene.camera;
        camera.position.set(0, 0.5, 3.5); // Closer to see geometry
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    });
    
    // 1. Wireframe
    await page.evaluate(() => {
        const mesh = window.app3D.mesh;
        mesh.material.wireframe = true;
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'scratch/igloo_wireframe.png' });
    
    // 2. MeshNormalMaterial equivalent
    await page.evaluate(() => {
        const mesh = window.app3D.mesh;
        mesh.material.wireframe = false;
        mesh.material.fragmentShader = `
            varying vec3 vWorldNormal;
            void main() {
                vec3 normal = normalize(vWorldNormal);
                gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
            }
        `;
        mesh.material.needsUpdate = true;
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'scratch/igloo_normal.png' });
    
    // 3. Clipping below sea level
    await page.evaluate(() => {
        const mesh = window.app3D.mesh;
        
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

            varying vec2 vUv;
            varying vec3 vWorldNormal;
            varying vec3 vWorldPosOut;

            void main() {
                vUv = uv;

                mat4 batchingMatrix = getBatchingMatrix(batchId);
                vec3 pos = (batchingMatrix * vec4(position, 1.0)).xyz;

                vec3 transformedNormal = (batchingMatrix * vec4(normal, 0.0)).xyz;
                vWorldNormal = normalize(transformedNormal);

                vec4 wPos = modelMatrix * vec4(pos, 1.0);
                vWorldPosOut = wPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * wPos;
            }
        `;
        
        mesh.material.fragmentShader = `
            varying vec3 vWorldPosOut;
            varying vec3 vWorldNormal;
            void main() {
                if (vWorldPosOut.y < 0.05) {
                    discard;
                }
                vec3 normal = normalize(vWorldNormal);
                gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
            }
        `;
        mesh.material.needsUpdate = true;
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'scratch/igloo_clipped.png' });
    
    console.log('Diagnostic rendering completed.');
    await browser.close();
})();
