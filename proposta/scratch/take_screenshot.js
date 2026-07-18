const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.stack));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  console.log("Waiting 5 seconds for WebGL to render...");
  await new Promise(r => setTimeout(r, 5000));

  await page.screenshot({ path: 'scratch/latest_screenshot.png' });
  console.log("Saved scratch/latest_screenshot.png");
  
  await browser.close();
})();
