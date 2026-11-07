# AGENTS.md — MewTinHoc

Hướng dẫn cho mọi AI coding agent làm việc trong repo này.
**File này không chứa kiến trúc.** Kiến trúc nằm ở `AI_CONTEXT.md`.

---

## Đọc gì, theo thứ tự

| Bước | File | Nội dung |
|---|---|---|
| 1 | `AI_CONTEXT.md` | Tổng quan dự án, tech stack, kiến trúc, danh sách module quan trọng |
| 2 | `docs/code-map.md` | Tra cứu: "sửa feature X thì tìm ở đâu?" |
| 3 | `docs/architecture.md` | Chỉ đọc khi sửa hệ thống — để biết **vì sao** nó được dựng như hiện tại |

Đừng mở cả ba nếu task rất nhỏ. `AI_CONTEXT.md` là bắt buộc.

---

## Quy trình làm việc

```
AI_CONTEXT.md → docs/code-map.md → targeted search → targeted read → edit → targeted verification
```

1. **Đọc `AI_CONTEXT.md` trước.** Không scan thẳng repository.
2. **Tra `docs/code-map.md`** để định vị feature.
3. **Search trước, read sau.** `grep` theo tên symbol / route / tên bảng / tên endpoint.
4. **Chỉ đọc tập file nhỏ nhất cần thiết.** Với file lớn (`RoadmapTab.jsx`, `HomeTab.jsx`, `ExamRoom.jsx`, `index.css`, `server/exam/questionPool.js`) hãy đọc theo khoảng dòng liên quan.
5. **Mở dependency trực tiếp** khi thật sự cần — mở file mà file đang sửa `import`.
6. **Sửa.**
7. **Verification nhỏ nhất phù hợp** (bảng bên dưới).

## Verification theo loại thay đổi

| Bạn sửa | Chạy |
|---|---|
| Component React / JS | `npm run lint` |
| `server/chatQuota.js`, `server/chatAuth.test.js`, `server/userActivityStorage.test.js`, `src/lib/userActivityStorage.js`, `src/lib/useUserActivityTimer.js` | `node --test server/chatQuota.test.js server/chatAuth.test.js server/userActivityStorage.test.js` |
| Logic đề thi trong `server/exam/*` | `npm run exam:check` (chỉ đọc, không ghi đĩa) |
| Thay đổi ảnh hưởng build | `npm run build` |

Không chạy toàn bộ test suite nếu task chỉ chạm một phần.

---

## Không làm

- **Không scan toàn repository** theo mặc định.
- **Không đọc lại** file không thay đổi nhiều lần trong cùng một task.
- **Không mở file không liên quan** chỉ để "tham khảo".
- **Không tự ý refactor app.** Không đổi database, deployment, hay cài dependency mới.
- **Không ghi secret vào biến `VITE_*`** — Vite nhúng chúng vào bundle.
- **Không commit `.env.local`, `r2-backup-credentials.local`, `dethicosan/`, `sourcedethi/`.**

## Không được hy sinh khi tiết kiệm context

Tối ưu context **không được** làm giảm:
- **Correctness** — luôn kiểm tra path/symbol có thật sự tồn tại trước khi ghi vào tài liệu.
- **Security** — không bỏ qua kiểm tra quyền, secret, path traversal, RLS.
- **Dependency analysis** — sửa logic dùng chung (`src/lib/`, `server/exam/`) thì phải mở và kiểm tra các nơi đang import nó.

---

## Tuân thủ kiến trúc hiện tại

Trước khi sửa hệ thống, đọc `docs/architecture.md`. Các ràng buộc đã biết cần giữ nguyên:

- `EXAM_KEY_SECRET` trên production **không được đổi** trừ khi chạy `npm run exam:reset` — đổi làm toàn bộ đề đã sinh không đọc được.
- API `claim` **không bao giờ** trả đáp án.
- Mọi response (kể cả lỗi) đều đi qua `applySecurityHeaders`.
- Không xoá file đề khi lỗi do **quyền (EACCES)** — chỉ cách ly khi file thực sự hỏng.
- Hệ thống giả định **một** tiến trình Node (rate limit và bộ đếm chat là in-memory/file).
- Ngày học tính theo **giờ VN** qua `formatLocalDate` — không dùng `toISOString()`.
- Thêm route mới → cập nhật cả `src/App.jsx` (`<Routes>` + `goToTab`), `src/components/Navbar.jsx` (`TABS` + `fallbackPaths`).

Chi tiết đầy đủ: `docs/architecture.md`.

---

## Khi nào cập nhật context

Cập nhật `AI_CONTEXT.md` / `docs/code-map.md` / `docs/architecture.md` khi có: module mới, feature lớn mới, API mới, file/module quan trọng bị di chuyển, kiến trúc thay đổi, auth thay đổi, chiến lược database thay đổi, deploy thay đổi, dependency quan trọng thay đổi.

**Không** cần cập nhật khi chỉ sửa CSS, đổi text, fix bug nhỏ, refactor nội bộ nhỏ, đổi tên biến, hay chỉnh logic cục bộ.
