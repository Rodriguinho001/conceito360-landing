const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const glbBuffer = fs.readFileSync('scratch/morro_organic.glb');
    const glbBase64 = glbBuffer.toString('base64');
    
    const html = `
<!DOCTYPE html>
<html>
<head><style>body{margin:0;overflow:hidden;background:#000;}</style></head>
<body>
<script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
window.initViewer = function(glbBase64) {
    return new Promise(resolve => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
        const loader = new THREE.GLTFLoader();
        const binaryString = atob(glbBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        loader.parse(bytes.buffer, '', (gltf) => {
            const mesh = gltf.scene.children[0];
            scene.add(mesh);
            
            mesh.geometry.computeBoundingBox();
            const center = new THREE.Vector3();
            mesh.geometry.boundingBox.getCenter(center);
            const size = new THREE.Vector3();
            mesh.geometry.boundingBox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            
            window.viewerContext = { scene, camera, renderer, mesh, center, maxDim };
            resolve();
        });
    });
};
window.renderView = function(viewType) {
    const { scene, camera, renderer, mesh, center, maxDim } = window.viewerContext;
    mesh.material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    
    const dist = maxDim * 1.5;
    if(viewType === 'perspective') {
        camera.position.set(center.x + dist, center.y + dist*0.8, center.z + dist);
    } else if(viewType === 'top') {
        camera.position.set(center.x, center.y + dist, center.z);
    } else if(viewType === 'side') {
        camera.position.set(center.x + dist, center.y, center.z);
    } else if(viewType === 'wireframe') {
        camera.position.set(center.x + dist, center.y + dist*0.8, center.z + dist);
        mesh.material.wireframe = true;
    }
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
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
    
    await page.evaluate(async (base64) => {
        await window.initViewer(base64);
    }, glbBase64);
    
    await page.evaluate(() => window.renderView('perspective'));
    await page.screenshot({ path: 'scratch/organic_perspective.png' });
    
    await page.evaluate(() => window.renderView('top'));
    await page.screenshot({ path: 'scratch/organic_top.png' });
    
    await page.evaluate(() => window.renderView('side'));
    await page.screenshot({ path: 'scratch/organic_side.png' });
    
    await page.evaluate(() => window.renderView('wireframe'));
    await page.screenshot({ path: 'scratch/organic_wireframe.png' });
    
    console.log('Organic GLB screenshots captured');
    await browser.close();
})();
