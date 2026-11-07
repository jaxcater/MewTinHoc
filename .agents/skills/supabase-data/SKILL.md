---
name: supabase-data
description: Sửa truy cận dữ liệu Supabase của MewTinHoc — bảng Postgres (profiles, user_progress, mastery_progress, roadmap_lessons, daily_checkins, announcements), Storage bucket (KhoTaiLieuTinHocThiThu, user-activity-logs), Realtime subscription, RLS policy, hoặc quyền Admin. Dùng khi task liên quan tới tới "Supabase", "database", "bảng", "RLS", "policy", "storage bucket", "realtime", "quyền admin", "profiles", "signed URL".
---

# Dữ liệu Supabase

Skill này **bổ sung** cho `AI_CONTEXT.md` và `docs/architecture.md` — không lặp lại chúng.
Đọc `docs/architecture.md` mục **"3. Database Strategy"** để có bối cảnh đầy đủ.

## Bảng đang dùng

| Bảng | Cột chính | Đọc/ghi bởi |
|---|---|---|
| `profiles` | `id`, `userid`, `username`, `email`, `is_admin` | `src/lib/roleService.js`, `src/components/AdminPage.jsx` |
| `user_progress` | `id`, `streak_count`, `streak_last_date`, `total_exams`, `avg_score`, `accuracy`, `xp_total` | `src/lib/userProgress.js` |
| `mastery_progress` | `user_id`, `block_key`, `progress` | `src/lib/userProgress.js` |
| `roadmap_lessons` | `user_id`, `track`, `lesson_id`, `completed` | `src/lib/userProgress.js` |
| `daily_checkins` | `user_id`, `checkin_date` | `src/lib/userProgress.js` |
| `announcements` | `title`, `message`, `type`, `is_active`, `is_important` | `src/lib/announcementService.js` |

## Storage bucket

| Bucket | Nội dung | Quyền ghi |
|---|---|---|
| `KhoTaiLieuTinHocThiThu` | `LoTrinhDayXich/*.json`, `DeThiThu/` (PDF) | Chỉ Admin |
| `user-activity-logs` | `log user and timer/<uid>/<ngày>/usage.json` | Chính user đó |

Cả hai đều **private** → đọc bằng **signed URL** (`createSignedUrl`), không dùng `getPublicUrl`.
Xem `src/lib/roadmapStorage.js` (3 cách thử lần lượt: signed → download → public) và `src/lib/examDocsStorage.js`.

## Ràng buộc bất di bất dịch

1. **Nguồn sự thật quyền Admin là `profiles.is_admin`** trên server. Không tin cờ `isAdmin` từ client, không hardcode email admin trong code.
2. **Bảng mới phải có RLS.** Đặt policy: select own-or-admin, insert self (ép `is_admin = false`), update admin-only. Dùng `SECURITY DEFINER` cho hàm `is_admin_user()` để tránh infinite recursion.
3. **User mới phải mặc định `is_admin = false`.** Trigger `on_auth_user_created` tự tạo profile.
4. **Client dùng anon key** — mọi bảo mật phải đến từ RLS, không từ việc giấu key.
5. **Không đặt secret server-side vào biến `VITE_*`** — Vite nhúng thẳng vào bundle.
6. **Guard `!isDemo`** trước mọi `upsert` — tài khoản Demo không được ghi vào DB thật.

## Realtime

`src/lib/userProgress.js` subscribe `postgres_changes` trên 4 bảng, lọc theo user.
Đổi cấu trúc bảng hoặc tên cột → kiểm tra lại cả phần `select` ban đầu và phần filter của subscription.

## Fallback offline

`useUserProgress` có `dbStatus: 'checking' | 'connected' | 'fallback'`. Khi bảng chưa tạo hoặc mạng lỗi → fallback localStorage. **Luôn giữ đường fallback** khi thêm truy vấn mới.

## Ngày theo giờ VN

Dùng `formatLocalDate` / `getEffectiveDate` trong `src/lib/userProgress.js`.
**Không dùng `toISOString()`** để tính ngày học — sẽ lệch múi giờ UTC+7.

## SQL

- `docs/supabase-setup.sql` — profiles, trigger, RLS, bucket `KhoTaiLieuTinHocThiThu`, bucket `user-activity-logs`. **Idempotent, chạy lại được nhiều lần.**
- `ANNOUNCEMENTS_SQL` trong `src/lib/announcementService.js` — SQL tạo bảng `announcements` (chưa gộp vào file trên).

Khi thêm bảng/bucket/policy mới → cập nhật `docs/supabase-setup.sql` **và** SQL tương ứng trong code để hai nơi không lệch.

## Verification

Không có test cho Supabase trong repo. Verify bằng cách chạy `npm run dev`, đăng nhập và kiểm tra dữ liệu thật trên Supabase Dashboard. SQL chỉ chạy khi người dùng xác nhận.
