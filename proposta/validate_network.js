const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const requestCounts = {};
  const responseSizes = {};

  page.on('request', request => {
    const url = request.url();
    if (url.includes('localhost')) {
      const filename = url.split('/').pop().split('?')[0];
      requestCounts[filename] = (requestCounts[filename] || 0) + 1;
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('localhost')) {
      const filename = url.split('/').pop().split('?')[0];
      try {
        const buffer = await response.buffer();
        responseSizes[filename] = buffer.length;
      } catch (e) {
        // ignore errors
      }
    }
  });

  console.log("Navigating to http://localhost:3000 ...");
  const startTime = Date.now();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const loadTime = Date.now() - startTime;
  
  console.log("\n### WATERFALL / NETWORK VALIDATION ###");
  console.log(`Page Load Time (networkidle0): ${loadTime} ms`);
  
  console.log("\n### REQUEST COUNTS (Check for Double-Fetch) ###");
  for (const [file, count] of Object.entries(requestCounts)) {
    if (file.endsWith('.bin') || file.endsWith('.webp') || file.endsWith('.png')) {
       console.log(`- ${file}: ${count} request(s)`);
    }
  }

  console.log("\n### TOP ASSET SIZES ###");
  const sortedSizes = Object.entries(responseSizes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  for (const [file, size] of sortedSizes) {
    console.log(`- ${file}: ${(size / (1024 * 1024)).toFixed(2)} MB`);
  }

  console.log("\nCapturing visual validation screenshot...");
  await page.screenshot({ path: 'validation_screenshot.png' });
  console.log("Saved validation_screenshot.png");
  
  await browser.close();
})();
