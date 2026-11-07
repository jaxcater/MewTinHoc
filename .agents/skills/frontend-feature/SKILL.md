---
name: frontend-feature
description: Sửa giao diện React của MewTinHoc — component trong src/components/, route trong src/App.jsx, hook trong src/lib/, style trong src/index.css hoặc CSS cạnh component, animation framer-motion trong src/variants.ts. Dùng khi task liên quan tới "UI", "component", "giao diện", "tab", "trang", "responsive", "animation", "dark mode", "landing page", "thêm route".
---

# Sửa giao diện React

Skill này **bổ sung** cho `AI_CONTEXT.md` và `docs/code-map.md` — không lặp lại chúng.
Đọc `docs/code-map.md` mục **"Project Structure"** và **"Entry Points"** để có bản đồ.

## Vị trí file — đặt đúng chỗ

| Loại | Đặt ở | Quy tắc |
|---|---|---|
| Component theo feature | `src/components/<Tên>.jsx` | PascalCase, **không** dùng hậu tố `.component.jsx` |
| Component của luồng đề | `src/components/exam/` | |
| Component của landing | `src/components/landing/` | |
| Primitive animation | `src/components/motion/` | Dùng lại thay vì viết mới |
| View khi bị khoá (Demo) | `src/components/demo/` | Nội dung text gom vào `DEMO_LOCKED_CONTENT` |
| Logic dùng chung | `src/lib/` | `useXxx` cho hook, tên file camelCase |
| CSS của component | Cùng tên, cạnh component | `exam-room.css`, `gen-exam.css`, `demo-gate.css`... |
| CSS nền tảng | `src/index.css` | Chỉ khi là thiết kế system dùng chung |
| Dữ liệu tĩnh | `src/data/` | Roadmap + ngân hàng câu hỏi |

## Style

- Biến CSS là nguồn sự thật cho màu/size/khoảng cách. Đọc `src/index.css` phần `:root` trước khi hardcode màu.
- **Không hardcode lại easing/spring/animation config** — dùng token từ `src/variants.ts` (`EASINGS`, `SPRINGS`, `pageTransitionVariants`, `reducedMotionVariants`, `headerMotionVariants`).
- Font: Plus Jakarta Sans (UI) · JetBrains Mono (code) · Bricolage Grotesque (display).

## Animation

1. **Luôn tôn trọng `useReducedMotion()`** — có sẵn `reducedMotionVariants` cho việc này.
2. Chỉ animate `transform` và `opacity` (composite-only). Tránh `width`/`height`/`top`/`left`.
3. Dùng `AnimatePresence` cho exit animation (`mode="wait"` khi chuyển trang).
4. Component có nhiều animation dùng `variants` + `stagger` thay vì `transition` lặp lại.

## Thêm / đổi route

Cập nhật **cả 3 nơi** — thiếu một chỗ là tab hoặc link hỏng:

1. `src/App.jsx` → `<Routes>` (thêm `<Route>`) và `goToTab` (ánh xạ TABS → path)
2. `src/components/Navbar.jsx` → hằng `TABS` và `fallbackPaths`
3. Nếu là tính năng bị khoá với Demo → `src/lib/demoAccess.js` (`DEMO_FEATURE`, `isLockedForDemo`, `featureFromPath`)

## State

- UI cục bộ → `useState` trong component.
- State dùng chung >3 chỗ và là nghiệp vụ → đưa vào `src/lib/` dạng hook/service.
- Toast **không tự tạo** — dùng callback từ `App.jsx`.
- Dữ liệu người dùng → `src/lib/userProgress.js` (không tự gọi Supabase ở component).

## Ngôn ngữ

Toàn bộ UI và comment là **tiếng Việt**. Giữ nguyên khi sửa. Text hiển thị cho người dùng cuối: viết rõ, hướng dẫn hành động tiếp theo.

## Verification

```bash
npm run lint
npm run dev    # mở trình duyệt kiểm tra thật — repo không có test UI
```

Kiểm tra responsive ở cả mobile và desktop. Repo không có test cho UI: **phải xem bằng mắt**.
