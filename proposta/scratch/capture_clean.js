const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\rodri\\.gemini\\antigravity-ide\\brain\\149210da-6390-4eb1-ad55-25bb79f5fc17';

async function captureVariant(variant) {
    const url = `http://localhost:3000/?variant=${variant}`;
    console.log(`Launching browser for variant ${variant.toUpperCase()}...`);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    page.on('console', m => console.log(`[PAGE] ${m.text()}`));
    page.on('pageerror', e => console.error(`[ERR] ${e.message}`));

    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Waiting for meshReady...');
    await page.waitForFunction('window.meshReady === true', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500)); // wait for render

    const filename = `variant_${variant}.png`;
    const p = path.join(__dirname, filename);
    await page.screenshot({ path: p });
    try { fs.copyFileSync(p, path.join(ARTIFACT_DIR, filename)); } catch(e) {}
    console.log(`Shot saved: ${filename}`);

    // If it is Variant C (the reference-match), also save it as clean_perspective.png
    if (variant === 'c') {
        const cp = path.join(__dirname, 'clean_perspective.png');
        fs.copyFileSync(p, cp);
        try { fs.copyFileSync(cp, path.join(ARTIFACT_DIR, 'clean_perspective.png')); } catch(e) {}
        console.log('Copied variant_c to clean_perspective.png');
    }

    await browser.close();
}

(async () => {
    try {
        await captureVariant('a');
        await captureVariant('b');
        await captureVariant('c');
        console.log('All variants captured successfully.');
    } catch (e) {
        console.error('Error during capture:', e);
    }
})();
