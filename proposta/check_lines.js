const fs = require('fs');
const code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');
const lines = code.split('\n');
console.log('Total lines:', lines.length);
if (lines.length > 4426) {
    console.log('Line 4427 length:', lines[4426].length);
    console.log('Offset 3080-3130:', lines[4426].substring(3080, 3130));
} else {
    // If there aren't enough lines, it means the browser sourcemap mapped it back to the original source.
    console.log('Not enough lines. The browser is using a sourcemap.');
}
