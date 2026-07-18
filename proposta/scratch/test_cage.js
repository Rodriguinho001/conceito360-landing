const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
      if (msg.text().startsWith("TEST_CAGE:")) {
          console.log(msg.text());
      }
  });

  await page.goto('http://localhost:3000');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await page.evaluate(() => {
      try {
          if (window.iglooScene) {
              window.iglooScene.children.forEach(child => {
                  if (child.name === "igloo_cage") {
                      console.log("TEST_CAGE: FOUND igloo_cage!");
                      console.log("TEST_CAGE: Material type: " + (child.material ? child.material.type : "null"));
                      if (child.material && child.material.uniforms) {
                          console.log("TEST_CAGE: Has uniforms: " + Object.keys(child.material.uniforms).join(", "));
                      }
                      console.log("TEST_CAGE: Geometry type: " + (child.geometry ? child.geometry.type : "null"));
                  }
                  if (child.name === "projects") {
                      console.log("TEST_CAGE: FOUND projects!");
                  }
              });
          } else {
              console.log("TEST_CAGE: iglooScene NOT FOUND");
          }
      } catch (e) {
          console.log("TEST_CAGE: Error " + e.message);
      }
  });

  await browser.close();
})();
