const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // We load a blank page and draw the image to a canvas to read pixels
    const imgPath = 'file:///' + path.join(__dirname, 'clean_perspective.png').replace(/\\/g, '/');
    console.log('Loading image:', imgPath);

    await page.goto('about:blank');
    
    const colors = await page.evaluate(async (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Sample at X = width / 2 (center) at different Y values
                const x = Math.floor(img.width / 2);
                const samples = {};
                
                // Sample at different vertical positions
                // Y=850 (near bottom of 900px viewport)
                // Y=750 (lower water)
                // Y=650 (mid water)
                // Y=570 (near mountain base)
                // Y=550 (near horizon)
                // Y=400 (sky)
                // Y=100 (zenith sky)
                const yTargets = [100, 400, 550, 570, 650, 750, 850];
                yTargets.forEach(y => {
                    const pixel = ctx.getImageData(x, y, 1, 1).data;
                    samples[y] = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]}) / hex: #${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
                });
                resolve(samples);
            };
            img.src = url;
        });
    }, imgPath);

    console.log('Sampled colors at X = 700 (center of 1400x900 viewport):');
    console.log(JSON.stringify(colors, null, 2));

    await browser.close();
})();
