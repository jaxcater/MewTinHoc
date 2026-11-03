---
kind: logging_system
name: Logging System — Bare console.log/warn/error with no framework
category: logging_system
scope:
    - '**'
source_files:
    - server/server.js
    - server/botpressService.js
    - server/botpressMiddleware.js
---

## What system/approach is used

The repository has **no logging framework, logger abstraction, or structured-logging library**. All server-side output goes through Node's built-in `console` methods (`console.log`, `console.warn`, `console.error`). The React frontend does not import any logger either; there are no references to Winston, Pino, Bunyan, debug, pino-http, or similar packages in the codebase.

## Key files and packages

- `server/server.js` — startup message via `console.log`.
- `server/botpressService.js` — operational warnings via `console.warn` for file reads, user creation, conversation creation, and Chat API failures.
- `server/botpressMiddleware.js` — error logging via `console.error` for unhandled middleware exceptions (only when status ≥ 500).
- `scripts/exportRoadmaps.cjs` / `scripts/buildFaviconIco.cjs` — CLI progress messages via `console.log`/`console.error`.
- `.agents/skills/security-audit/*.cjs` — audit tooling uses `console.log`/`console.error` for validation results.

No package.json dependency on a logging library; the only external runtime dependencies are `@botpress/client` and Vite-related dev tools.

## Architecture and conventions

- **Ad-hoc string prefixes**: every log line is tagged with a human-readable bracketed prefix so the caller can be identified at a glance:
  - `[Botpress Backend]` — env-file read failures in `botpressService.js`.
  - `[Botpress getOrCreateUser Warning]`, `[Botpress createConversation Warning]`, `[Botpress Chat API Warning]` — non-fatal Botpress API errors in `botpressService.js`.
  - `[Botpress Middleware Error]` — caught exceptions in `botpressMiddleware.js`.
- **Level selection**:
  - `console.log` is used for startup/lifecycle messages (e.g. server listening) and script progress.
  - `console.warn` is used for expected, recoverable failures (missing env file, upstream API call failure) that still allow the request to proceed via fallback logic.
  - `console.error` is reserved for unexpected/unhandled errors (caught in the middleware try/catch block, gated by `statusCode >= 500`).
- **No log levels, no sinks, no rotation**: output always goes to stdout/stderr of the Node process. There is no configuration for log level filtering, file sinks, JSON formatting, correlation IDs, or sampling.
- **No client-side logging**: the React app under `src/` contains no `console.*` calls and no logger initialization; all runtime diagnostics are expected to come from the browser DevTools console directly.

## Conventions and constraints

Observed patterns (descriptive):
- Every server-side log message starts with a bracketed module/tag prefix followed by a colon and the message, e.g. `[Botpress Chat API Warning]: <err.message>`.
- Sensitive values are never logged raw: `getBotpressConfig()` returns masked variants (`maskedToken`, `maskedBotId`, etc.) instead of the secrets themselves, and the `/status` endpoint exposes only these masked fields.
- In `botpressMiddleware.js`, only errors with HTTP status ≥ 500 are emitted to stderr; lower-status errors are returned as JSON responses without being printed.
- Non-fatal upstream failures in `botpressService.js` are logged via `console.warn` and then handled gracefully (fallback reply or default UUID), rather than thrown.

There are no enforced rules beyond what the code itself does: no lint rule enforces the prefix format, no schema validates log entries, and no central logger exists to which modules must route their logs. Adding a new log site requires calling `console.log`/`warn`/`error` directly.