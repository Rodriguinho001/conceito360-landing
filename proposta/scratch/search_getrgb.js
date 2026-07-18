const fs = require('fs');
const files = ['js/App3D-f554a111.js', 'js/index-2eb69c09.js'];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`${file} does not exist`);
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  let pos = 0;
  let count = 0;
  while (true) {
    const idx = content.indexOf('getRGB', pos);
    if (idx === -1) break;
    count++;
    console.log(`Found 'getRGB' in ${file} at index ${idx}:`);
    console.log(content.substring(idx - 100, idx + 200));
    console.log('------------------');
    pos = idx + 6;
  }
  console.log(`Finished ${file}: found ${count} occurrences.`);
}
