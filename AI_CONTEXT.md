# AI_CONTEXT.md — Context chung cho mọi AI coding agent

> Đây là **nguồn sự thật chính** cho context của repository.
> Mọi file hướng dẫn riêng cho từng agent (AGENTS.md, CLAUDE.md, `.cursor/rules/`, `.continue/rules/`, `.windsurf/rules/`) chỉ là **lớp adapter trỏ về đây** — không lặp lại nội dung.

---

## 1. Project Overview

**MewTinHoc** — nền tảng luyện thi môn Tin học cho kỳ thi tốt nghiệp THPT theo chương trình GD&ĐT 2018 (cấu trúc mới của Bộ GD&ĐT).

Người dùng là học viên lớp 12 luyện thi theo **hai định hướng**:

| Mã | Định hướng |
|---|---|
| `ict` | Tin học Ứng dụng |
| `cs` | Khoa học Máy tính |

Tính năng chính:

1. **Lộ trình học 12 tuần / 3 bậc** theo từng định hướng — chặng (station) dạy lý thuyết + câu hỏi trắc nghiệm tại chỗ.
2. **Kho đề thi thử** (tài liệu PDF trên Supabase Storage) do Admin quản lý.
3. **Tạo đề thi thử ngẫu nhiên** theo ma trận đề chuẩn Bộ — sinh đề trên **máy chủ** (Node), đáp án **mã hoá AES-256-GCM** trên đĩa, API `claim` không bao giờ trả đáp án.
4. **Chấm điểm + Đánh giá của AI** (Google Gemini) sau khi nộp bài.
5. **CamCam** — chatbot hỗ trợ học tập (Botpress Cloud), có hạn mức 5 lượt/ngày.
6. **Gamification**: streak tự ghi nhận khi nộp quiz lộ trình hoặc đề thi thử với điểm >10% (mỗi ngày một lần, ân hạn 3 ngày), 4 khối kiến thức (mastery), XP, 6 cấp hình dạng streak.
7. **Khu quản trị** (`/admin`): cấp quyền Admin, sửa lộ trình, soạn thông báo, thống kê thời gian học.

Ngôn ngữ giao diện và toàn bộ comment trong mã là **tiếng Việt** — giữ nguyên khi sửa.

---

## 2. Tech Stack

| Lớp | Công nghệ |
|---|---|
| Build | Vite 8 + `@vitejs/plugin-react` |
| Frontend | React 19.2, React DOM 19.2 |
| Routing | react-router-dom 7.18 (`BrowserRouter`, `basename={import.meta.env.BASE_URL}`) |
| Animation | framer-motion 14.7 (`AnimatePresence`, `motion`, `useReducedMotion`) |
| Icons | lucide-react 1.56 |
| Backend | Node.js — `node:http` thuần, **không dùng Express** |
| Auth + DB + Storage | Supabase (`@supabase/supabase-js` 2.117) — Auth (Google OAuth), Postgres, Realtime, Storage |
| AI | Google Gemini ( qua `fetch` tới `generativelanguage.googleapis.com`) + Botpress Cloud (`@botpress/client` 2.8) |
| PDF | react-pdf 11 + pdfjs-dist 3.11 |
| Misc | canvas-confetti (pháo giấy), disable-devtool (chặn DevTools) |
| Lint | oxlint (`.oxlintrc.json`) — chạy bằng `npm run lint` |
| Ngôn ngữ | JavaScript (ESM) là chính. Chỉ **một** file TypeScript: `src/variants.ts` |

**Không có test framework.** Test dùng `node:test` + `node:assert/strict` (built-in).

---

## 3. Architecture

Repository này **không phải monorepo** — một repo duy nhất chứa cả frontend và backend:

```
index.html ──► src/main.jsx ──► src/App.jsx   (React SPA, hash-free history routing)
                    │
                    └──► fetch('/api/exams', '/api/ai', '/api/botpress')
                                    │
                    vite.config.js (dev)  /  server/server.js (prod)
                                    │
                    ┌───────────────┴───────────────┐
              server/exam/*                 server/ai/*, server/botpress*
              (sinh đề, chấm điểm)          (Gemini, Botpress)
```

