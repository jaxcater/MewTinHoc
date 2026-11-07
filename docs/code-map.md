# Code Map — MewTinHoc

> Bản đồ điều hướng. Trả lời câu hỏi: **"Muốn sửa feature X thì tìm ở đâu?"**
> Không copy source code. Không liệt kê mọi file nhỏ. Chỉ ghi path có thật.
> Nguồn sự thật chung: `AI_CONTEXT.md` · Kiến trúc: `docs/architecture.md`

---

## Project Structure

```
/
├── index.html                  Entry point HTML (root #root, font, script restore URL cho SPA)
├── vite.config.js              Config Vite + gắn middleware API vào dev server
├── package.json                Scripts: dev, build, lint, server, exam:*, export:roadmap
│
├── src/                        FRONTEND (React SPA)
│   ├── main.jsx                Mount React + BrowserRouter
│   ├── App.jsx                 App shell: routing, auth, toast, khoá Demo
│   ├── variants.ts             Token motion duy nhất (file TS duy nhất)
│   ├── index.css               Design system + toàn bộ style (rất lớn ~213KB)
│   ├── supabase.js             Re-export client từ lib/supabase.js
│   ├── mockData.js             User mẫu (fallback khi chưa cấu hình Supabase)
│   │
│   ├── components/             Component React theo feature
│   │   ├── exam/               Luồng làm đề (ExamRoom, GenExamTab, AiReviewPanel, ...)
│   │   ├── landing/            Trang giới thiệu + hook animation riêng
│   │   ├── motion/             Primitive animation dùng chung
│   │   └── demo/               View khi tính năng bị khoá (Demo)
│   │
│   ├── lib/                    Logic dùng chung (hook, API client, storage, utils)
│   ├── data/                   Dữ liệu tĩnh nhúng bundle
│   │   ├── roadmap/            csRoadmap.js, ictRoadmap.js, index.js
│   │   └── questions/          chuong1..7, chuongCS1..2, chuongICT1..2, index.js
│   └── assets/                 Ảnh bundler xử lý (landing/, cat-cam-*)
│
├── server/                     BACKEND (Node, node:http thuần)
│   ├── server.js               HTTP server: security → /api/* → static dist/
│   ├── envLoader.js            Nạp .env.local vào process.env
│   ├── securityHeaders.js      CSP + security headers
│   ├── botpressMiddleware.js   /api/botpress/*
│   ├── botpressService.js      Botpress Cloud client
│   ├── chatQuota.js            Hạn mức chat 5 lượt/ngày
│   ├── ai/                     Gemini: aiMiddleware, geminiService, systemInstruction
│   └── exam/                   Sinh đề: middleware, service, storage, builder,
│                               questionPool, crypto, grading, config, auth, worker
│
├── lib/supabase.js             Supabase client dùng chung (src/ + server/)
├── img/                        Ảnh import bằng đường dẫn tương đối (ngoài public/)
├── public/                     Static + PWA (manifest, favicon, 404.html, LoTrinhDayXich/)
├── LoTrinhDayXich/             JSON lộ trình xuất từ code (npm run export:roadmap)
├── scripts/exportRoadmaps.js   Xuất roadmap ra JSON
├── scripts/buildFaviconIco.cjs Sinh favicon.ico
├── docs/                       Tài liệu (context dùng chung + tài liệu vận hành)
│
├── .github/workflows/          deploy-vps.yml (VPS + PM2)
├── .agents/skills/             Skills của agent (security-audit hiện có)
│
└── AI_CONTEXT.md               Context chung (nguồn sự thật chính)
```

**Ngoài repo (production, trên VPS):** `sourcedethi/` (nguồn câu hỏi), `dethicosan/` (kho đề sinh ra), `var/chat-usage/` (bộ đếm hạn mức chat).

---

## Entry Points

| Loại | Path | Ghi chú |
|---|---|---|
| HTML | `index.html` | Mount `#root`, nạp `/src/main.jsx` |
| React | `src/main.jsx` | `createRoot` + `BrowserRouter` + `installViewportHeight()` |
| App shell | `src/App.jsx` | Định nghĩa toàn bộ `<Routes>` |
| HTTP server (prod) | `server/server.js` | `npm run server`, PORT mặc định 3001 |
| Dev server | `vite.config.js` | `npm run dev`, gắn middleware `/api/*` |
| Cron worker | `server/exam/worker.js` | `npm run exam:refill` (cron mỗi 10 phút) |
| CI deploy | `.github/workflows/deploy-vps.yml` | rsync → VPS → npm ci → build → PM2 restart |

