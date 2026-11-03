---
kind: external_dependency
name: GitHub Pages — static site hosting
slug: github-pages
category: external_dependency
category_hints:
    - client_constraint
scope:
    - '**'
source_files:
    - .github/workflows/deploy.yml
    - README.md
---

### MewTinHoc
- Role: production host for the built Vite output (`dist`).
- Deployment: GitHub Actions workflow pushes to `main` or runs via `workflow_dispatch`; builds with Node 22, caches npm, uploads `dist` via `actions/upload-pages-artifact@v3`, deploys through `actions/deploy-pages@v4` using the `github-pages` environment.
- Constraint: only static assets are served — the Node server under `server/` is NOT deployed here; any Botpress/chat features requiring server-side logic must be routed to an external host.
- Site URL referenced in README: https://melon-1112.github.io/MewTinHoc/