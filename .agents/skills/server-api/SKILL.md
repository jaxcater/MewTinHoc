---
name: server-api
description: Sửa backend Node của MewTinHoc — middleware trong server/, endpoint /api/exams, /api/ai, /api/botpress, rate limit, security headers, env loader, health check. Dùng khi task liên quan tới "API", "backend", "middleware", "endpoint", "server", "rate limit", "security headers", "CSP", "biến môi trường", "deploy VPS".
---

# Backend Node (server/)

Skill này **bổ sung** cho `AI_CONTEXT.md` và `docs/architecture.md` — không lặp lại chúng.
Đọc `docs/architecture.md` mục **"4. API Architecture"** và **"11. Infrastructure Assumptions"** để có bối cảnh.

## Khung của một middleware

Mỗi nhóm API là một hàm `(req, res, next)`:

```js
export async function xxxMiddleware(req, res, next) {
  applySecurityHeaders(res, req);
  const url = (req.url?.split('?')[0] || '').replace(/^\/api\/xxx/, '') || '/';
  // ...routing theo url + method...
  if (typeof next === 'function') return next();
  return sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Endpoint không tồn tại' });
}
```

## Quy tắc bắt buộc

1. **API phải đứng TRƯỚC static handler** trong `server/server.js` — nếu không `POST` sẽ rơi vào SPA fallback và trả `index.html`.
2. **`applySecurityHeaders(res, req)` ở đầu mỗi middleware** — kể cả response lỗi.
3. **Response luôn có cấu trúc** `{ ok, code, message }`. `message` tiếng Việt, dành cho người dùng cuối. `code` là mã ổn định để client phân loại.
4. **Endpoint nhạy cảm trả 404 thay vì 403** khi thiếu quyền — không xác nhận sự tồn tại (xem `/api/exams/health`).
5. **Giới hạn kích thước body** (`MAX_BODY_BYTES` trong từng middleware) và **rate limit theo user/IP**.
6. **Không tin `userId` do client gửi** — dùng `server/exam/auth.js:identifyCaller` (xác minh Bearer token với Supabase, fallback IP cho khách).

## Biến môi trường

- Server đọc `.env.local` / `.evn.local` / `.env` qua `server/envLoader.js`. Dùng `readEnv(key, fallback)` / `hasEnv(key)`.
- **`loadRepoEnv()` không ghi đè biến đã có trong `process.env`** — PM2 và biến OS luôn thắng.
- **Bỏ qua giá trị placeholder** (`YOUR_...`, `<...>`, `changeme`) — xem `readEnvValue` trong `server/exam/auth.js`.
- **Secret không bao giờ dùng tiền tố `VITE_`** — Vite nhúng chúng vào bundle.
- Thêm biến mới → cập nhật **cả** `.env.example` **và** `write_env` trong `.github/workflows/deploy-vps.yml`.

## Hệ thống giả định MỘT tiến trình

Rate limit (`server/ai/aiMiddleware.js`) và bộ đếm chat (`server/chatQuota.js`) là **in-memory / file trên đĩa**. Chạy nhiều instance Node sẽ tính sai. Muốn scale ngang → phải chuyển sang kho dùng chung có cập nhật nguyên tử.

## Bảo mật đáp án (liên quan `server/exam/`)

Chi tiết ở skill `exam-pipeline`. Tóm tắt: `claim` không trả đáp án · đáp án mã hoá AES-256-GCM · khoá ở `EXAM_KEY_SECRET` hoặc `dethicosan/.key-secret` · nginx `deny all` · lỗi EACCES thì cảnh báo chứ không xoá file.

## Deploy

Đường chính: `.github/workflows/deploy-vps.yml` (git archive → rsync → npm ci → build → PM2).

Các điểm dễ vỡ — **đừng phá**:
- `rsync --delete` có `--exclude` riêng cho `node_modules`, `dist`, `.env.local`, `var`. Thiếu `var` → mỗi lần deploy xoá sạch hạn mức chat.
- `rm -rf dist` **trước** khi build — nếu không, build lỗi mà `dist/` cũ còn đó thì deploy "xanh" với bundle cũ.
- `--chown=www:www` — app chạy bằng user `www`; file root tạo sẽ không đọc được.
- Deploy kiểm tra HTTP 200 thật, không tin exit code của `pm2 restart`.

## Verification

```bash
npm run lint
node --test server/chatQuota.test.js server/chatAuth.test.js server/userActivityStorage.test.js
npm run server   # PORT 3001 — kiểm tra /api/* bằng curl
```

Hai file test trong `server/` chỉ phủ quota + auth chat + activity log. Logic đề thi verify bằng `npm run exam:check`. Phần còn lại verify thủ công bằng `curl` hoặc `npm run dev`.
