# Architecture — MewTinHoc

> Ghi lại **các quyết định kiến trúc có giá trị lâu dài** và lý do đằng sau chúng.
> Đọc file này **trước khi sửa** hệ thống — để biết hệ thống được dựng như hiện tại vì lý do gì.
> Đây **không phải** changelog. Nếu một quyết định thay đổi, hãy sửa mục tương ứng thay vì nối thêm vào cuối.

---

## 1. Tổng quan

Một repository duy nhất chứa cả frontend (React SPA) và backend (Node `node:http` thuần).

```
                    ┌─────────────────────────────┐
  Browser ────────► │  Nginx (aaPanel)            │
                    │  root → /www/wwwroot/MewTinHoc/dist
                    │  /api/* → proxy 127.0.0.1:3001
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Node server (PM2, user www)  │
                    │  server/server.js :3001       │
                    │   ├─ /api/exams/*             │
                    │   ├─ /api/ai/*                 │
                    │   ├─ /api/botpress/*           │
                    │   └─ static dist/ + SPA        │
                    └───┬──────────┬───────────┬────┘
                        │          │           │
              Supabase  │   Supabase │      Gemini /
             (Auth/DB/  │   Storage  │      Botpress
              Storage)  │            │
                        ▼          ▼
              sourcedethi/   dethicosan/       (filesystem, ngoài repo)
              var/chat-usage/
```

**Vì sao không monorepo, không framework backend:** toàn bộ API là 3 nhóm middleware nhỏ. Tách package sẽ thêm độ phức tạp build mà không mang lại lợi ích. `node:http` + `node:fs` đủ dùng và giữ dependency về 0 ở server side.

**Vì sao dùng nginx + static `dist/` thay vì Node serve SPA:** nginx cache tĩnh, chịu tải tốt hơn, và tách bạch rõ "static do nginx, API do Node". Node vẫn có fallback serve `dist/` để chạy độc lập (dev, debug).

---

## 2. Authentication

| Hạng mục | Quyết định |
|---|---|
| Cơ chế | Google OAuth qua **Supabase Auth** |
| Client | `supabase.auth.getSession()` + `onAuthStateChange` trong `src/App.jsx` |
| Token gửi lên API | `Authorization: Bearer <access_token>` |
| Xác minh ở server | `server/exam/auth.js` gọi `GET {SUPABASE_URL}/auth/v1/user`, cache token 5 phút |
| Khi không có token | Coi là **khách** → hạn mức theo IP chặt hơn (`ANON_LIMIT`) |
| Client không được tự gửi userId | Server **không tin** `userId` trong body |

### Phân quyền Admin

- **Nguồn sự thật duy nhất:** cột `is_admin` của bảng `profiles` trên Supabase.
- `src/lib/roleService.js` đồng bộ hồ sơ khi đăng nhập: user mới → `is_admin = false`; user cũ → giữ nguyên quyền.
- RLS trên `profiles`: select own-or-admin, insert self (ép `is_admin = false`), update admin-only.
- **Không hardcode email admin trong code.** Việc cấp quyền làm trong SQL/Admin UI.
- Cờ `isAdmin` từ client **không** được dùng để miễn hạn mức — server tự tra `profiles` (xem `server/chatAuth.test.js`).

### Tài khoản Demo

- Cờ `isDemo` do `src/App.jsx` gắn khi đăng nhận nhanh; lưu ở `sessionStorage` (không `localStorage`) để tự hủy khi đóng tab.
- Demo dùng Trang chủ + Lộ trình; Bảng thành tích chỉ hiện giới thiệu và bộ huy hiệu, không gọi RPC. Quy tắc khoá tính năng học nâng cao gom một chỗ: `src/lib/demoAccess.js`.
- Nội dung thông báo khoá: `src/components/demo/DemoLockedView.jsx` (`DEMO_LOCKED_CONTENT`).
- Demo **không** ghi vào Supabase (mọi `upsert` đều có guard `!isDemo`).

---

## 3. Database Strategy

**Không có ORM, không có migration runner.** Truy vấn trực tiếp bằng `supabase.from(...)` / `supabase.storage`.

