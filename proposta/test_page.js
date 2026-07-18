const http = require('http');

function fetchUrl(url, checkFn) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`\n--- FETCHED ${url} ---`);
        console.log('Status code:', res.statusCode);
        console.log('Cache-Control:', res.headers['cache-control']);
        checkFn(data);
        resolve();
      });
    }).on('error', (err) => {
      console.error('Fetch error:', err.message);
      resolve();
    });
  });
}

(async () => {
  await fetchUrl('http://localhost:3000/', (data) => {
    const hasV2 = data.includes('src="js/index-2eb69c09.js?v=2"');
    console.log('Contains v2 script tag:', hasV2);
  });
  
  await fetchUrl('http://localhost:3000/js/index-2eb69c09.js?v=' + Date.now(), (data) => {
    const hasDynamicImport = data.includes('import("./App3D-f554a111.js?v=" + Date.now())');
    console.log('Contains dynamic import timestamp:', hasDynamicImport);
  });
})();
