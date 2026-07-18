const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE] ${msg.text()}`);
  });

  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000');
  
  console.log("Waiting 5 seconds for scene to load...");
  await new Promise(r => setTimeout(r, 5000));
  
  await page.evaluate(() => {
    console.log("--- RUNTIME SCENE INSPECTION ---");
    if (!window.app3D) {
      console.error("window.app3D is NOT defined!");
      return;
    }
    console.log("window.app3D is defined.");
    
    // Check original env objects
    console.log("this.bg:", window.app3D.bg ? "DEFINED" : "UNDEFINED");
    if (window.app3D.bg) {
      console.log("this.bg.mesh:", window.app3D.bg.mesh ? "DEFINED" : "UNDEFINED");
      if (window.app3D.bg.mesh) {
        console.log("this.bg.mesh.visible:", window.app3D.bg.mesh.visible);
      }
    }
    
    // Check the water mesh
    const water = window.app3D.scene.getObjectByName('water');
    if (water) {
      console.log("--- WATER MESH REPORT ---");
      console.log("water.visible:", water.visible);
      console.log("water.position:", JSON.stringify(water.position));
      console.log("water.scale:", JSON.stringify(water.scale));
      console.log("water.renderOrder:", water.renderOrder);
      if (water.material) {
        console.log("water.material.type:", water.material.type);
        console.log("water.material.transparent:", water.material.transparent);
        console.log("water.material.depthWrite:", water.material.depthWrite);
        console.log("water.material.depthTest:", water.material.depthTest);
        console.log("water.material.uniforms.uTime:", water.material.uniforms && water.material.uniforms.uTime ? water.material.uniforms.uTime.value : "undefined");
      }
      console.log("-------------------------");
    } else {
      console.log("Water mesh NOT found by name 'water'!");
    }
    
    // List all children names in the scene
    console.log("Listing scene children:");
    window.app3D.scene.children.forEach((child, index) => {
      console.log(`  [${index}] name: "${child.name}", type: "${child.type}", visible: ${child.visible}`);
    });
    console.log("--------------------------------");
  });

  await browser.close();
})();
