---
kind: dependency_management
name: NPM Dependency Management with Lockfile and GitHub Pages CI
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - skills-lock.json
    - .github/workflows/deploy.yml
---

## System / Approach

This repository is a single-package Node.js + Vite project. Dependencies are managed via **npm** (the default package manager for the project), declared in `package.json` and pinned by `package-lock.json`. A second lockfile, `skills-lock.json`, pins an AI agent skill from Cloudflare's public GitHub repo.

There is no vendoring strategy — all third-party code is resolved from the public npm registry at install time.

## Key Files

- `package.json` — declares runtime dependencies (`@botpress/client`, `@supabase/supabase-js`, `canvas-confetti`, `framer-motion`, `lucide-react`, `pdfjs-dist`, `react`, `react-dom`, `react-pdf`, `react-router-dom`) and dev dependencies (`@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `oxlint`, `vite`).
- `package-lock.json` — npm lockfile generated alongside `package.json`; used by `npm ci` in CI to ensure deterministic installs.
- `skills-lock.json` — locks the `cloudflare/security-audit-skill` (GitHub source) under `.agents/skills/security-audit/`, including a `computedHash` of the skill content.
- `.github/workflows/deploy.yml` — CI pipeline that sets up Node.js 22, caches npm, runs `npm ci`, then `npm run build` and deploys to GitHub Pages.

## Architecture and Conventions

- **Dependency categories**: Runtime vs. development tooling are separated into `dependencies` and `devDependencies` in `package.json`. The server entrypoint (`server/server.js`) is launched via the `server` script but does not declare its own `package.json` — it shares the root dependency tree.
- **Version ranges**: Most packages use caret (`^`) ranges (e.g. `"^19.2.8"` for React), allowing minor/patch updates within the major version. Two packages pin exact versions: `pdfjs-dist` (`3.11.174`) and `react-pdf` (`11.0.0`), likely due to known compatibility constraints between those two.
- **Lockfile-driven installs**: CI uses `npm ci` (not `npm install`), which reads `package-lock.json` and fails if it is out of sync with `package.json` — enforcing that the lockfile stays committed.
- **CI environment**: The workflow explicitly pins the runtime to Node.js 22 via `actions/setup-node@v4` with `node-version: 22` and enables npm cache.
- **Agent skills**: The `.agents/skills/security-audit/` directory is pulled from a remote GitHub repository (`cloudflare/security-audit-skill`) and its integrity is tracked in `skills-lock.json` via a SHA-256 `computedHash`.

## Conventions and Constraints

- **Rule**: All npm dependencies must be declared in `package.json` (no ad-hoc `require()` of unpinned packages); enforced by the presence of a committed `package-lock.json` consumed by `npm ci` in CI.
- **Rule**: CI determinism is enforced by using `npm ci` in `.github/workflows/deploy.yml`, which requires `package-lock.json` to match `package.json` exactly.
- **Rule**: The CI runtime is fixed to Node.js 22 via `actions/setup-node` with `node-version: 22`.
- **Convention**: Runtime libraries go under `dependencies`; build/lint/type tooling goes under `devDependencies`.
- **Convention**: Packages requiring strict ABI compatibility (`pdfjs-dist`, `react-pdf`) are pinned to exact versions without a caret prefix; other packages use caret ranges.
- **No private registry**: No `.npmrc`, `npmrc`, or `registry` field is present; all packages resolve from the public npm registry.
- **No vendoring**: There is no `vendor/`, `node_modules` committed, or bundler-level vendoring configured beyond Vite's normal build output under `dist/`.