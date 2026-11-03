---
kind: external_dependency
name: Supabase — Auth & data backend
slug: supabase
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
source_files:
    - lib/supabase.js
    - src/supabase.js
---

### MewTinHoc
- Role: client-side auth / data layer for the React app.
- Integration: `lib/supabase.js` creates the Supabase client; `src/supabase.js` re-exports it. URL and publishable key come from `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`; when not set they fall back to a hard-coded project (`vxqvjffssebnuxtslghp.supabase.co`) and anon key.
- Auth shape: uses the JS SDK's anonymous/session flow (anon key exposed to the browser).
- Verify exact API/params against official docs.