| Nguồn | Dùng cho | Quyết định |
|---|---|---|
| Supabase Postgres | Hồ sơ, tiến độ học, thông báo | RLS bật; SQL idempotent trong `docs/supabase-setup.sql` |
| Supabase Storage | Roadmap JSON, tài liệu đề PDF, log hoạt động | Bucket **private** → dùng signed URL |
| Supabase Realtime | `user_progress`, `mastery_progress`, `roadmap_lessons`, `daily_checkins` | Subscribe `postgres_changes` lọc theo user |
| LocalStorage | Fallback offline + cache UI | Key có tiền tố `tinhoc_*` + userId |
| Filesystem máy chủ | Đề thi (mã hoá), bộ đếm chat | Ngoài repo, không public |
| `src/data/` | Roadmap + ngân hàng câu hỏi tĩnh | Nằm trong bundle, là fallback khi Storage lỗi |

**Vì sao vẫn giữ fallback local:** app phải chạy được khi Supabase lỗi hoặc khi bảng chưa tạo. `useUserProgress` có `dbStatus: 'checking' | 'connected' | 'fallback'` để báo trạng thái.

**Vì sao dữ liệu đề thi không nằm trong Postgres:** đề chứa đáp án, phải mã hoá trên đĩa, và cần cơ chế claim nguyên tử (rename file) — Postgres không cho rename atomic kiểu đó dễ dàng.

**Vì sao có bảng `announcements` không nằm trong `docs/supabase-setup.sql`:** SQL của nó nằm riêng ở `ANNOUNCEMENTS_SQL` trong `src/lib/announcementService.js` vì được viết sau. Khi cần chuẩn hoá, gộp vào `docs/supabase-setup.sql` và xoá hẳn khỏi file service.

---

## 4. API Architecture

### Bảng thành tích EXP

Route `/leaderboard` lazy-load `LeaderboardTab`. Client gọi trực tiếp Supabase RPC `get_exp_leaderboard`, chỉ cấp EXECUTE cho `authenticated` và kiểm tra `auth.uid()` trong hàm. RPC `SECURITY DEFINER` khóa `search_path`, chỉ trả tên hiển thị đã loại phần domain email, UUID, EXP, hạng và URL avatar Google HTTPS lấy từ metadata Auth (`avatar_url`/`picture`, dự phòng identity Google). Không trả toàn bộ metadata, không mở quyền SELECT bảng Auth hay mở rộng SELECT/RLS của `profiles`/`user_progress`.

Hàm xếp hạng toàn bộ học viên có EXP > 0 bằng `RANK()` theo `xp_total DESC`, dùng UUID tăng dần để ổn định thứ tự đồng điểm, sau đó mới phân trang. Một snapshot trả danh sách, top 5, tổng, vị trí cá nhân và mức EXP kế tiếp. Poll mỗi phút khi tab đang hiển thị, không subscribe hồ sơ toàn cục. Demo không truy vấn bảng thật. Không thêm endpoint Node hay env VPS. SQL và hướng dẫn: `docs/leaderboard.sql`, `docs/leaderboard-deploy.md`.

Nguồn EXP vẫn là `userProgress.js` ghi tiến độ từ client; RPC đọc không cung cấp tính chống gian lận. Cần ledger điểm do server xác minh trước khi dùng cho giải thưởng có giá trị.

### Nguyên tắc

1. **Không framework.** Mỗi nhóm API là một hàm middleware `(req, res, next)` trong `server/`.
2. **Cùng một bộ middleware chạy ở dev và prod.** `vite.config.js` gắn chính các middleware đó vào dev server → không có "chỉ work ở production".
3. **API phải đứng TRƯỚC static handler** trong `server/server.js`, nếu không `POST` sẽ rơi vào SPA fallback và trả `index.html`.
4. **Lỗi trả về luôn có cấu trúc:** `{ ok, code, message }` — `code` là mã ổn định để client phân loại (`POOL_EMPTY`, `TOO_FAST`, `AI_NOT_CONFIGURED`...).
5. **Endpoint nhạy cảm trả 404 thay vì 403** khi không đủ quyền, để không xác nhận sự tồn tại (xem `/api/exams/health`, `/api/exams/*`).
6. **Body giới hạn kích thước** (`MAX_BODY_BYTES` trong từng middleware) và **rate limit in-memory** theo user/IP.