- **Dev** (`npm run dev`): Vite phục vụ SPA; `vite.config.js` gắn **cùng bộ middleware** vào dev server → API chạy giống production.
- **Prod** (`npm run server`): `server/server.js` phục vụ `dist/` (static + SPA fallback) và route `/api/*` **trước** static handler.
- **Backend là stateful, chạy 1 tiến trình** (PM2). Rate limit và bộ đếm hạn mức đều là **in-memory / file trên đĩa**, không phải Redis.
- **Dữ liệu học viên** nằm ở Supabase Postgres + Storage. **Dữ liệu đề thi** nằm trên **filesystem máy chủ** (ngoài repo).

Phân tách trách nhiệm frontend:

| Thư mục | Vai trò |
|---|---|
| `src/components/` | Component React theo feature (không có `views/` hay `pages/` riêng) |
| `src/components/exam/` | Vùng UI của luồng làm đề |
| `src/components/landing/` | Trang giới thiệu (marketing) + hook animation riêng |
| `src/components/motion/` | Primitive animation dùng chung |
| `src/components/demo/` | View hiển thị khi tính năng bị khoá cho tài khoản Demo |
| `src/lib/` | Logic dùng chung: hook, API client, storage service, tiện ích |
| `src/data/` | **Dữ liệu tĩnh nhúng trong bundle**: roadmap, ngân hàng câu hỏi |
| `src/assets/` | Hình ảnh được bundler xử lý (import trong JSX) |
| `img/` | Hình ảnh ở `public/`-kiểu nhưng nằm ngoài `public/` — import qua đường dẫn tương đối |
| `server/` | Backend Node (không bundle) |
| `lib/supabase.js` | Tạo Supabase client dùng chung cho cả `src/` và `server/` |

---

## 4. Important Modules

### 4.1 Backend — `server/`

| File | Trách nhiệm |
|---|---|
| `server/server.js` | HTTP server: security headers → route `/api/*` → static `dist/` + SPA fallback. Health-check lúc boot (bố cục dữ liệu, khoá mã hoá, cấu hình AI) |
| `server/envLoader.js` | Nạp `.env.local` / `.evn.local` / `.env` vào `process.env`. **Biến đã có trong `process.env` không bị ghi đè** (PM2/OS thắng) |
| `server/securityHeaders.js` | CSP + `X-Content-Type-Options` + HSTS cho **mọi** response kể cả lỗi |
| `server/exam/examMiddleware.js` | HTTP middleware `/api/exams/*`: `POST /claim`, `POST /submit`, `GET /health` (admin token) |
| `server/exam/examService.js` | Orchestration: rate limit → claim từ pool → sinh bù nếu cạn → trả đề |
| `server/exam/storage.js` | Đĩa: `pool/` → `sessions/` (rename nguyên tử), cờ `.submitted`, cách ly file hỏng |
| `server/exam/builder.js` | Lập ma trận đề Phần I/II, shuffle, xoay vòng câu hỏi |
| `server/exam/questionPool.js` | Đọc + chuẩn hoá câu hỏi từ `sourcedethi/*.txt|.json` (4 định dạng được hỗ trợ) |
| `server/exam/crypto.js` | Mã hoá/giải mã AES-256-GCM (magic `MTH1`) + `keyHealthCheck()` |
| `server/exam/config.js` | Hằng số nghiệp vụ: ma trận đề, thời lượng, hạn mức, đường dẫn dữ liệu |
| `server/exam/grading.js` | Chấm điểm Phần I/II + validate shape bài làm |
| `server/exam/auth.js` | Xác minh Bearer token với Supabase; phân biệt user thật / khách theo IP |
| `server/exam/worker.js` | Cron job bù đề (`npm run exam:refill` / `--check` / `--reset` / `--simulate`) |
| `server/ai/aiMiddleware.js` | `/api/ai/status` + `/api/ai/review`, rate limit theo user/IP, **hoàn lượt khi lỗi do upstream** |
| `server/ai/geminiService.js` | Gọi Gemini, danh sách model fallback, chuẩn hoá lỗi theo mã |
| `server/ai/systemInstruction.js` | System prompt cho Gemini (gia sư Tin học) |
| `server/botpressMiddleware.js` | `/api/botpress/*`: `chat`, `status`, `quota`, `files`, `diagnose`, `reset` |
| `server/botpressService.js` | Botpress Cloud client, webhook, quản lý hội thoại |
| `server/chatQuota.js` | Bộ đếm hạn mức chat 5 lượt/ngày, reset 00:00 giờ VN, lưu `var/chat-usage/` |

