const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log("Starting browser audit...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    const logs = [];
    page.on('console', msg => {
        const txt = `[${msg.type().toUpperCase()}] ${msg.text()}`;
        console.log(txt);
        logs.push(txt);
    });
    
    page.on('pageerror', err => {
        const txt = `[PAGE ERROR] ${err.toString()}\nStack: ${err.stack}`;
        console.log(txt);
        logs.push(txt);
    });
    
    page.on('requestfailed', request => {
        const txt = `[REQUEST FAIL] ${request.url()} - ${request.failure().errorText}`;
        console.log(txt);
        logs.push(txt);
    });
    
    try {
        console.log("Navigating to http://localhost:3000...");
        await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 30000 });
        console.log("Page loaded. Waiting 10 seconds for 3D engine initialization...");
        await new Promise(r => setTimeout(r, 10000));
        
        // Take a screenshot to verify what's on screen
        await page.screenshot({ path: 'scratch/diagnostic_screen.png' });
        console.log("Screenshot saved to scratch/diagnostic_screen.png");
    } catch(err) {
        console.error("Navigation error:", err.message);
        logs.push(`[NAV ERROR] ${err.message}`);
    }
    
    fs.writeFileSync('scratch/browser_logs.txt', logs.join('\n'));
    console.log("Logs saved to scratch/browser_logs.txt");
    await browser.close();
})();
