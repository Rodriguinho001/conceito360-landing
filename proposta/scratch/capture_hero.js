const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\rodri\\.gemini\\antigravity-ide\\brain\\149210da-6390-4eb1-ad55-25bb79f5fc17';

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    page.on('console', m => console.log(`[PAGE] ${m.text()}`));
    page.on('pageerror', e => console.error(`[ERR] ${e.message}`));

    // Force cache bust to guarantee latest clean_main.js is loaded
    const cacheBust = Date.now();
    const url = `http://localhost:3000/?cb=${cacheBust}`;
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('Waiting for meshReady...');
    await page.waitForFunction('window.meshReady === true', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000)); // wait for full render

    const outPath = path.join(__dirname, 'live_hero.png');
    await page.screenshot({ path: outPath });

    // Copy to artifacts dir for embedding
    const artifactPath = path.join(ARTIFACT_DIR, 'live_hero.png');
    fs.copyFileSync(outPath, artifactPath);

    console.log(`DONE — screenshot saved to: ${outPath}`);
    console.log(`DONE — artifact copy at: ${artifactPath}`);

    await browser.close();
})();