### Route frontend (`src/App.jsx`)

| Route | Component |
|---|---|
| `/`, `/home` | `HomeTab` |
| `/roadmap`, `/roadmap/:track` | `RoadmapTab` |
| `/exams` | `ExamRepoTab` (khoá nếu Demo) |
| `/ai-exam` | `GenExamTab` (khoá nếu Demo) |
| `/admin` | `AdminPage` |
| `*` | → redirect `/` |

Điều hướng dùng **History API** (không hash). Khi đổi route nhớ cập nhật cả `Navbar` (`TABS`) và `App.jsx` (`goToTab`).

### Endpoint backend

| Endpoint | Handler | Ghi chú |
|---|---|---|
| `POST /api/exams/claim` | `server/exam/examMiddleware.js` | Trả đề **không có đáp án** |
| `POST /api/exams/submit` | `server/exam/examMiddleware.js` | Chấm điểm + trả đáp án/giải thích |
| `GET /api/exams/health` | `server/exam/examMiddleware.js` | Cần header `x-exam-admin-token`, sai → trả 404 |
| `GET /api/ai/status` | `server/ai/aiMiddleware.js` | Đã cấu hình khoá Gemini chưa |
| `POST /api/ai/review` | `server/ai/aiMiddleware.js` | Rate limit theo user/IP |
| `POST /api/botpress/chat` | `server/botpressMiddleware.js` | Hạn mức 5 lượt/ngày |
| `GET /api/botpress/status` | `server/botpressMiddleware.js` | |
| `GET /api/botpress/quota` | `server/botpressMiddleware.js` | |
| `GET /api/botpress/files` | `server/botpressMiddleware.js` | |
| `GET /api/botpress/diagnose` | `server/botpressMiddleware.js` | |
| `POST /api/botpress/reset` | `server/botpressMiddleware.js` | Reset hội thoại |

---

## Features

### Hiệu năng frontend

- `src/App.jsx` — lazy-load các màn, preload theo hover/focus ở `src/components/Navbar.jsx`; Suspense nằm trong PageTransition, có trạng thái thử lại khi tải chunk lỗi.
- `src/components/RoadmapTab.jsx` — chỉ tải `PdfDocumentViewer.jsx`/PDF.js khi mở PDF.
- `src/components/landing/usePointerParallax.js` — cập nhật transform trên từng lớp, không đổi biến CSS kế thừa của cả hero.
- `src/components/motion/HeroBannerBackground.jsx`, `hero-banner-background.css` — giữ bốn quỹ đạo sáng bằng CSS và parallax theo con trỏ; tạm dừng khi ngoài vùng nhìn thấy.
- `src/lib/useVisibleAnimations.js`, `src/components/home-performance.css` — pause/resume animation ngoài màn hình của HomeTab.
- `src/components/motion/CountUpNumber.jsx` — cập nhật nút số qua ref, giữ easing/thời lượng mà không render React mỗi frame.
- `src/lib/viewportHeight.js` — gom sự kiện viewport theo frame, chỉ ghi `--app-vh` khi chiều cao thực sự thay đổi.

### Bảo vệ ảnh giao diện

- `src/lib/useResourceProtection.js` — hook trong `src/App.jsx`: chặn menu lưu ảnh, nhấn giữ và kéo ảnh giao diện cho khách/học viên; admin được miễn. Giữ nguyên tải tài liệu kho đề, copy văn bản, ô nhập liệu và in báo cáo.
- Đây là hạn chế thao tác trên ảnh giao diện, không phải kiểm soát truy cập URL ảnh.

### 1. Lộ trình học 12 tuần (Roadmap)

```
Frontend   src/components/RoadmapTab.jsx          ← màn hình chính (file lớn, đọc theo vùng)
           src/components/StationQuizView.jsx     ← quiz tại chặng
           src/components/AdminTheoryEditor.jsx   ← soạn lý thuyết (Admin)
           src/components/PdfDocumentViewer.jsx   ← xem PDF tài liệu
           src/components/landing/LandingRoute.jsx← minh hoạ lộ trình ở trang giới thiệu
API        không có API riêng — đọc/ghi Supabase Storage trực tiếp từ client
Service    src/lib/roadmapStorage.js              ← fetchRemoteRoadmap / fetchRemoteRoadmapRaw
                                                 / saveRoadmapToSupabase / resolveStorageUrl
Data       src/data/roadmap/index.js              ← TRACK_TYPES, TRACK_INFO (fallback tĩnh)
           src/data/roadmap/{csRoadmap,ictRoadmap}.js
Storage    Supabase bucket `KhoTaiLieuTinHocThiThu`, folder `LoTrinhDayXich/`
           file: csRoadmap.json | ictRoadmap.json
Dependency → src/lib/userProgress.js (toggleLesson, completedLessons)
           → src/lib/scrollLock.js (khóa scroll khi mở modal)
           → src/lib/roleService.js (isCompanyAdmin → hiện editor)
```