### Bảng endpoint

| Nhóm | Prefix | Rate limit |
|---|---|---|
| Đề thi | `/api/exams` | `RATE_LIMIT` trong `server/exam/config.js` (30s/đề, 10 đề/ngày; khách 60s, 3/ngày) |
| AI | `/api/ai` | `AI_LIMIT` (15s/lần, 12/h; khách 45s, 4/h) + **hoàn lượt khi lỗi upstream** |
| Chat | `/api/botpress` | `server/chatQuota.js` — 5 lượt/ngày, reset 00:00 giờ VN |

### Vì sao `/api/exams` cần `POST` chứ không phải `GET`

Claim đề là hành động tiêu tốn tài nguyên (sinh đề, xoay vòng pool, giới hạn lượt) → phải là `POST` để không bị prefetch/crawler kích hoạt.

### Vì sao không trả "còn bao nhiêu đề trong kho"

Yêu cầu nghiệp vụ: **ẩn tình hình kho** khỏi học viên. API `claim` chỉ trả đề, không trả số lượng.

---

## 5. Bảo mật đáp án (đặc thù quan trọng nhất)

Đáp án là tài sản nghiệp vụ của nền tảng. Kiến trúc bảo vệ gồm 5 lớp:

| Lớp | Cơ chế | Nơi |
|---|---|---|
| 1. API không rò đáp án | `claim` trả `publicExam` = `{examId, track, durationMinutes, partI[], partII[]}`; mỗi câu Phần I chỉ có `{no, topic, stem, options}` | `server/exam/builder.js` |
| 2. Mã hoá trên đĩa | AES-256-GCM, magic `MTH1` | `server/exam/crypto.js` |
| 3. Khoá ngoài repo | `EXAM_KEY_SECRET` hoặc `dethicosan/.key-secret` (chmod 600) | `server/exam/config.js` |
| 4. Chặn HTTP | nginx `deny all` + server trả 404 cho `/dethicosan`, `/sourcedethi` | `server/server.js` |
| 5. Chống nộp lại | Cờ `wx` nguyên tử → lần 2 trả 409 | `server/exam/storage.js` |

**Fail-closed:** nếu `keyHealthCheck()` trả `bad-key`, hệ thống **dừng claim** thay vì xoá đề. Lỗi do **quyền (EACCES)** chỉ cảnh báo và giữ nguyên file — cách ly nhầm sẽ xoá sạch kho đề.

**Đổi `EXAM_KEY_SECRET` = toàn bộ đề đã sinh không đọc được** → phải `npm run exam:reset`.

---

## 6. State Management

**Không có thư viện state management** (không Redux, không Zustand, không Jotai).

| Loại state | Nơi lưu | Quy tắc |
|---|---|---|
| UI cục bộ | `useState` trong component | Mặc định |
| State chia sẻ giữa vài component | Nâng lên `App.jsx` qua props | `user`, `progress`, `streak`, `toastMessage` |
| State bền vững theo user | Supabase (`user_progress`, ...) + Realtime | Nguồn sự thật |
| Fallback offline | `localStorage` / `sessionStorage` | Key `tinhoc_*` + userId |
| Cache tài liệu | `localStorage` | VD: `tinhoc_selected_track` |

**Quy tắc:** nếu một state cần dùng ở >3 chỗ và là logic nghiệp vụ → đưa vào `src/lib/` dưới dạng hook/service. Ngược lại để trong component.

### Toast

`App.jsx` giữ `toastMessage` + `toastTone` và render ở `App`. Component con gọi qua prop `onNavigate` / callback, **không** tự tạo toast riêng (tránh nhiều nguồn hiển thị chồng lên nhau).

---

## 7. Routing

