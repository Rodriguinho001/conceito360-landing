const http = require('http');

http.get('http://localhost:3000/js/App3D-f554a111.js?v=' + Date.now(), (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    
    // Check if new DE is present
    const hasNewDE = data.includes('new DE({');
    console.log('Contains new DE({:', hasNewDE);
    
    // Check if new or is present
    const hasNewOr = data.includes('new or({');
    console.log('Contains new or({:', hasNewOr);
    
    // Let's print around the patched init method
    const initIdx = data.indexOf('async init()');
    if (initIdx !== -1) {
      console.log('init() method snippet:');
      console.log(data.substring(initIdx, initIdx + 800));
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});