### 4.2 Frontend — `src/`

| File | Trách nhiệm |
|---|---|
| `src/main.jsx` | Mount React, `BrowserRouter`, cài `--app-vh` cho mobile |
| `src/App.jsx` | **App shell**: định tuyến, vòng đời đăng nhập Supabase, toast, khoá tính năng Demo, footer, chat bubble, announcement |
| `src/lib/userProgress.js` | Hook `useUserProgress` — streak, mastery, bài học đã hoàn thành + **Realtime Supabase** + fallback LocalStorage |
| `src/lib/roleService.js` | Nguồn sự thật về quyền Admin (`profiles.is_admin`) |
| `src/lib/useResourceProtection.js` | Chặn menu lưu ảnh, nhấn giữ và kéo ảnh giao diện cho khách/học viên; miễn admin. Không ảnh hưởng tải tài liệu hay sao chép nội dung học tập. |
| `src/lib/useVisibleAnimations.js` | Tạm dừng/tiếp tục CSS animation của các khối dashboard theo vùng nhìn thấy và trạng thái tab; không unmount hay reset timeline. |
| `src/lib/demoAccess.js` | Quy tắc tính năng nào bị khoá với tài khoản Demo |
| `src/lib/examApi.js` | Client `/api/exams` (gắn Bearer token, phân loại lỗi) |
| `src/lib/aiReviewApi.js` | Client `/api/ai` (timeout 75s) |
| `src/lib/examLog.js` | Dựng log bài làm, lưu localStorage, `buildAiPrompt()` |
| `src/lib/examLogReport.js` | Render báo cáo bài làm ra HTML để in/xuất |
| `src/lib/examDocsStorage.js` | CRUD kho tài liệu đề thi trên Supabase Storage |
| `src/lib/roadmapStorage.js` | Đọc/ghi lộ trình JSON trên Storage (signed URL, fallback local) |
| `src/lib/announcementService.js` | CRUD thông báo + SQL để tạo bảng `announcements` |
| `src/lib/userActivityStorage.js` + `useUserActivityTimer.js` | Đếm thời gian học, lease để 1 tab ghi, upload mỗi 30s |
| `src/data/roadmap/` | Lộ trình tĩnh (ICT + CS) — nguồn fallback khi Storage lỗi |
| `src/data/questions/` | Ngân hàng câu hỏi trắc nghiệm tại chặng (nội dung tĩnh) |
| `src/variants.ts` | **Token motion duy nhất**: easing, spring, variants (file TS duy nhất) |

### 4.3 Component chính

| File | Trách nhiệm |
|---|---|
| `src/components/Navbar.jsx` | Thanh điều hướng ngang; export hằng `TABS` |
| `src/components/HomeTab.jsx` | Trang chủ: streak tự động, lịch ngày học, mastery, mô phỏng ngày (admin) |
| `src/components/StudyStreakReward.jsx` | Phản hồi và animation khi bài nộp đầu tiên trong ngày đủ điều kiện streak |
| `src/components/RoadmapTab.jsx` | Lộ trình 12 tuần, chọn chặng, mở quiz/PDF, sửa lý thuyết (admin) — **file lớn ~93KB** |
| `src/components/ExamRepoTab.jsx` | Kho đề thi thử (PDF) |
| `src/components/exam/GenExamTab.jsx` | Luồng tạo đề: chọn hướng → `claimExam` → vào `ExamRoom` |
| `src/components/exam/ExamRoom.jsx` | Phòng thi: đếm ngược, trả lời, nộp bài, chấm điểm, gọi AI — **file lớn ~33KB** |
| `src/components/exam/AiReviewPanel.jsx` | Khối "Đánh giá của AI" + cooldown |
| `src/components/StationQuizView.jsx` | Quiz tại chặng (dùng `src/data/questions/`) |
| `src/components/AdminPage.jsx` | Trang quản trị: profiles, bảng `announcements`, panel hoạt động |
| `src/components/BotpressChatBubble.jsx` | Bong bóng chat CamCam + markdown nội tuyến |
| `src/components/LoginPage.jsx` | Màn hình đăng nhập Google + điều khoản + nhúng `LandingPage` |
| `src/components/landing/LandingPage.jsx` | Trang giới thiệu (section con trong `landing/`) |

