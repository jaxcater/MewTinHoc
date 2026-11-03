Single-leaf shell that wires together the rest of the app:
- `main.jsx` is the ReactDOM entry — installs a viewport-height polyfill, wraps everything in `<StrictMode>` + `<BrowserRouter basename={import.meta.env.BASE_URL}>`, then mounts `<App />`.
- `App.jsx` is the root component holding global user state (demo via `sessionStorage['tinhoc_demo_user']` vs. real Supabase Auth), tab state (`TABS.HOME|ROADMAP|EXAMS|AI_EXAM`), toast notifications, and the `<Routes>` map for `/`, `/roadmap`, `/exams`, `/ai-exam`, `/admin`. It delegates persistence to `useUserProgress` from `./lib/userProgress` and role resolution to `resolveUserRole` / `syncUserRoleToSupabase` from `./lib/roleService`.
- `supabase.js` is a thin re-export of `../lib/supabase.js`, acting as the module boundary so `App.jsx` never imports directly from `lib/`.
- `mockData.js` provides `DEFAULT_USER` used by demo login flows.
- `variants.ts` centralizes all Framer Motion configuration (easings, springs, durations, per-component variants including `pageTransitionVariants` consumed by `PageTransition`) plus a `reducedMotionVariants` fallback for `prefers-reduced-motion`.
- `index.css` supplies the global stylesheet referenced by `main.jsx`.
Dependency direction is one-way: this shell depends on `components/*`, `lib/*`, and external packages; nothing inside the shell is imported beyond the root components it owns.