**Tìm nhanh:** nội dung lộ trình tĩnh → `src/data/roadmap/`; logic tải/lưu → `src/lib/roadmapStorage.js`; UI → `RoadmapTab.jsx`.

---

### 2. Tạo đề thi thử ngẫu nhiên (Gen Exam)

```
Frontend   src/components/exam/GenExamTab.jsx   ← chọn hướng → claimExam → mở ExamRoom
           src/components/exam/ExamRoom.jsx      ← phòng thi, đếm ngược, nộp bài (file lớn)
           src/components/exam/QuestionNavigator.jsx
           src/components/exam/ExamAnswerSummary.jsx
           src/components/exam/useCountdown.js
API        POST /api/exams/claim   → server/exam/examMiddleware.js
           POST /api/exams/submit  → server/exam/examMiddleware.js
Service    server/exam/examService.js   ← requestExam (rate limit → claim → sinh bù)
                                    submitAnswers
           server/exam/storage.js        ← claimExam (rename nguyên tử pool→sessions)
                                    saveExamToPool, markSessionSubmitted, gradeSubmission
           server/exam/builder.js        ← planPartI, buildExam, shuffle
           server/exam/questionPool.js   ← loadQuestionPool (đọc sourcedethi/*.txt|.json)
           server/exam/crypto.js         ← sealJson / openJson (AES-256-GCM, magic MTH1)
           server/exam/grading.js        ← gradeExam, partIIScore, isValidAnswerPayload
           server/exam/config.js         ← PART_I_MATRIX, TOPIC_ORDER, RATE_LIMIT, SCORING, DURATION_MINUTES
           server/exam/auth.js           ← identifyCaller (Supabase token / IP khách)
           server/exam/worker.js         ← cron bù đề
Client     src/lib/examApi.js             ← claimExam(), submitExam(), EXAM_ERROR
Data       Data source: <dataRoot>/sourcedethi/*.txt|.json   (ngoài repo)
           Pool:       <dataRoot>/dethicosan/pool/           (ngoài repo, mã hoá)
           Session:    <dataRoot>/dethicosan/sessions/
           <dataRoot> = EXAM_DATA_ROOT | thư mục anh em của repo | /var/lib/mewtinhoc
Dependency → src/lib/userProgress.js (recordExamResult)
           → src/lib/examLog.js (lưu log bài làm, buildAiPrompt)
           → src/lib/examLogReport.js (báo cáo in/xuất)
```

**Ma trận đề:** Phần I 24 câu × 0,25đ (C5=7 C1=4 C2=4 C3=2 C4=2 C6=2 C7=3); Phần II 2 câu chung + 2 câu theo hướng × 4 ý; thời gian 50 phút. Nguồn: `server/exam/config.js`.

**Tìm nhanh:** "sửa câu hỏi sai/đáp án" → `server/exam/questionPool.js` + `server/exam/grading.js`; "sửa cách dựng đề" → `server/exam/builder.js`; "sửa luồng UI làm đề" → `src/components/exam/`.

---

### 3. Đánh giá của AI (Gemini)

```
Frontend   src/components/exam/AiReviewPanel.jsx   ← khối UI + cooldown
           src/components/exam/ExamRoom.jsx        ← gọi requestAiReview(buildAiPrompt(log))
API        GET  /api/ai/status   → server/ai/aiMiddleware.js
           POST /api/ai/review   → server/ai/aiMiddleware.js
Service    server/ai/geminiService.js   ← requestAiReview, geminiStatus, danh sách model fallback
           server/ai/systemInstruction.js ← AI_SYSTEM_INSTRUCTION
           server/ai/aiMiddleware.js     ← AI_LIMIT (15s/lần, 12/h; khách 45s, 4/h)
Client     src/lib/aiReviewApi.js  ← requestAiReview(), fetchAiStatus(), AI_ERROR
Data       Prompt dựng từ log bài làm: src/lib/examLog.js → buildAiPrompt()
           Log lưu: src/lib/examLog.js → saveExamLog() / saveAiReview()
Secret     GEMINI_API_KEY (chỉ ở máy chủ, KHÔNG dùng VITE_*)
```

---