- `react-router-dom` v7, **History API** (không hash).
- `basename={import.meta.env.BASE_URL}` để chạy được cả ở subpath.
- Toàn bộ `<Routes>` nằm **trong `src/App.jsx`** — không có cấu hình route riêng.
- Các màn Home/Roadmap/Kho đề/Tạo đề/Admin và chat tải bằng `React.lazy`; không nạp tất cả vào bundle khởi động. Navbar preload màn theo hover/focus, vẫn giữ kiểm tra khoá Demo.
- `Suspense` nằm trong `PageTransition` để giữ animation chuyển trang; lỗi tải màn có nút tải lại. PDF.js tải riêng khi mở tài liệu.
- `Navbar` export hằng `TABS` (`home`, `roadmap`, `exams`, `ai_exam`, `leaderboard`); ánh xạ TABS → path nằm trong `goToTab` của `App.jsx`.
- **Khi thêm route mới, cập nhật cả 3 nơi:** `<Routes>` trong `App.jsx`, `TABS` + `fallbackPaths` trong `Navbar.jsx`, và `goToTab` trong `App.jsx`.
- `/admin` được render **riêng**, ngoài shell app (`isAdminRoute`).
- `public/404.html` giữ lại như fallback cho SPA deep-link (không còn workflow Pages dùng, nhưng vẫn hữu ích nếu sau này deploy static).

---

## 8. Styling & Design System

| Quyết định | Chi tiết |
|---|---|
| Nền tảng | `src/index.css` — CSS thuần + CSS variables (`--color-primary`, `--app-vh`, `--ease-out`...) |
| Bảng màu | Cam ấm, primary `#FC7500` / `#EA580C` |
| Font | Plus Jakarta Sans (UI), JetBrains Mono (code), Bricolage Grotesque (display) — nạp qua Google Fonts |
| Component CSS | CSS riêng cạnh component: `landing.css`, `exam-room.css`, `gen-exam.css`, `demo-gate.css`, `announcement-banner.css`, `loading-screen.css` |
| Motion | `framer-motion`. **Toàn bộ token tập trung ở `src/variants.ts`** (`EASINGS`, `SPRINGS`, các `*Variants`) — không hardcode lại trong component |
| Reduced motion | `useReducedMotion()` + `reducedMotionVariants` — luôn tôn trọng |
| Icon | `lucide-react` |

**Vì sao không Tailwind:** CSS thuần đã có hệ design token ổn định; thêm utility framework lúc này tốn công migrate mà không mang lại lợi ích rõ.

---

## 9. Naming Convention

| Loại | Quy tắc | Ví dụ |
|---|---|---|
| Component React | PascalCase, file `.jsx` | `ExamRoom.jsx`, `RoadmapTab.jsx` |
| Component file | PascalCase (không phải `.component.jsx`) | `AdminPage.jsx` |
| Service / util | camelCase, file `.js` | `examApi.js`, `roadmapStorage.js` |
| Hook | `useXxx`, file `.js` | `useUserProgress.js`, `useCountdown.js` |
| Hằng số | `SCREAMING_SNAKE_CASE`, `Object.freeze` | `TABS`, `DEMO_FEATURE`, `RATE_LIMIT` |
| Hàm trong `src/lib/` | `verbNoun` | `claimExam`, `submitExam`, `fetchRemoteRoadmap` |
| Hàm server | `verbNoun`, export tên hàm | `requestExam`, `gradeSubmission`, `loadQuestionPool` |
| Biến môi trường | `SCREAMING_SNAKE_CASE` | `EXAM_KEY_SECRET`, `GEMINI_API_KEY` |
| Bảng DB | `snake_case` | `user_progress`, `mastery_progress` |
| Bucket Storage | PascalCase | `KhoTaiLieuTinHocThiThu`, `user-activity-logs` |
| Key localStorage | `tinhoc_*` | `tinhoc_user_progress_${userId}` |
| CSS class | `kebab-case` | `exam-room`, `gx-ai__glow` |

**Quy ước response API:** `{ ok: boolean, code: string, message: string }` — `message` bằng tiếng Việt, dành cho người dùng cuối.

---

## 10. Shared Utilities

