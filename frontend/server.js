import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '0.0.0.0';
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // Transparent reverse proxy for /api/v1/* -> Laravel Backend
  if (urlPath.startsWith('/api/')) {
    const targetUrl = new URL(req.url, BACKEND_INTERNAL_URL);
    const proxyReq = http.request(
      targetUrl,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: targetUrl.host
        }
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Backend unreachable', details: err.message }));
    });
    req.pipe(proxyReq, { end: true });
    return;
  }

  const ext = path.extname(urlPath).toLowerCase();
  const isSpaRoute =
    urlPath === '/' ||
    urlPath === '/workbench' ||
    urlPath.startsWith('/workbench/') ||
    urlPath === '/workspace' ||
    urlPath.startsWith('/workspace/') ||
    urlPath === '/studio' ||
    urlPath.startsWith('/studio/') ||
    urlPath === '/showcase' ||
    !ext;
  const relPath = isSpaRoute ? '/index.html' : urlPath;
  const filePath = path.join(__dirname, path.normalize(relPath));

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const resolvedExt = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[resolvedExt] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 CircuitLab 3D Workbench running at: http://localhost:${PORT} (Proxy -> ${BACKEND_INTERNAL_URL})\n`);
});
