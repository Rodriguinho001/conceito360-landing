const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
      if (msg.text().startsWith("TEST_RES:")) {
          console.log(msg.text());
      }
  });

  await page.goto('http://localhost:3000');
  
  // Wait a bit for Three.js to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await page.evaluate(() => {
      try {
          if (window.THREE) {
              console.log("TEST_RES: window.THREE exists!");
              console.log("TEST_RES: MeshPhysicalMaterial exists: " + !!window.THREE.MeshPhysicalMaterial);
          } else {
              console.log("TEST_RES: window.THREE does NOT exist.");
              
              // Let's search global variables for something that looks like Three.js
              let threeFound = false;
              for (let key in window) {
                  let val = window[key];
                  if (val && typeof val === 'object' && val.Mesh && val.Scene && val.WebGLRenderer) {
                      console.log("TEST_RES: Found THREE on window." + key);
                      threeFound = true;
                      break;
                  }
              }
              if (!threeFound) console.log("TEST_RES: THREE not found in global scope.");
          }
      } catch (e) {
          console.log("TEST_RES: Error " + e.message);
      }
  });

  await browser.close();
})();
