import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { botpressMiddleware } from './botpressMiddleware.js';
import { examMiddleware } from './exam/examMiddleware.js';
import { aiMiddleware } from './ai/aiMiddleware.js';
import { applySecurityHeaders } from './securityHeaders.js';
import { battleMiddleware, startBattleRuntime } from './battle/battleMiddleware.js';

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

async function dispatch(req, res) {
  applySecurityHeaders(res, req);

  // Chặn hẳn các thư mục dữ liệu nhạy cảm. dethicosan/ và sourcedethi/ nằm
  // ngay cạnh dist/ nên về lý thuyết không nằm trong docroot, nhưng chặn
  // tường minh ở đây là lớp phòng thủ thứ hai nếu cấu hình proxy đổi.
  // Trả 404 (không phải 403) để không xác nhận sự tồn tại của thư mục.
  {
    let blockedPath = '';
    try {
      blockedPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    } catch {
      blockedPath = '';
    }
    if (/^\/(?:dethicosan|sourcedethi|battle)(?:\/|$)/i.test(blockedPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
  }

  // API gen đề phải đứng TRƯỚC static handler, nếu không POST sẽ rơi
  // vào SPA fallback và trả về index.html.
  if (req.url?.startsWith('/api/battle')) return battleMiddleware(req, res);

  if (req.url?.startsWith('/api/exams')) {
    return examMiddleware(req, res, () => {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, code: 'NOT_FOUND', message: 'Endpoint không tồn tại' }));
    });
  }

  if (req.url?.startsWith('/api/ai')) {
    return aiMiddleware(req, res, () => {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, code: 'NOT_FOUND', message: 'Endpoint không tồn tại' }));
    });
  }

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
    // SPA fallback CHỈ cho route không có đuôi file.
    // Nếu URL trông như file cụ thể (.txt, .json, .dat, .js...) mà không
    // tồn tại trong dist/ thì trả 404 — không được trả index.html, vì
    // làm vậy che mất lỗi cấu hình và gây nhầm lẫn khi kiểm tra bảo mật
    // (một request tới /dethicosan/pool/x.dat sẽ ra 200 dù không tồn tại).
    const requestedExt = path.extname(requestedPath).toLowerCase();
    // File cấu hình / bí mật không bao giờ được trả index.html
    const baseName = path.basename(requestedPath).toLowerCase();
    const isDotfile = baseName.startsWith('.');
    if (requestedExt || isDotfile) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    filePath = path.join(distDir, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Static build chưa sẵn sàng' }));
}

const server = http.createServer((req, res) => {
  applySecurityHeaders(res, req);
  const work = dispatch(req, res);
  Promise.resolve(work).catch(() => {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, message: 'Server error' }));
  });
});

server.listen(PORT, process.env.HOST || '127.0.0.1', async () => {
  startBattleRuntime();
  console.log(`MewTinHoc server listening on port ${PORT}`);

  // Kiểm tra bố cục dữ liệu đề 1 lần lúc khởi động — cảnh báo sớm nếu
  // EXAM_DATA_ROOT trỏ sai, để không phải đợi học viên bấm mới phát hiện.
  try {
    const { describeLayout } = await import('./exam/config.js');
    const layout = describeLayout();
    console.log(`[exam] Nguồn câu hỏi : ${layout.sourceDir}`);
    console.log(`[exam] Kho đề        : ${layout.examRoot}`);
    layout.warnings.forEach((warning) => console.warn(`[exam] ⚠ ${warning}`));
  } catch (err) {
    console.warn(`[exam] Không kiểm tra được bố cục: ${err.message}`);
  }

  // Kiểm tra khoá mã hoá đáp án có khớp dữ liệu trên đĩa không.
  // Nếu lệch, mọi đề đều không đọc được — phải biết ngay lúc khởi động,
  // đừng đợi học viên bấm tạo đề rồi mới phát hiện.
  try {
    const { keyHealthCheck } = await import('./exam/crypto.js');
    const keyState = keyHealthCheck();
    if (keyState === 'bad-key') {
      console.error(
        '[exam] ⛔ Khoá mã hoá KHÔNG khớp với đề trong kho — tính năng tạo đề sẽ từ chối chạy. ' +
          'Kiểm tra EXAM_KEY_SECRET và dethicosan/.key-secret (không khớp thì đề cũ không đọc được).',
      );
    } else if (keyState === 'ok') {
      console.log('[exam] Khoá mã hoá: khớp dữ liệu trong kho');
    }
  } catch (err) {
    console.warn(`[exam] Không kiểm tra được khoá mã hoá: ${err.message}`);
  }

  // Kiểm tra cấu hình đánh giá AI 1 lần lúc khởi động — cảnh báo sớm thay vì
  // để học viên bấm nút rồi mới biết thiếu khoá.
  try {
    const { geminiStatus } = await import('./ai/geminiService.js');
    const status = geminiStatus();
    if (status.configured) {
      console.log(`[ai] Đánh giá AI: bật (model ${status.model})`);
      if (!status.keyLooksValid) {
        console.warn('[ai] ⚠ GEMINI_API_KEY trông không giống khoá Gemini (thường bắt đầu bằng AIza).');
      }
    } else {
      console.warn('[ai] ⚠ Chưa có GEMINI_API_KEY — nút "Đánh giá của AI" sẽ báo chưa cấu hình.');
      console.warn('[ai]   Lấy khoá tại https://aistudio.google.com/apikey rồi thêm vào .env.local.');
    }
  } catch (err) {
    console.warn(`[ai] Không kiểm tra được cấu hình AI: ${err.message}`);
  }
});
