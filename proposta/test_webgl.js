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
  
  // Take initial screenshot
  const screenshotPath = path.join(__dirname, 'initial_render.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to ${screenshotPath}`);
  
  // Copy the screenshot to the artifacts folder so the system knows about it
  const artifactDir = 'C:\\Users\\rodri\\.gemini\\antigravity\\brain\\6ff692e1-cadc-4d40-85d6-b39fbab6a5cc';
  const destPath = path.join(artifactDir, 'initial_render.png');
  try {
    fs.copyFileSync(screenshotPath, destPath);
    console.log(`Copied screenshot to artifacts: ${destPath}`);
  } catch (e) {
    console.error("Failed to copy to artifacts:", e.message);
  }

  // Let's scroll down to trigger the timeline progress
  console.log("Forcing scroll progress to 0.5...");
  await page.evaluate(() => {
    if (window._scene) {
      window._scene.progress = 0.5;
    } else {
      console.error("window._scene not found!");
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  
  const scrollScreenshotPath = path.join(__dirname, 'scrolled_render.png');
  await page.screenshot({ path: scrollScreenshotPath });
  console.log(`Saved scrolled screenshot to ${scrollScreenshotPath}`);
  
  const destScrollPath = path.join(artifactDir, 'scrolled_render.png');
  try {
    fs.copyFileSync(scrollScreenshotPath, destScrollPath);
    console.log(`Copied scrolled screenshot to artifacts: ${destScrollPath}`);
  } catch (e) {
    console.error("Failed to copy scrolled to artifacts:", e.message);
  }

  await browser.close();
  console.log("Browser closed.");
})();
