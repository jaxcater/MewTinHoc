---
kind: configuration_system
name: Configuration System — Environment Variables, Vite Build Config, and Runtime Defaults
category: configuration_system
scope:
    - '**'
source_files:
    - package.json
    - vite.config.js
    - server/server.js
    - server/botpressMiddleware.js
    - server/securityHeaders.js
    - lib/supabase.js
    - src/supabase.js
---

## Overview

This repository does not use a dedicated configuration library (no `.env` loader, no YAML/TOML/JSON config files). Configuration is split across three layers:

1. **Vite build-time configuration** in `vite.config.js`
2. **Node runtime environment variables** read via `process.env` in `server/server.js`, `server/botpressMiddleware.js`, and `server/securityHeaders.js`
3. **Frontend client configuration** injected by Vite as `import.meta.env.*` in `lib/supabase.js`

There are no `.env`, `.env.example`, or centralized config modules.

## Key Files

- `package.json` — declares scripts (`dev`, `build`, `server`, `export:roadmap`) and dependency versions; no config fields beyond standard npm metadata.
- `vite.config.js` — Vite entrypoint: sets `base: '/'`, registers React plugin, mounts `/api/botpress` and `/MewTinHoc/api/botpress` proxies via a custom plugin using `botpressMiddleware`, disables CSS minification for builds.
- `server/server.js` — standalone Node HTTP server serving static `dist/` output and proxying `/api/botpress*` requests; reads `PORT` from `process.env.PORT` with fallback `3001`.
- `server/botpressMiddleware.js` — Botpress proxy middleware; reads `process.env.BOTPRESS_ALLOWED_ORIGIN` for CORS allowlist and `process.env.NODE_ENV` to decide whether to set the `Secure` flag on the chat session cookie.
- `server/securityHeaders.js` — hardcodes Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy, and conditionally adds HSTS when `NODE_ENV === 'production'` or the request is HTTPS.
- `lib/supabase.js` — frontend Supabase client initialization; reads `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`; falls back to hardcoded project URL and anonymous key if either contains the placeholder strings `YOUR_PROJECT_ID` / `YOUR_PUBLISHABLE_KEY`.
- `src/supabase.js` — re-exports the above client for React components.

## Architecture & Conventions

### Server-side env vars
All server configuration is consumed directly from `process.env` at runtime:

| Variable | File | Default / Fallback | Purpose |
|---|---|---:|---|
| `PORT` | `server/server.js` | `3001` | HTTP listen port |
| `BOTPRESS_ALLOWED_ORIGIN` | `server/botpressMiddleware.js` | `''` (empty) | CORS allowlist; only this origin gets `Access-Control-Allow-Origin` |
| `NODE_ENV` | `server/botpressMiddleware.js`, `server/securityHeaders.js` | undefined | Controls cookie `Secure` flag and HSTS header |

No validation or schema enforcement exists around these variables — missing values simply produce empty strings or falsy checks.

### Frontend env vars (Vite-injected)
The frontend uses Vite's `import.meta.env` mechanism. Only two variables are consumed:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These are expected to be provided by the host environment where the built SPA runs (e.g., GitHub Pages, Netlify, or any static host that supports injecting environment variables into the build). If either value contains its placeholder (`YOUR_PROJECT_ID` or `YOUR_PUBLISHABLE_KEY`), the code substitutes a hardcoded default pointing at `https://vxqvjffssebnuxtslghp.supabase.co` with an anonymous role key embedded in source.

### Build-time vs runtime separation
- **Build-time**: `vite.config.js` is the single source of build configuration. There is no separate `.env` file consumed by Vite; Vite's default behavior would load `.env`, `.env.local`, etc., but none exist in the repo.
- **Runtime**: The Node server reads `process.env` directly. No dotenv package is installed (`package.json` has no `dotenv` dependency).

### Hardcoded defaults as configuration
Several values are baked into source rather than externalized:
- Supabase project URL and anonymous key in `lib/supabase.js`
- MIME type map in `server/server.js`
- CSP policy string in `server/securityHeaders.js`
- Cookie name `mewtinhoc_chat_session` and max body/message sizes in `server/botpressMiddleware.js`
- Botpress proxy paths `/api/botpress` and `/MewTinHoc/api/botpress` in both `vite.config.js` and `server/server.js`

### Security-related configuration
`server/securityHeaders.js` centralizes browser security headers. HSTS is gated on `NODE_ENV === 'production'` or HTTPS detection (via `x-forwarded-proto` or socket encryption). CSP allows Google accounts, Botpress CDN, Google Fonts, and WebSocket connections — reflecting the app's third-party dependencies.

## Conventions & Constraints

- **Environment variables are read inline** — there is no shared config module; each file imports `process.env` directly where needed.
- **Placeholders guard frontend secrets** — `lib/supabase.js` treats values containing `YOUR_PROJECT_ID` / `YOUR_PUBLISHABLE_KEY` as unset and falls back to hardcoded defaults. This is the only explicit "validation" pattern observed.
- **CORS is origin-whitelist based** — `BOTPRESS_ALLOWED_ORIGIN` must exactly match the request's `Origin` header; otherwise the preflight returns 403 with `{ error: 'Origin không được phép' }`.
- **Cookie security is environment-gated** — the chat session cookie is marked `Secure` only when `process.env.NODE_ENV === 'production'`.
- **No `.env` files are committed** — the repo contains no `.env`, `.env.example`, or similar; environment variables are expected to be supplied by the deployment platform.
- **Vite config is the single build configuration point** — all Vite options live in `vite.config.js`; there are no additional config fragments.
- **Botpress proxy paths are duplicated** — the same path prefixes (`/api/botpress`, `/MewTinHoc/api/botpress`) appear in both `vite.config.js` (dev proxy) and `server/server.js` (production proxy), creating a manual synchronization point.