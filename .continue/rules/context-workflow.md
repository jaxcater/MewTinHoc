---
name: MewTinHoc context workflow
description: Read AI_CONTEXT.md and docs/code-map.md before touching code in MewTinHoc; search before reading; verify narrowly
alwaysApply: true
---

# MewTinHoc — Context Workflow

Context chung của repo nằm ở 3 file. **Đọc chúng, đừng nhân bản nội dung vào đây.**

| File | Đọc khi nào |
|---|---|
| `AI_CONTEXT.md` | Luôn, trước khi động vào code |
| `docs/code-map.md` | Khi cần tra: "sửa feature X thì tìm ở đâu?" |
| `docs/architecture.md` | Khi sửa hệ thống — để biết **vì sao** nó được dựng như hiện tại |

Repo cũng có `AGENTS.md` ở root — Continue tự nạp file đó.

## Quy trình

```
AI_CONTEXT.md → docs/code-map.md → targeted search → targeted read → edit → targeted verification
```

1. **Đọc `AI_CONTEXT.md` trước.** Không scan thẳng repository.
2. **Tra `docs/code-map.md`** để định vị feature.
3. **Search trước, read sau** — grep theo tên symbol / route / tên bảng / endpoint.
4. **Chỉ đọc tập file nhỏ nhất cần thiết.** File lớn (`RoadmapTab.jsx`, `HomeTab.jsx`, `ExamRoom.jsx`, `index.css`, `server/exam/questionPool.js`) → đọc theo khoảng dòng liên quan.
5. **Mở dependency trực tiếp** khi thật sự cần.
6. **Verification nhỏ nhất phù hợp.**

## Verification

| Sửa gì | Chạy |
|---|---|
| Component React / JS | `npm run lint` |
| `server/chatQuota.js`, `server/chatAuth.test.js`, `server/userActivityStorage.test.js`, `src/lib/userActivityStorage.js`, `src/lib/useUserActivityTimer.js` | `node --test server/chatQuota.test.js server/chatAuth.test.js server/userActivityStorage.test.js` |
| Logic đề thi `server/exam/*` | `npm run exam:check` |
| Ảnh hưởng build | `npm run build` |

## Không làm

- Không scan toàn repository mặc định.
- Không đọc lại file không thay đổi nhiều lần trong cùng task.
- Không mở file không liên quan chỉ để tham khảo.
- Không tự ý refactor app, đổi database/deploy, hay cài dependency mới.
- Không đưa secret vào biến `VITE_*` (Vite nhúng thẳng vào bundle).

## Không hy sinh correctness / security / dependency analysis

- **Correctness** — kiểm tra path/symbol có thật trước khi ghi tài liệu.
- **Security** — không bỏ qua kiểm tra quyền, secret, path traversal, RLS.
- **Dependency analysis** — sửa logic dùng chung (`src/lib/`, `server/exam/`) thì phải mở các nơi đang import nó.