| Nhóm | Vị trí | Chức năng |
|---|---|---|
| Supabase client | `lib/supabase.js` | Dùng chung `src/` + `server/`. Bỏ qua giá trị placeholder `YOUR_PROJECT_ID` / `YOUR_` |
| API client | `src/lib/examApi.js`, `aiReviewApi.js` | Gắn Bearer token, phân loại lỗi theo `code` |
| Storage service | `src/lib/examDocsStorage.js`, `roadmapStorage.js`, `announcementService.js`, `userActivityStorage.js` | Mỗi service 1 domain, không lẫn lộn |
| Hook nghiệp vụ | `src/lib/userProgress.js`, `useUserActivityTimer.js` | Logic dùng chung dạng hook |
| Tiện ích UI | `src/lib/scrollLock.js`, `defaultAvatar.js`, `viewportHeight.js` | Hàm thuần, không phụ thuộc React (trừ hook) |
| Motion token | `src/variants.ts` | Nguồn duy nhất của easing/spring/variants |
| Server | `server/envLoader.js`, `server/securityHeaders.js` | Nạp env + security headers dùng chung |

**Vì sao `lib/supabase.js` ở gốc repo chứ không ở `src/lib/`:** `server/exam/auth.js` cần dùng cùng cấu hình Supabase nhưng nằm ngoài `src/`. Đặt ở `lib/` cho cả hai cùng import.

---

## 11. Infrastructure Assumptions

### Môi trường

| Giả định | Chi tiết |
|---|---|
| Node | 26.13.0 trên VPS (CI dùng `node-version: 22`) |
| Process manager | PM2, tên process `mewtinhoc`, chạy dưới user `www` |
| Reverse proxy | nginx (aaPanel), proxy `/api/` → `127.0.0.1:3001` |
| Data root | `/www/wwwroot` (repo + `sourcedethi/` + `dethicosan/` là 3 thư mục anh em) |
| Cổng | 3001 (biến `PORT`) |
| Cron | `*/10 * * * *` chạy `server/exam/worker.js` để bù đề |
| Tiến trình | **Một tiến trình Node.** Rate limit và bộ đếm hạn mức là in-memory / file → chạy nhiều instance sẽ sai số |

> **Ràng buộc quan trọng:** hệ thống giả định 1 process. Nếu cần scale ngang, phải chuyển rate limit + bộ đếm chat sang kho dùng chung có cập nhật nguyên tử.

### Secrets

| Secret | Nơi |
|---|---|
| `GEMINI_API_KEY` | Chỉ máy chủ. **Không** dùng `VITE_*` (Vite nhúng thẳng vào bundle) |
| `BOTPRESS_WEBHOOK_ID`, `BOTPRESS_ENCRYPTION_KEY`, `BOTPRESS_TOKEN`, `BOTPRESS_BOT_ID` | Máy chủ |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Máy chủ (xác minh token) |
| `EXAM_KEY_SECRET` | Máy chủ — **đổi = mất toàn bộ đề đã sinh** |
| `EXAM_ADMIN_TOKEN` | Máy chủ — bật `/api/exams/health` |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Client — anon key công khai, chấp nhận được |

`server/envLoader.js` **không ghi đè** biến đã có trong `process.env` → PM2 và biến OS luôn thắng file.

### Vì sao API chỉ chạy sau nginx

`server/server.js` mặc định listen `127.0.0.1` → không public trực tiếp. `BOTPRESS_ALLOWED_ORIGIN` khoá origin cho API Botpress.

---

## 12. Deployment Architecture

**Một đường deploy duy nhất — VPS:**

### A. VPS — `.github/workflows/deploy-vps.yml` (đường chính)

```
test pipeline đề → git archive HEAD → tar → rsync (--delete, --chown=www:www) → VPS
  → ghi .env.local từ GitHub Secrets (chmod 600, chown www:www)
  → cố định EXAM_DATA_ROOT=/www/wwwroot trong .env.local và môi trường PM2
  → su www: npm ci --include=dev → npm run exam:check -- --strict
  → su www: rm -rf dist && npm run build && test -f dist/index.html
  → pm2 restart mewtinhoc --update-env  (hoặc pm2 start nếu lần đầu)
  → kiểm tra pm2 online + curl / trả 200 (lặp 5 lần)
  → kiểm tra kho đề còn nguyên
```

