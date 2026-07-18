const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching browser for custom composition captures...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  console.log("Waiting 5 seconds for WebGL scene to load...");
  await new Promise(r => setTimeout(r, 5000));

  const artifactDir = 'C:\\Users\\rodri\\.gemini\\antigravity\\brain\\6ff692e1-cadc-4d40-85d6-b39fbab6a5cc';

  // 1. Capture A: Large dark mass (mountain1 to mountain5) INVISIBLE
  console.log("Generating Capture A: Background mountains INVISIBLE...");
  await page.evaluate(() => {
    if (window.app3D) {
      window.app3D.scene.children.forEach(child => {
        if (child.name.startsWith('mountain')) {
          // Permanently lock visibility to false using Object.defineProperty
          Object.defineProperty(child, 'visible', {
            get: () => false,
            set: () => {},
            configurable: true
          });
        }
      });
      console.log("Background mountains locked to INVISIBLE.");
    }
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, 'capture_no_mountains.png') });
  fs.copyFileSync(path.join(__dirname, 'capture_no_mountains.png'), path.join(artifactDir, 'capture_no_mountains.png'));
  console.log("Saved capture_no_mountains.png");


  // Reload page to reset state for Capture B
  console.log("Reloading for Capture B...");
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));

  // 2. Capture B: Show ONLY Morro da Urca ('igloo') and 'water'
  console.log("Generating Capture B: ONLY Morro da Urca and Water...");
  await page.evaluate(() => {
    if (window.app3D) {
      window.app3D.scene.children.forEach(child => {
        if (child.name !== 'igloo' && child.name !== 'water' && !child.isCamera) {
          Object.defineProperty(child, 'visible', {
            get: () => false,
            set: () => {},
            configurable: true
          });
        } else if (child.name === 'igloo' || child.name === 'water') {
          Object.defineProperty(child, 'visible', {
            get: () => true,
            set: () => {},
            configurable: true
          });
        }
      });
      console.log("Only Morro and Water locked to VISIBLE.");
    }
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, 'capture_only_morro_water.png') });
  fs.copyFileSync(path.join(__dirname, 'capture_only_morro_water.png'), path.join(artifactDir, 'capture_only_morro_water.png'));
  console.log("Saved capture_only_morro_water.png");


  // Reload page to reset state for Capture C
  console.log("Reloading for Capture C...");
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));

  // 3. Capture C: Show ONLY background environment (sky, smoke, particles, and mountains), hide Morro and water
  console.log("Generating Capture C: ONLY background environment meshes...");
  await page.evaluate(() => {
    if (window.app3D) {
      window.app3D.scene.children.forEach(child => {
        if (child.name === 'igloo' || child.name === 'water') {
          Object.defineProperty(child, 'visible', {
            get: () => false,
            set: () => {},
            configurable: true
          });
        } else if (!child.isCamera) {
          // Keep all background environment visible
          Object.defineProperty(child, 'visible', {
            get: () => true,
            set: () => {},
            configurable: true
          });
        }
      });
      console.log("Only background meshes locked to VISIBLE.");
    }
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, 'capture_only_background.png') });
  fs.copyFileSync(path.join(__dirname, 'capture_only_background.png'), path.join(artifactDir, 'capture_only_background.png'));
  console.log("Saved capture_only_background.png");

  await browser.close();
  console.log("Custom captures generation completed successfully!");
})();
