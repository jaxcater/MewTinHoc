# CLAUDE.md — MewTinHoc

@AGENTS.md

---

## Ghi chú riêng cho Claude Code

File trên được import từ `AGENTS.md` — sửa hướng dẫn ở đó, đừng nhân bản vào đây.

### Context dùng chung

| File | Nội dung |
|---|---|
| `AI_CONTEXT.md` | Tổng quan dự án, tech stack, kiến trúc, module quan trọng |
| `docs/code-map.md` | Tra cứu: "sửa feature X thì tìm ở đâu?" |
| `docs/architecture.md` | Quyết định kiến trúc và lý do — đọc trước khi sửa hệ thống |

### Lệnh

```bash
npm run dev          # Vite dev server (kèm API middleware)
npm run build        # Build production vào dist/
npm run lint         # oxlint
npm run server       # Node server phục vụ dist/ + /api/* (PORT 3001)

npm run exam:check   # Kiểm tra kho câu hỏi (chỉ đọc)
npm run exam:refill  # Bù đề vào kho
npm run exam:reset   # Xoá kho và sinh lại
```

### Quy tắc riêng

- **Skills**: dùng `/<skill>` khi khớp. Project skills nằm ở `.agents/skills/`.
- **Không tạo file `.claude/` chứa lại nội dung context** — `AGENTS.md` đã là lớp adapter duy nhất.
