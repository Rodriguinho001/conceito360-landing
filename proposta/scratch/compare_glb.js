const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    // 1. Load original BIN
    const binBuffer = fs.readFileSync('morro_triangles.bin');
    const binBase64 = binBuffer.toString('base64');
    
    // 2. Load organic GLB
    const glbBuffer = fs.readFileSync('scratch/morro_organic.glb');
    const glbBase64 = glbBuffer.toString('base64');
    
    const html = `
<!DOCTYPE html>
<html>
<head><style>body{margin:0;overflow:hidden;background:#333;}</style></head>
<body>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
window.initComparison = function(binBase64, glbBase64, metaStr) {
    return new Promise(async resolve => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(10, 10, 10);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));
        
        // --- 1. Load Original BIN ---
        const meta = JSON.parse(metaStr);
        const binBytes = Uint8Array.from(atob(binBase64), c => c.charCodeAt(0));
        const posArray = new Float32Array(binBytes.buffer);
        
        const globalCenterX = (meta.min[0] + meta.max[0]) / 2;
        const globalCenterY = (meta.min[1] + meta.max[1]) / 2;
        const globalCenterZ = (meta.min[2] + meta.max[2]) / 2;
        const targetScale = 2.0 / meta.bSizeY;
        const yExaggeration = 1.65;
        const scaleY = targetScale * yExaggeration;
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
        
        // --- 2. Load Organic GLB ---
        const loader = new THREE.GLTFLoader();
        const glbBytes = Uint8Array.from(atob(glbBase64), c => c.charCodeAt(0));
        
        const gltf = await new Promise(r => loader.parse(glbBytes.buffer, '', r));
        const meshOrg = gltf.scene.children[0];
        meshOrg.material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
        meshOrg.geometry.computeBoundingBox();
        
        // --- 3. Position them side-by-side ---
        const center = new THREE.Vector3();
        geoOrig.boundingBox.getCenter(center);
        const size = new THREE.Vector3();
        geoOrig.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        meshOrig.position.x = -maxDim * 0.6;
        meshOrg.position.x = maxDim * 0.6;
        
        scene.add(meshOrig);
        scene.add(meshOrg);
        
        // Add labels
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ORIGINAL DEM', 256, 128);
        ctx.fillText('ORGANIC', 768, 128);
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({map: tex});
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(maxDim*2, maxDim*0.5, 1);
        sprite.position.set(0, center.y + maxDim*0.8, center.z);
        scene.add(sprite);
        
        // Camera setup
        const dist = maxDim * 1.8;
        camera.position.set(center.x, center.y + dist*0.8, center.z + dist);
        camera.lookAt(center);
        camera.updateProjectionMatrix();
        
        renderer.render(scene, camera);
        
        // Extract stats
        const stats = {
            original: {
                vertices: geoOrig.attributes.position.count,
                triangles: geoOrig.attributes.position.count / 3,
                bbox: {
                    min: { x: geoOrig.boundingBox.min.x.toFixed(2), y: geoOrig.boundingBox.min.y.toFixed(2), z: geoOrig.boundingBox.min.z.toFixed(2) },
                    max: { x: geoOrig.boundingBox.max.x.toFixed(2), y: geoOrig.boundingBox.max.y.toFixed(2), z: geoOrig.boundingBox.max.z.toFixed(2) }
                }
            },
            organic: {
                vertices: meshOrg.geometry.attributes.position.count,
                triangles: meshOrg.geometry.attributes.position.count / 3,
                bbox: {
                    min: { x: meshOrg.geometry.boundingBox.min.x.toFixed(2), y: meshOrg.geometry.boundingBox.min.y.toFixed(2), z: meshOrg.geometry.boundingBox.min.z.toFixed(2) },
                    max: { x: meshOrg.geometry.boundingBox.max.x.toFixed(2), y: meshOrg.geometry.boundingBox.max.y.toFixed(2), z: meshOrg.geometry.boundingBox.max.z.toFixed(2) }
                }
            }
        };
        
        window.compareStats = stats;
        resolve();
    });
};
</script>
</body>
</html>
    `;

    const metaStr = fs.readFileSync('morro_meta.json', 'utf8');

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.setContent(html);
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(async (binBase64, glbBase64, metaStr) => {
        await window.initComparison(binBase64, glbBase64, metaStr);
    }, binBase64, glbBase64, metaStr);
    
    await page.screenshot({ path: 'scratch/comparison.png' });
    
    const stats = await page.evaluate(() => window.compareStats);
    fs.writeFileSync('scratch/compare_stats.json', JSON.stringify(stats, null, 2));
    
    console.log('Comparison done');
    await browser.close();
})();
