const fs = require('fs');

try {
  const code = fs.readFileSync('js/App3D-f554a111.js', 'utf8');
  console.log('File size:', code.length);
  
  // Find Jo definition
  const joIndex = code.indexOf('class Jo');
  if (joIndex !== -1) {
    console.log('Found "class Jo" at index:', joIndex);
    console.log('Snippet:', code.substring(joIndex, joIndex + 100));
  } else {
    console.log('Could NOT find "class Jo"');
  }

  // Let's test if we can parse the JavaScript!
  // We can use the native vm module to check for syntax errors.
  const vm = require('vm');
  new vm.Script(code);
  console.log('Syntax check passed!');
} catch (e) {
  console.error('Error:', e);
}