**Vì sao `git archive` + `rsync` thay vì `git pull` trên VPS:** repo **private** → VPS không fetch được qua HTTPS (trả "could not read Username"). Đóng gói đúng file git track rồi đẩy sang, máy chủ không cần credential GitHub.

**Vì sao `--exclude` cụ thể:** `node_modules`, `dist` (sinh tại chỗ), `.env.local` (chứa secret, không bao giờ ghi đè), `var` (trạng thái runtime — `var/chat-usage/` là hạn mức chat đã dùng; không exclude thì mỗi lần deploy xoá sạch).

**Vì sao `rm -rf dist` trước khi build:** nếu build lỗi mà `dist/` cũ còn đó, `test -f dist/index.html` vẫn pass → deploy "xanh" với bundle cũ. Đây là điểm hỏng âm thầm kinh điển.

**Vì sao `--chown=www:www`:** tiến trình chạy bằng user `www`; file do root tạo sẽ khiến `www` không đọc được — từng làm hỏng kho đề.

**Vì sao `npm ci --include=dev`:** Vite nằm trong `devDependencies` nhưng cần để build.

**Vì sao deploy kiểm tra HTTP chứ không tin exit code của `pm2 restart`:** `pm2 restart` báo thành công cả khi tiến trình chết ngay sau đó.

**Vì sao kiểm tra nguồn trước build/restart:** HTTP 200 của SPA không chứng minh
ngân hàng câu hỏi đọc được. Chế độ `--strict` bắt buộc đủ 10 file nguồn có câu
dùng được, không có bản ghi sai định dạng, không đồng thời có `.txt` và `.json`
cùng tên (tránh nguồn cũ che nguồn mới), đồng thời kiểm tra quyền đọc/ghi/truy cập
các thư mục kho đề bằng user `www`. `sourcedethi/` và `dethicosan/` được exclude
khỏi rsync, ngân hàng được upload riêng tại `/www/wwwroot/sourcedethi/`.

---

## 13. Testing

- **Không có test framework.** Dùng `node:test` + `node:assert/strict` built-in.
- Test đặt cạnh code: `server/chatQuota.test.js`, `server/chatAuth.test.js`, `server/userActivityStorage.test.js`.
- Chạy: `node --test server/chatQuota.test.js server/chatAuth.test.js server/userActivityStorage.test.js`
- Lint: `npm run lint` (oxlint, config `.oxlintrc.json`).
- **Không có test cho UI.** Kiểm chứng UI bằng cách chạy `npm run dev` và thao tác thật.

**Nguyên tắc:** test mới chỉ thêm cho logic thuần (quota, auth, chuẩn hoá dữ liệu). Logic UI để kiểm bằng tay + lint.

---

## 14. Ràng buộc đã biết (đừng vô tình phá)

1. **Không đổi `EXAM_KEY_SECRET` trên production** nếu không chạy `exam:reset` — toàn bộ đề đã sinh không đọc được.
2. **Không đặt secret vào biến `VITE_*`** — Vite nhúng chúng vào bundle, ai mở web cũng đọc được.
3. **Không bỏ `applySecurityHeaders`** ở bất kỳ response nào, kể cả response lỗi.
4. **Không trả đáp án trong response `claim`.**
5. **Không xoá file đề khi lỗi là do quyền (EACCES)** — chỉ cách ly khi file thực sự hỏng.
6. **Không thêm `dist/`, `.env.local`, `dethicosan/`, `sourcedethi/`** vào git (đã có trong `.gitignore`).
7. **Không chạy nhiều instance Node** mà không đổi cơ chế rate limit / bộ đếm chat sang kho dùng chung.
8. **Không dùng `toISOString()` để tính ngày theo lịch học** — lệch múi giờ VN. Dùng `formatLocalDate` trong `src/lib/userProgress.js`.
