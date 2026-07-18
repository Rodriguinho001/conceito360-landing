const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set viewport to a nice standard desktop resolution
  await page.setViewport({ width: 1200, height: 800 });
  
  // Capture page console logs
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error(`[PAGE EXCEPTION]: ${err.toString()}`);
  });

  console.log("Navigating to http://localhost:3000...");
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.error("Navigation error:", e.message);
  }
  
  console.log("Waiting 5 seconds for WebGL scene to load and render...");
  await new Promise(r => setTimeout(r, 5000));
  
  // Hide water and lock camera update
  console.log("Preparing scene: keeping water visible and locking camera _update...");
  await page.evaluate(() => {
    if (window.app3D) {
      console.log("Found window.app3D!");
      // Keep water mesh visible
      // Ensure water mesh remains visible
      if (window.app3D.waterMesh) {
        window.app3D.waterMesh.visible = true;
        console.log("Water mesh visible.");
      }
      
      // Lock camera update function to prevent auto-overrides
      if (window.app3D.scene.camera) {
        window.app3D.scene.camera._update = function() {
          // Locked
        };
        console.log("Camera _update function locked.");
      }
    } else {
      console.error("window.app3D NOT found!");
    }
  });

  const views = [
    {
      name: 'final_chosen',
      desc: 'Final Chosen View',
      pos: { x: -8, y: 2.5, z: 16 },
      target: { x: 0, y: 0.2, z: 0 }
    },
    {
      name: 'base_closeup',
      desc: 'Base Close-up',
      pos: { x: 2, y: 0.4, z: 5 },
      target: { x: 0, y: 0.1, z: 0 }
    }
  ];

  const artifactDir = 'C:\\Users\\rodri\\.gemini\\antigravity-ide\\brain\\149210da-6390-4eb1-ad55-25bb79f5fc17';

  for (let view of views) {
    console.log(`Setting up ${view.desc} View (Position: ${JSON.stringify(view.pos)}, Target: ${JSON.stringify(view.target)})...`);
    
    await page.evaluate((pos, target) => {
      if (window.app3D && window.app3D.scene.camera) {
        const cam = window.app3D.scene.camera;
        cam.position.set(pos.x, pos.y, pos.z);
        cam.lookAt(target.x, target.y, target.z);
        cam.updateMatrixWorld(true);
        console.log(`Camera moved to [${pos.x}, ${pos.y}, ${pos.z}] looking at [${target.x}, ${target.y}, ${target.z}]`);
      }
    }, view.pos, view.target);

    // Wait 500ms for browser to render
    await new Promise(r => setTimeout(r, 500));

    const screenshotFilename = `validation_${view.name}.png`;
    const screenshotPath = path.join(__dirname, screenshotFilename);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    const destPath = path.join(artifactDir, screenshotFilename);
    try {
      fs.copyFileSync(screenshotPath, destPath);
      console.log(`Copied screenshot to artifacts: ${destPath}`);
    } catch (e) {
      console.error(`Failed to copy ${view.name} screenshot to artifacts:`, e.message);
    }
  }

  await browser.close();
  console.log("Browser closed. View capture completed!");
})();
