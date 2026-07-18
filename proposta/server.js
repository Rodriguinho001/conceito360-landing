/**
 * IGLOO CLONE — LOCAL PROXY SERVER v3
 * + Cross-Origin Isolation headers (COOP/COEP) for SharedArrayBuffer/WASM workers
 * + Full status code logging
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const IGLOO_ORIGIN = 'www.igloo.inc';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
  '.json':  'application/json; charset=utf-8',
  '.ktx2':  'application/octet-stream',
  '.drc':   'application/octet-stream',
  '.exr':   'image/x-exr',
  '.ogg':   'audio/ogg',
};

// Cross-Origin headers
// Note: COEP require-corp removed — it was blocking 3 resources per Chrome Issues tab
const COOP_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

function proxyToIgloo(req, res, urlPath) {
  const options = {
    hostname: IGLOO_ORIGIN,
    port: 443,
    path: urlPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.igloo.inc/',
      'Origin': 'https://www.igloo.inc',
      'Accept': '*/*',
      'Accept-Encoding': 'identity', // no compression so we don't have to decompress
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const status = proxyRes.statusCode;
    if (status !== 200) {
      console.error(`[PROXY ERROR] ${status} ${urlPath}`);
    } else {
      console.log(`[PROXY OK]  ${status} ${urlPath}`);
    }

    const headers = {
      ...proxyRes.headers,
      // CORS + Cross-Origin Isolation
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'cross-origin-resource-policy': 'cross-origin',
      'cache-control': 'public, max-age=86400',
    };

    // Remove content-encoding — we requested identity, igloo may still say gzip
    delete headers['content-encoding'];
    // Remove transfer-encoding that can conflict
    delete headers['transfer-encoding'];

    res.writeHead(status, headers);
    proxyRes.pipe(res);

    if (status === 200) {
      const localFilePath = path.join(__dirname, urlPath.replace(/^\//, ''));
      fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
      const fileStream = fs.createWriteStream(localFilePath);
      proxyRes.pipe(fileStream);
      fileStream.on('error', (err) => {
        console.error(`[CACHE WARN] Failed to write file ${localFilePath}:`, err.message);
      });
      fileStream.on('finish', () => {
        console.log(`[CACHE SAVE] Saved ${urlPath} to local disk`);
      });
    }
  });

  proxyReq.on('error', (e) => {
    console.error(`[PROXY FAIL] ${urlPath}: ${e.message}`);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Proxy error: ' + e.message);
    }
  });

  proxyReq.setTimeout(60000, () => {
    console.error(`[PROXY TIMEOUT] ${urlPath}`);
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504);
      res.end('Proxy timeout');
    }
  });

  proxyReq.end();
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...COOP_HEADERS,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    });
    res.end();
    return;
  }

  // Base CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // --- Serve local index.html (with COOP/COEP for SharedArrayBuffer) ---
  if (url === '/' || url === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      ...COOP_HEADERS,
    });
    res.end(html);
    return;
  }

  // --- Serve local JS files (with COOP/COEP so workers can use SharedArrayBuffer) ---
  if (url.startsWith('/js/')) {
    let localPath = path.join(__dirname, url);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      console.log(`[LOCAL]     ${url}`);
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        ...COOP_HEADERS,
      });
      fs.createReadStream(localPath).pipe(res);
      return;
    }
  }

  // --- Serve other local files (images, etc.) ---
  let localPath = path.join(__dirname, url);
  if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
    const ext = path.extname(localPath);
    const mime = MIME[ext] || 'application/octet-stream';
    console.log(`[LOCAL]     ${url}`);
    res.writeHead(200, {
      'Content-Type': mime,
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    fs.createReadStream(localPath).pipe(res);
    return;
  }

  // --- Proxy /assets/ and everything else to igloo.inc ---
  if (url.startsWith('/assets/')) {
    proxyToIgloo(req, res, url);
    return;
  }

  // --- API Obra: GET list ---
  if (url === '/api/obra' && req.method === 'GET') {
    const statePath = path.join(__dirname, 'obra_state.json');
    if (fs.existsSync(statePath)) {
      const state = fs.readFileSync(statePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(state);
    } else {
      const defaultState = {
        "projectName": "Projeto Fred & Nath",
        "rooms": {
          "quarto-gigi": {
            "name": "Quarto GiGi",
            "tasks": [
              { "id": "1", "description": "Luminária pendente não está funcionando", "photoName": "foto_quarto_gigi_01.png", "category": "Iluminação", "status": "Pendente", "hasPhoto": true },
              { "id": "2", "description": "Trocar lampadas 5", "photoName": "foto_quarto_gigi_02.png", "category": "Iluminação", "status": "Pendente", "hasPhoto": true },
              { "id": "3", "description": "Pintar Paredes", "photoName": "foto_quarto_gigi_03.png", "category": "Pintura", "status": "Pendente", "hasPhoto": true },
              { "id": "4", "description": "Pintas teto", "photoName": "foto_quarto_gigi_04.png", "category": "Pintura", "status": "Pendente", "hasPhoto": true },
              { "id": "5", "description": "Colar roda pé", "photoName": "foto_quarto_gigi_05.jpeg", "category": "Acabamento", "status": "Pendente", "hasPhoto": true },
              { "id": "6", "description": "Ajeitar piso", "photoName": "foto_quarto_gigi_06.png", "category": "Piso", "status": "Pendente", "hasPhoto": true },
              { "id": "7", "description": "Pintar Porta entrada e caixonetes (Vista Externa)", "photoName": "foto_quarto_gigi_07.png", "category": "Pintura", "status": "Pendente", "hasPhoto": true },
              { "id": "8", "description": "Pintar Porta entrada e caixonetes (Vista Interna)", "photoName": "foto_quarto_gigi_08.png", "category": "Pintura", "status": "Pendente", "hasPhoto": true },
              { "id": "9", "description": "Trocar chuveiro", "photoName": "foto_quarto_gigi_09.png", "category": "Hidráulica", "status": "Pendente", "hasPhoto": true },
              { "id": "10", "description": "Trocar registro e acabamento", "photoName": "foto_quarto_gigi_10.png", "category": "Hidráulica", "status": "Pendente", "hasPhoto": true },
              { "id": "12", "description": "Troca do rejunte", "photoName": "foto_quarto_gigi_12.png", "category": "Hidráulica", "status": "Pendente", "hasPhoto": true },
              { "id": "13", "description": "Limpeza do Split", "photoName": "foto_quarto_gigi_13.png", "category": "Climatização", "status": "Pendente", "hasPhoto": true }
            ]
          }
        }
      };
      fs.writeFileSync(statePath, JSON.stringify(defaultState, null, 2), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(defaultState));
    }
    return;
  }

  // --- API Obra: POST save ---
  if (url === '/api/obra' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const statePath = path.join(__dirname, 'obra_state.json');
        fs.writeFileSync(statePath, body, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API Obra: POST upload image ---
  if (url === '/api/obra/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { roomId, photoName, image } = data; // image is base64 string
        if (!roomId || !photoName || !image) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing roomId, photoName or image data' }));
          return;
        }

        // Sanitize inputs to prevent directory traversal
        const safeRoomId = roomId.replace(/[^a-zA-Z0-9-_]/g, '');
        const safePhotoName = photoName.replace(/[^a-zA-Z0-9-_.]/g, '');

        // Remove base64 data URL header if present (e.g. data:image/png;base64,)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        const uploadDir = path.join(__dirname, 'images', safeRoomId);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const targetPath = path.join(uploadDir, safePhotoName);
        fs.writeFileSync(targetPath, buffer);
        console.log(`[UPLOAD SAVE] Saved uploaded file to ${targetPath}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, photoPath: `/images/${safeRoomId}/${safePhotoName}` }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API Obra: POST delete file ---
  if (url === '/api/obra/delete-file' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { roomId, photoName } = data;
        if (!roomId || !photoName) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing roomId or photoName' }));
          return;
        }

        // Sanitize to prevent traversal
        const safeRoomId = roomId.replace(/[^a-zA-Z0-9-_]/g, '');
        const safePhotoName = photoName.replace(/[^a-zA-Z0-9-_.]/g, '');

        const filePath = path.join(__dirname, 'images', safeRoomId, safePhotoName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[DELETE FILE SUCCESS] Deleted ${filePath}`);
        } else {
          console.log(`[DELETE FILE WARN] File not found: ${filePath}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Fallback proxy
  if (url === '/log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      console.log("[CLIENT LOG]", body);
      res.writeHead(200);
      res.end();
    });
    return;
  }

  console.log(`[FALLBACK]  ${url}`);
  proxyToIgloo(req, res, url);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ IGLOO CLONE SERVER v3`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → COOP/COEP headers enabled (SharedArrayBuffer/WASM workers)`);
  console.log(`   → Accept-Encoding: identity (no compression issues)\n`);
});
