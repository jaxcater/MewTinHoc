# MewTinHoc

Nền tảng luyện thi Tin học THPTQG (2 phân ban: KHMT & Tin học ứng dụng).

## Cấu trúc

- `src/` — frontend React 19 + Vite 8
- `server/` — HTTP server Node (API Botpress, gen đề, đánh giá AI)
- `docs/` — tài liệu kiến trúc & bản đồ code
- `AI_CONTEXT.md` — context dùng chung cho mọi AI coding agent

## Lệnh thường dùng

```bash
npm run dev          # Vite dev server (gắn middleware /api/*)
npm run build        # Build ra dist/
npm run lint         # oxlint
npm run server       # Production server (PORT mặc định 3001)
npm run exam:refill  # Sinh lại kho đề
```

## Triển khai

Deploy qua `.github/workflows/deploy-vps.yml`: push `main` → rsync sang VPS →
`npm ci` → build → `pm2 restart mewtinhoc`.

Biến môi trường thật nằm ở `.env.local` (không commit). Xem `.env.example`
để biết danh sách khoá cần thiết.

> Repo này **private**. Bản deploy chính nằm trên VPS; `public/404.html` giữ
> lại làm fallback cho SPA deep-link nếu sau này cần deploy static.
