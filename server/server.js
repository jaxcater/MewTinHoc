import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { botpressMiddleware } from './botpressMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const PORT = Number(process.env.PORT) || 3001;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function safeDistPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }

  const relativePath = pathname.replace(/^[/\\]+/, '');
  const candidate = path.resolve(distDir, relativePath || 'index.html');
  const distPrefix = `${distDir}${path.sep}`;
  if (candidate !== distDir && !candidate.startsWith(distPrefix)) return null;
  return candidate;
}

const server = http.createServer(async (req, res) => {
  if (req.url?.startsWith('/api/botpress')) {
    const originalUrl = req.url;
    req.url = originalUrl.replace(/^\/api\/botpress/, '') || '/';
    return botpressMiddleware(req, res, () => {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });
  }

  const requestedPath = safeDistPath(req.url || '/');
  if (!requestedPath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  let filePath = requestedPath;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(distDir, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://cdn.botpress.cloud; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Static build chưa sẵn sàng' }));
});

server.listen(PORT, () => {
  console.log(`Botpress backend server listening on port ${PORT}`);
});
