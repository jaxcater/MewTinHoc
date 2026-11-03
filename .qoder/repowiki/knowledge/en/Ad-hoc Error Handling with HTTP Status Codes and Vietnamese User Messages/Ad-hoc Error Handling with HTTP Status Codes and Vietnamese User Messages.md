---
kind: error_handling
name: Ad-hoc Error Handling with HTTP Status Codes and Vietnamese User Messages
category: error_handling
scope:
    - '**'
source_files:
    - server/botpressMiddleware.js
    - server/botpressService.js
    - server/server.js
    - src/components/BotpressChatBubble.jsx
    - src/components/ExamRepoTab.jsx
    - src/components/LoginPage.jsx
    - src/components/AdminPage.jsx
    - src/components/PdfDocumentViewer.jsx
---

## Overview

The MewTinHoc monorepo has no centralized error-handling framework, custom error classes, or sentinel-error library. Errors are handled ad-hoc: the Node.js server uses try/catch blocks around request handlers and returns JSON bodies with an `error` field; the React frontend catches fetch failures and logs them via `console.warn`, often falling back to user-friendly Vietnamese messages. There is no global error boundary, no panic/recover equivalent, and no shared error-code enumeration.

## Server-side (Node.js)

### Central middleware wrapper
`server/botpressMiddleware.js` defines a single `botpressMiddleware(req, res, next)` that wraps all `/api/botpress/*` routes in one try/catch:

```js
try {
  // route dispatch ...
} catch (err) {
  const statusCode = Number(err?.statusCode) || 500;
  if (statusCode >= 500) console.error('[Botpress Middleware Error]:', err);
  return sendJson(res, statusCode, {
    error: statusCode >= 500 ? 'Lỗi máy chủ nội bộ khi xử lý Botpress API' : err.message
  });
}
```

This is the only place where a thrown error is converted into an HTTP response. The convention is:
- Attach a numeric `statusCode` property onto the thrown `Error` object to signal client-facing status codes (400, 403, 405, 413).
- Internal/server errors (≥ 500) are logged to stderr but the message sent to the client is a generic Vietnamese string (`"Lỗi máy chủ nội bộ khi xử lý Botpress API"`).
- Non-5xx errors propagate their original `err.message` to the client.

### Input validation errors
`parseJsonBody` rejects with `Object.assign(new Error('Payload quá lớn'), { statusCode: 413 })` and `Object.assign(new Error('JSON không hợp lệ'), { statusCode: 400 })`. These are the canonical examples of how client input errors are signaled — by attaching `statusCode` to a plain `Error`.

### Route-level responses
Other endpoints inside the middleware return structured JSON directly rather than throwing:
- 405 `Method Not Allowed` for wrong HTTP methods on `/files`, `/chat`, `/reset`.
- 403 `{ error: 'Origin không được phép' }` when CORS origin is not whitelisted.
- 404 `{ error: 'Botpress endpoint not found' }` for unknown paths.
- A helper `sendJson(res, statusCode, data)` centralizes `Content-Type: application/json; charset=utf-8` and `Cache-Control: no-store` headers.

### Service-layer fallbacks
`server/botpressService.js` does **not** throw for external failures. Instead, functions like `listBotpressFiles()` return a shape `{ status: 'success'|'error'|'demo', message?, files? }`. Failures from `fetch` calls are caught locally and turned into `{ status: 'error', message: ... }`, which the middleware then maps to HTTP 500. This makes service-layer failures non-fatal to the request pipeline.

### Top-level server
`server/server.js` handles static-file serving with its own minimal error path:
- Invalid URL → 400 `'Bad request'`.
- Missing dist build → 503 `{ error: 'Static build chưa sẵn sàng' }`.
- Unknown botpress path → delegates to middleware, which may call `next()` returning 404 `{ error: 'Endpoint not found' }`.

## Client-side (React / Vite SPA)

### Component-level try/catch
Frontend components use per-call try/catch blocks around `fetchBackend` calls:
- `BotpressChatBubble.jsx`: checks `res.ok`, parses JSON, sets UI state, and on failure logs `console.warn('[Assistant Chat Error]:', err.message)` then inserts a friendly fallback message into the chat.
- `ExamRepoTab.jsx`, `LoginPage.jsx`, `AdminPage.jsx`, `PdfDocumentViewer.jsx`: similar patterns — catch network/parse errors, log via `console.warn`, and either set local error state or silently ignore (e.g., reset-chat calls use empty `catch {}` blocks).

### Supabase integration
`src/supabase.js` and `lib/supabase.js` wrap Supabase calls; errors surface as rejected promises caught at the component level. No custom error type is used.

### Ignored errors
Some catches deliberately swallow errors:
- `App.jsx` line 52: `catch (e) { /* ignore */ }`.
- Reset/close handlers in `BotpressChatBubble.jsx`: `catch { /* ignore */ }` — these are fire-and-forget cleanup calls.

## Conventions observed

1. **Server errors carry a `statusCode` property.** Thrown `Error` objects are augmented with `err.statusCode` so the middleware can distinguish client errors (4xx) from server errors (5xx). This is enforced by the middleware's `Number(err?.statusCode) || 500` coercion.
2. **Client-facing error messages are in Vietnamese.** All user-visible strings (`"Payload quá lớn"`, `"JSON không hợp lệ"`, `"Tin nhắn không được để trống"`, `"Lỗi máy chủ nội bộ khi xử lý Botpress API"`) are localized; English is reserved for internal logging.
3. **Service functions return result objects, not throw.** `listBotpressFiles()`, `processChatMessage()`, etc. return `{ status, message, ... }` shapes so callers can decide whether to treat a failure as fatal or fall back to a local implementation.
4. **Network failures on the frontend are degraded gracefully.** Components never crash the SPA on a failed fetch; they log via `console.warn` and show a user-friendly fallback message.
5. **No global error boundary or unhandled-rejection handler exists.** There is no `window.onerror`, `window.onunhandledrejection`, or React ErrorBoundary wrapping the app tree in the inspected files.
6. **HTTP status codes are hand-coded per route.** There is no status-code constant file; values like 400, 403, 404, 405, 413, 500, 503 appear inline.
7. **CORS and method validation fail fast with JSON.** Every botpress endpoint validates the method and origin before reaching business logic, returning early with a JSON body.

## Key files

- `server/server.js` — top-level HTTP server, static-file fallbacks, 400/503 error paths.
- `server/botpressMiddleware.js` — single try/catch wrapper, `statusCode`-augmented errors, input validation, CORS/method guards.
- `server/botpressService.js` — service layer returning `{ status, message }` result objects instead of throwing.
- `src/components/BotpressChatBubble.jsx` — primary frontend consumer of botpress APIs, demonstrates graceful degradation and Vietnamese fallback messages.
- `src/components/ExamRepoTab.jsx`, `src/components/LoginPage.jsx`, `src/components/AdminPage.jsx`, `src/components/PdfDocumentViewer.jsx` — additional component-level error handling examples.