---

## 5. Context Strategy

### Quy trình chuẩn cho mỗi task

```
AI_CONTEXT.md
  → docs/code-map.md          (tra cứu: "sửa feature X thì tìm ở đâu?")
  → targeted search           (grep đúng symbol / route / tên bảng)
  → targeted read             (chỉ mở file liên quan, đọc đúng vùng cần thiết)
  → edit
  → targeted verification     (lint / test nhỏ nhất phù hợp)
```

### Quy tắc bắt buộc

1. **Đọc `AI_CONTEXT.md` trước** khi động vào code. Không scan thẳng repository.
2. **Tra `docs/code-map.md`** để biết feature nằm ở đâu trước khi search.
3. **Search trước, read sau.** Dùng `grep` với tên symbol / route / tên bảng / tên endpoint.
4. **Chỉ đọc tập file nhỏ nhất cần thiết.** Với file lớn (`RoadmapTab.jsx`, `HomeTab.jsx`, `ExamRoom.jsx`, `index.css`, `server/exam/questionPool.js`) hãy đọc theo khoảng dòng liên quan, không đọc trọn.
5. **Mở dependency trực tiếp** khi thật sự cần — mở file mà file đang sửa `import`, không mở "cho có".
6. **Không scan toàn repository** theo mặc định.
7. **Không đọc lại** file không thay đổi nhiều lần trong cùng một task.
8. **Không mở file không liên quan** chỉ để "tham khảo".
9. **Sau khi sửa, chạy verification nhỏ nhất phù hợp** — không chạy toàn bộ suite nếu task chỉ chạm một phần.

### Verification theo loại thay đổi

| Bạn sửa | Chạy |
|---|---|
| Component React / JS | `npm run lint` |
| `server/chatQuota.js`, `server/chatAuth.test.js`, `server/userActivityStorage.test.js`, `src/lib/userActivityStorage.js`, `src/lib/useUserActivityTimer.js` | `node --test server/chatQuota.test.js server/chatAuth.test.js server/userActivityStorage.test.js` |
| Logic đề thi (`server/exam/*`) | `npm run exam:check` (không ghi đĩa) |
| Thay đổi build | `npm run build` |

### Không mặc định

```
full repository scan → đọc hàng chục file → sửa code → chạy toàn bộ test suite
```

### Không được hy sinh

Tối ưu context **không được** làm giảm:
- **Correctness** — luôn kiểm tra đường dẫn file/symbol có thật sự tồn tại trước khi ghi vào tài liệu.
- **Security** — không bỏ qua kiểm tra quyền, secret, path traversal, RLS.
- **Dependency analysis** — khi sửa logic dùng chung (`src/lib/`, `server/exam/`), phải mở và kiểm tra các nơi đang import nó.

---

## 6. Quy tắc cập nhật context

**Cập nhật `AI_CONTEXT.md` / `docs/code-map.md` / `docs/architecture.md` khi có:**

- Thêm module mới hoặc feature lớn mới
- Thêm API / endpoint mới
- File hoặc module quan trọng bị di chuyển / đổi tên
- Kiến trúc thay đổi
- Chiến lược auth thay đổi
- Chiến lược database thay đổi
- Kiến trúc deploy thay đổi
- Dependency quan trọng giữa các module thay đổi

**Không cần cập nhật khi chỉ:**

- Sửa CSS / đổi text / fix bug nhỏ
- Refactor nội bộ nhỏ không ảnh hưởng kiến trúc
- Đổi tên biến cục bộ
- Chỉnh logic cục bộ

---

## 7. Ranh giới an toàn

- **Không tự ý refactor app.** Đây là hệ thống context, không phải đợt dọn dẹp code.
- **Không đổi database, deployment, hay cài dependency mới** chỉ để làm setup.
- **Không commit `.env.local`, `r2-backup-credentials.local`, `dethicosan/`, `sourcedethi/`.** Chúng đã nằm trong `.gitignore`.
- **Không ghi thông tin chưa kiểm chứng** vào bất kỳ file context nào.
- Đọc `docs/architecture.md` để biết **vì sao** hệ thống được dựng như hiện tại trước khi sửa nó.
