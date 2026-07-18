const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const glbBuffer = fs.readFileSync('scratch/morro_organic.glb');
    const glbBase64 = glbBuffer.toString('base64');
    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    await page.goto('http://localhost:3000');
    await new Promise(r => setTimeout(r, 6000));
    
    await page.evaluate(async (base64) => {
        // Stop default update
        window.app3D.update = function(){};
        
        // Inject Three + GLTFLoader
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/three@0.128.0/build/three.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
        
        // Load the organic GLB
        const loader = new window.THREE.GLTFLoader();
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const gltf = await new Promise(resolve => loader.parse(bytes.buffer, '', resolve));
        const newMesh = gltf.scene.children[0];
        const newGeometry = newMesh.geometry;
        
        // Swap geometry in the existing app3D.mesh to avoid scene addition errors
        const targetMesh = window.app3D.mesh;
        
        // Convert to non-indexed if necessary or just use the attribute
        const posAttr = newGeometry.attributes.position.array;
        
        // We use the app's internal THREE to create the buffer attribute
        // window.THREE is the injected one, app3D has its own closure THREE.
        // But we can just assign the raw array directly if we use the same type.
        // Actually, safer to just replace the whole geometry object with the injected one?
        // Let's see if the app's renderer accepts an injected geometry object.
        targetMesh.geometry = newGeometry;
        
        // Remove vertex shaders that might discard based on old logic
        targetMesh.material = new window.THREE.MeshNormalMaterial({ side: 2 }); // DoubleSide
        
        // Apply user requested transforms
        targetMesh.scale.y = 5.0;
        targetMesh.rotation.z = 30 * Math.PI / 180;
        targetMesh.position.x = 5.0;
        
        // Force update
        targetMesh.updateMatrixWorld(true);
        
        // Setup camera to see the result clearly
        const camera = window.app3D.scene.camera;
        camera.position.set(0, 5, 20);
        camera.lookAt(targetMesh.position);
        camera.updateProjectionMatrix();
        
        // Remove background for clarity
        document.body.style.backgroundColor = '#000000';
        document.body.style.backgroundImage = 'none';
        const canvas = document.querySelector('canvas');
        if(canvas) canvas.style.background = '#000000';
        
    }, glbBase64);
    
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'scratch/runtime_test.png' });
    
    console.log('Runtime test screenshot captured');
    await browser.close();
})();
