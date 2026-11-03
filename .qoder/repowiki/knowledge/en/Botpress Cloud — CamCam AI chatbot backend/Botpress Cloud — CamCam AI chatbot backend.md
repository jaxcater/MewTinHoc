---
kind: external_dependency
name: Botpress Cloud — CamCam AI chatbot backend
slug: botpress-cloud
category: external_dependency
category_hints:
    - vendor_identity
    - framework_behavior
    - sdk_real_api
scope:
    - '**'
source_files:
    - server/botpressMiddleware.js
    - server/botpressService.js
---

### MewTinHoc
- Role: AI tutoring chatbot "CamCam" serving the Tin học THPTQG audience; accessed via a small Node.js proxy (`server/server.js`).
- Client SDK: `@botpress/client` is imported but the chat path instead calls Botpress Chat REST endpoints directly (`chat.botpress.cloud/{webhookId}/...`), so the SDK is not the active integration path.
- Endpoints exposed by this repo's proxy: `/status`, `/files`, `/chat`, `/reset` (and `/api/botpress/*` aliases); CORS is gated by `BOTPRESS_ALLOWED_ORIGIN`.
- Session model: in-process Map keyed by a cookie `mewtinhoc_chat_session` (UUID, HttpOnly, SameSite=Lax, Max-Age=86400) maps each student to a stable Botpress `bpUserUuid` + `conversationId` so context persists across requests.
- Fallback: when no webhook/encryption key is configured, `/chat` returns static topic-based replies (Python, SQL, Mạng máy tính, cấu trúc đề thi).
- Verify exact API/params against official Botpress Chat REST docs.