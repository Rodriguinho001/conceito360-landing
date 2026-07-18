const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\rodri\\.gemini\\antigravity-ide\\brain\\149210da-6390-4eb1-ad55-25bb79f5fc17';
const BASE_URL = 'http://localhost:3000/clean_hero.html';

async function captureVariant(page, variant, filename) {
    await page.goto(`${BASE_URL}#${variant}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 8000)); // wait for terrain + water render

    // Check for errors
    const logs = [];
    page.on('console', m => logs.push(m.text()));

    const p = path.join(__dirname, filename);
    await page.screenshot({ path: p });
    try { fs.copyFileSync(p, path.join(ARTIFACT_DIR, filename)); } catch(e) {}
    console.log(`Shot saved: ${filename}`);
    return p;
}

(async () => {
    console.log('Launching...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    page.on('console', m => console.log(`[PAGE] ${m.text()}`));
    page.on('pageerror', e => console.error(`[ERR] ${e.message}`));

    // Variant A — aerial oblique
    await captureVariant(page, 'a', 'var_a_aerial.png');

    // Variant B — maritime cinematic
    await captureVariant(page, 'b', 'var_b_maritime.png');

    // Variant C — editorial 3/4
    await captureVariant(page, 'c', 'var_c_editorial.png');

    // Extra: B variant close-up of waterline
    await page.goto(`${BASE_URL}#b`, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 8000));
    await page.addScriptTag({ content: `
        if (window.appCamera) {
            const alt = window.worldAltitude || 2.0;
            window.appCamera.position.set(-1.5, alt * 0.08, 4.5);
            window.appControls.target.set(0, alt * 0.25, 0);
            window.appControls.update();
        }
    `});
    await new Promise(r => setTimeout(r, 1000));
    const pw = path.join(__dirname, 'var_b_waterline.png');
    await page.screenshot({ path: pw });
    try { fs.copyFileSync(pw, path.join(ARTIFACT_DIR, 'var_b_waterline.png')); } catch(e) {}
    console.log('Shot saved: var_b_waterline.png');

    await browser.close();
    console.log('All captures done.');
})();