### 4. Chatbot CamCam (Botpress)

```
Frontend   src/components/BotpressChatBubble.jsx   ← bubble + markdown nội tuyến
           src/components/demo/DemoLockedView.jsx   ← view khi Demo bị khoá
API        POST /api/botpress/chat   → server/botpressMiddleware.js
           GET  /api/botpress/{status,quota,files,diagnose}, POST /reset
Service    server/botpressService.js  ← processChatMessage, getBotpressConfig, resetSession
           server/chatQuota.js        ← createChatQuota (5 lượt/ngày, reset 00:00 VN)
           server/exam/auth.js        ← identifyChatCaller (dùng lại cho API exam)
State      var/chat-usage/           ← bộ đếm trên đĩa (ngoài repo, gitignored)
Dependency → src/lib/demoAccess.js   ← DEMO_FEATURE.CHAT
```

---

### 5. Đăng nhập & phân quyền

```
Frontend   src/components/LoginPage.jsx      ← form Google OAuth + điều khoản + LandingPage
           src/App.jsx                       ← onAuthStateChange, syncSupabaseAuthUser
Service    src/lib/roleService.js            ← resolveUserRole, syncUserRoleToSupabase,
                                                 fetchUserAdminStatusFromSupabase, isCompanyAdmin
Client     src/supabase.js → lib/supabase.js ← createClient (VITE_SUPABASE_*)
DB         bảng `profiles` (id, userid, username, email, is_admin, created_at)
           trigger `on_auth_user_created` tự tạo profile (is_admin=false)
Auth       Google OAuth qua Supabase Auth
Policy     profiles: select own-or-admin, insert self (is_admin=false), update admin-only
```

**Nguồn sự thật quyền Admin:** cột `is_admin` của bảng `profiles` trên Supabase. Không hardcode email, không tin cờ `isAdmin` từ client. SQL: `docs/supabase-setup.sql`.

---

### 6. Gamification: streak / mastery / XP

```
Frontend   src/components/HomeTab.jsx        ← streak card, lịch ngày học, thanh mastery
           src/components/StudyStreakReward.jsx ← animation ghi nhận ngày học sau khi nộp bài
           src/components/StreakEvolutionArt.jsx  ← hình 6 cấp streak
           src/components/motion/StreakFlameStage.jsx, MasteryBar.jsx
Service    src/lib/userProgress.js   ← useUserProgress: recordStudySubmission, updateMastery,
                                       toggleLesson, recordExamResult, simulateNextDay
           src/lib/streakEvolutions.js ← 6 cấp (0/14/30/45/60/90 ngày)
           src/lib/streakRules.js ← chỉ nhận quiz lộ trình / đề thi thử có điểm >10%
Rule       STREAK_GRACE_DAYS = 3 — nghỉ ≤2 ngày vẫn giữ chuỗi; để trống 3 ngày liên tiếp → về 0
DB        user_progress, mastery_progress, roadmap_lessons, daily_checkins
Sync      Supabase Realtime (postgres_changes) + fallback LocalStorage
```

Ngày được tính theo **giờ địa phương VN** qua `formatLocalDate` — không dùng `toISOString()`.
Streak không có nút điểm danh: nộp quiz lộ trình hoặc đề thi thử với điểm **lớn hơn 10%** để ghi nhận, tối đa 1 lần/ngày. Mốc 80% vẫn chỉ dùng để hoàn thành chủ đề lộ trình.

---

### 7. Kho đề thi thử (tài liệu PDF)

```
Frontend   src/components/ExamRepoTab.jsx      ← duyệt/tải lên/xoá tài liệu
           src/components/PdfDocumentViewer.jsx ← xem PDF trong trình duyệt
Service    src/lib/examDocsStorage.js  ← listExamDocs, uploadExamDocument,
                                         deleteExamDocument, renameExamDocument,
                                         createExamFolder, resolveDocTypes
Storage    Supabase bucket `KhoTaiLieuTinHocThiThu`, folder `DeThiThu/`
Dependency → src/lib/roleService.js (isCompanyAdmin cho quyền ghi)
```

---

### 8. Quản trị (Admin)

```
Frontend   src/components/AdminPage.jsx              ← profiles, bảng announcements, panel hoạt động
           src/components/AdminAnnouncementsPanel.jsx← CRUD thông báo
           src/components/AdminUserActivityPanel.jsx ← thống kê thời gian học
           src/components/AdminTheoryEditor.jsx      ← soạn lý thuyết trong RoadmapTab
Service    src/lib/announcementService.js ← fetch/create/toggle/delete + ANNOUNCEMENTS_SQL
           src/lib/userActivityStorage.js  ← đọc log hoạt động, summarizeActivityLogs
DB         bảng `announcements`; bucket `user-activity-logs`
```

