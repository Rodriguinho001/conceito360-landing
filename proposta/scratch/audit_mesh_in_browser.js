const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching browser for mesh runtime audit...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.text()}`);
    });
    
    console.log("Navigating...");
    await page.goto('http://localhost:3000');
    await new Promise(r => setTimeout(r, 6000));
    
    await page.evaluate(() => {
        console.log("--- RUNTIME MESH INSPECTION ---");
        const mesh = window.app3D.mesh;
        if (!mesh) {
            console.error("Mesh 'igloo' not found in window.app3D!");
            return;
        }
        
        console.log("Mesh name:", mesh.name);
        console.log("Mesh visible:", mesh.visible);
        console.log("Mesh scale:", JSON.stringify(mesh.scale));
        console.log("Mesh position:", JSON.stringify(mesh.position));
        
        // Geometry inspection
        const geo = mesh.geometry;
        if (!geo) {
            console.error("Mesh has no geometry!");
            return;
        }
        console.log("Geometry attributes:", Object.keys(geo.attributes));
        
        const posAttr = geo.attributes.position;
        if (posAttr) {
            console.log("Position count:", posAttr.count);
            console.log("First 15 position floats:", Array.from(posAttr.array.slice(0, 15)).join(', '));
        } else {
            console.error("Geometry has no POSITION attribute!");
        }
        
        const batchIdAttr = geo.attributes.batchId;
        if (batchIdAttr) {
            console.log("BatchId count:", batchIdAttr.count);
            console.log("First 15 batchId values:", Array.from(batchIdAttr.array.slice(0, 15)).join(', '));
        } else {
            console.warn("Geometry has no batchId attribute!");
        }
        
        // Material inspection
        const mat = mesh.material;
        if (!mat) {
            console.error("Mesh has no material!");
            return;
        }
        console.log("Material type:", mat.type);
        console.log("Material uniforms keys:", Object.keys(mat.uniforms || {}));
        
        const tMapUniform = mat.uniforms.tMap;
        if (tMapUniform) {
            console.log("tMap uniform type:", typeof tMapUniform.value);
            if (tMapUniform.value) {
                console.log("tMap texture image:", tMapUniform.value.image ? "DEFINED" : "UNDEFINED");
                if (tMapUniform.value.image) {
                    console.log("tMap image source:", tMapUniform.value.image.src);
                    console.log("tMap image dimensions:", tMapUniform.value.image.width, "x", tMapUniform.value.image.height);
                }
            } else {
                console.log("tMap value is null/undefined!");
            }
        }
        
        // WebGL Context Check
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (gl) {
                console.log("WebGL version:", gl.getParameter(gl.VERSION));
                console.log("WebGL error code:", gl.getError());
            } else {
                console.error("Failed to get WebGL context from canvas!");
            }
        }
        console.log("--------------------------------");
    });
    
    await browser.close();
})();
