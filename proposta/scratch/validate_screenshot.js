const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('PAGE LOG') || msg.text().includes('THREE')) {
      console.log('PAGE LOG:', msg.text());
    }
  });

  page.on('response', response => {
    const url = response.url();
    if (url.includes('morro.jpg') || url.includes('morro_meta.json') || url.includes('morro_triangles.bin')) {
      console.log(`NETWORK: ${response.status()} ${url}`);
    }
  });

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Wait for WebGL to render
  console.log('Waiting for initial render...');
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: 'scratch/screenshot_initial.png' });
  console.log('Saved scratch/screenshot_initial.png');

  // Scroll down to test if displacement explodes the mesh
  console.log('Scrolling down...');
  await page.mouse.wheel({ deltaY: 2000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'scratch/screenshot_scrolled.png' });
  console.log('Saved scratch/screenshot_scrolled.png');

  // Zoom in to see the texture
  console.log('Zooming in...');
  await page.evaluate(() => {
    if (window.Si && window.Si.scene && window.Si.scene.camera) {
       // Move camera closer to the mountain center
       window.Si.scene.camera.position.set(0, 0, 5); 
       window.Si.scene.camera.lookAt(0, 0, 0);
       window.Si.scene.camera.updateProjectionMatrix();
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'scratch/screenshot_zoomed.png' });
  console.log('Saved scratch/screenshot_zoomed.png');

  await browser.close();
  console.log('Done.');
})();