Bảng `announcements` chưa có trong `docs/supabase-setup.sql` — SQL tạo nằm ở `ANNOUNCEMENTS_SQL` trong `src/lib/announcementService.js`.

---

### 9. Đếm thời gian học (Activity Timer)

```
Frontend   src/lib/useUserActivityTimer.js  ← lease 1 tab ghi, tick 5s, upload 30s, idle 2 phút
Service    src/lib/userActivityStorage.js  ← uploadActivityLog, fetchActivityLog, activityLogPath
Storage    bucket `user-activity-logs`, folder `log user and timer/<uid>/<ngày>/usage.json`
Test       server/userActivityStorage.test.js
```

---

### 10. Thông báo toàn trang (Announcement Banner)

```
Frontend   src/components/AnnouncementBanner.jsx  ← banner + dismiss
Service    src/lib/announcementService.js         ← fetchActiveAnnouncements
           src/lib/announcementLinks.js           ← splitAnnouncementLinks
DB         bảng `announcements` (is_active, type, is_important)
```

Tick "Không hiển thị lại" lưu trong `localStorage` (`mewtinhoc_dismissed_announcements`)
dạng map `{ id: expiresAt }` — thông báo thường ẩn 24h, thông báo QUAN TRỌNG ẩn 12h;
hết hạn thì tự hiện lại.

---

## Bảng dữ liệu (Supabase Postgres)

| Bảng | Dùng bởi | Ghi chú |
|---|---|---|
| `profiles` | `src/lib/roleService.js`, `src/components/AdminPage.jsx` | Nguồn sự thật quyền Admin |
| `user_progress` | `src/lib/userProgress.js` | streak_count, streak_last_date, total_exams, avg_score, accuracy, xp_total |
| `mastery_progress` | `src/lib/userProgress.js` | user_id, block_key, progress (0–100) |
| `roadmap_lessons` | `src/lib/userProgress.js` | user_id, track, lesson_id, completed |
| `daily_checkins` | `src/lib/userProgress.js` | user_id, checkin_date |
| `announcements` | `src/lib/announcementService.js` | SQL riêng trong `ANNOUNCEMENTS_SQL` |

## Storage bucket (Supabase)

| Bucket | Nội dung | Quyền ghi |
|---|---|---|
| `KhoTaiLieuTinHocThiThu` | `LoTrinhDayXich/*.json`, `DeThiThu/` (PDF) | Chỉ Admin |
| `user-activity-logs` | `log user and timer/<uid>/<ngày>/usage.json` | Chính user đó |

## Dữ liệu ngoài repo (VPS)

| Đường dẫn | Nội dung | Ghi |
|---|---|---|
| `<dataRoot>/sourcedethi/*.txt,.json` | Nguồn câu hỏi (4 định dạng loader chấp nhận) | Đọc |
| `<dataRoot>/dethicosan/pool/` | Kho đề mã hoá | Worker ghi |
| `<dataRoot>/dethicosan/sessions/` | Đề đang làm + cờ `.submitted` | Server ghi |
| `<dataRoot>/dethicosan/.key-secret` | Khoá mã hoá (khi không set `EXAM_KEY_SECRET`) | chmod 600 |
| `var/chat-usage/` | Bộ đếm hạn mức chat | Server ghi |

---

## Vòng đời một request (ví dụ: tạo đề)

```
GenExamTab.claimExam('ict')
  → src/lib/examApi.js  (gắn Bearer token Supabase)
    → POST /api/exams/claim
      → server/exam/examMiddleware.js
        → server/exam/auth.js        identifyCaller (token → user id, hoặc IP khách)
        → server/exam/examService.js  requestExam → checkRateLimit
          → server/exam/storage.js    claimExam (rename pool → sessions, chống double-claim)
            ↳ nếu pool cạn → generateOneExam → builder.buildExam + questionPool.loadQuestionPool
                              + crypto.sealJson (ghi file .mth1 mã hoá)
        ← trả { exam: publicExam }   ← KHÔNG có đáp án (đáp án ở keyData, chỉ ở server)
```

Khi nộp bài: `ExamRoom` → `submitExam` → `POST /api/exams/submit` → `storage.gradeSubmission` → `grading.gradeExam` → trả điểm + đáp án + giải thích → `ExamRoom` gọi `buildAiPrompt` → `POST /api/ai/review` (Gemini) → `AiReviewPanel`.
