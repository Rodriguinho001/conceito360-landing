const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching browser for isolation mapping...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });

  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  console.log("Waiting 5 seconds for page load...");
  await new Promise(r => setTimeout(r, 5000));

  // Lock camera to a high bird-eye perspective so we see all mountains and terrain pieces
  await page.evaluate(() => {
    if (window.app3D && window.app3D.scene.camera) {
      const cam = window.app3D.scene.camera;
      cam._update = function() {}; // Lock update
      cam.position.set(-20, 10, 20);
      cam.lookAt(0, 0.5, 0);
      cam.updateMatrixWorld(true);
      console.log("Camera locked at high bird-eye view.");
    }
  });

  const meshesToIsolate = [
    'mountain1', 'mountain2', 'mountain3', 'mountain4', 'mountain5',
    'igloobase',
    'terrain1', 'terrain2', 'terrain3', 'terrain4', 'terrain5',
    'terrainpatch1', 'terrainpatch2',
    'igloo'
  ];

  const artifactDir = 'C:\\Users\\rodri\\.gemini\\antigravity\\brain\\6ff692e1-cadc-4d40-85d6-b39fbab6a5cc';

  for (let meshName of meshesToIsolate) {
    console.log(`Isolating mesh: "${meshName}"...`);
    
    const exists = await page.evaluate((targetName) => {
      if (!window.app3D) return false;
      let found = false;
      window.app3D.scene.children.forEach(child => {
        if (child.name === targetName) {
          child.visible = true;
          found = true;
        } else if (!child.isCamera && child.name !== 'sky') {
          // Keep sky visible for perspective orientation, hide everything else
          child.visible = false;
        }
      });
      return found;
    }, meshName);

    if (exists) {
      // Wait 300ms for layout/render
      await new Promise(r => setTimeout(r, 300));
      
      const filename = `isolate_${meshName}.png`;
      const localPath = path.join(__dirname, filename);
      await page.screenshot({ path: localPath });
      console.log(`Saved isolated view to ${localPath}`);
      
      const destPath = path.join(artifactDir, filename);
      try {
        fs.copyFileSync(localPath, destPath);
        console.log(`Copied isolated view to artifacts: ${destPath}`);
      } catch (e) {
        console.error(`Failed to copy artifact for ${meshName}:`, e.message);
      }
    } else {
      console.warn(`Mesh "${meshName}" not found in active scene.`);
    }
  }

  await browser.close();
  console.log("Mesh isolation capture completed!");
})();
