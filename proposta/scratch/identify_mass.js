const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching browser for precise mesh identification...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  page.on('console', msg => {
    console.log(`[PAGE CONSOLE] ${msg.text()}`);
  });

  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));

  const artifactDir = 'C:\\Users\\rodri\\.gemini\\antigravity\\brain\\6ff692e1-cadc-4d40-85d6-b39fbab6a5cc';

  console.log("Gathering detailed metadata about all meshes in the scene...");
  const meshData = await page.evaluate(() => {
    if (!window.app3D) return null;
    const data = [];
    window.app3D.scene.children.forEach(child => {
      if (child.isMesh || child.type === 'Mesh' || child.type === 'LineSegments' || child.type === 'Points') {
        data.push({
          name: child.name,
          type: child.type,
          visible: child.visible,
          position: { x: child.position.x, y: child.position.y, z: child.position.z },
          scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
          materialType: child.material ? child.material.type || child.material.constructor.name : 'none'
        });
      }
    });
    return data;
  });

  console.log("\n--- SCENE MESH DETAILED METADATA ---");
  meshData.forEach(m => {
    console.log(`Mesh: "${m.name}" | Type: ${m.type} | Visible: ${m.visible}`);
    console.log(`  Position: [${m.position.x.toFixed(2)}, ${m.position.y.toFixed(2)}, ${m.position.z.toFixed(2)}]`);
    console.log(`  Scale: [${m.scale.x.toFixed(2)}, ${m.scale.y.toFixed(2)}, ${m.scale.z.toFixed(2)}]`);
    console.log(`  Material: ${m.materialType}`);
    console.log('------------------------------------');
  });

  // Now, we will isolate each mountain and capture it individually to see exactly what it is.
  const mountains = ['mountain1', 'mountain2', 'mountain3', 'mountain4', 'mountain5'];
  for (let mName of mountains) {
    console.log(`\nReloading and isolating only ${mName} (with sky)...`);
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));
    
    await page.evaluate((target) => {
      if (window.app3D) {
        // Lock camera _update
        if (window.app3D.scene.camera) {
          window.app3D.scene.camera._update = function() {};
        }
        
        window.app3D.scene.children.forEach(child => {
          if (child.name === target || child.name === 'sky') {
            // Keep target and sky visible
            Object.defineProperty(child, 'visible', { get: () => true, set: () => {}, configurable: true });
          } else if (!child.isCamera) {
            // Hide everything else
            Object.defineProperty(child, 'visible', { get: () => false, set: () => {}, configurable: true });
          }
        });
      }
    }, mName);
    
    await new Promise(r => setTimeout(r, 500));
    const filename = `identify_${mName}.png`;
    const localPath = path.join(__dirname, filename);
    await page.screenshot({ path: localPath });
    fs.copyFileSync(localPath, path.join(artifactDir, filename));
    console.log(`Saved screenshot for ${mName} to ${filename}`);
  }

  await browser.close();
})();
