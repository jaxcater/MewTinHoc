# Hướng dẫn bật "Đánh giá của AI" (Google AI Studio / Gemini)

Tính năng này nằm ở cuối màn **kết quả bài thi thử** (`/ai-exam`): sau khi nộp bài, học viên bấm
**"Phân tích bài làm bằng AI"**, web gửi log điểm yếu (gồm nguyên văn những câu đã sai) lên máy
chủ, máy chủ gọi Gemini rồi trả về nhận xét + lịch ôn cụ thể.

Khoá API **chỉ nằm trên máy chủ**, không bao giờ đi xuống trình duyệt.

---

## 1. Lấy khoá Gemini (miễn phí, ~2 phút)

1. Mở <https://aistudio.google.com/apikey>.
2. Đăng nhập bằng tài khoản Google.
3. Bấm **Create API key** → chọn một Google Cloud project (hoặc để AI Studio tự tạo project mới).
4. Copy chuỗi khoá vừa hiện.

> Khoá có thể ở hai dạng: `AIza…` (39 ký tự, dạng cũ) hoặc `AQ.Ab8…` (dạng mới của AI Studio).
> Cả hai đều dùng được — cứ dán nguyên vào `GEMINI_API_KEY`.
>
> **Model mặc định là `gemini-3.5-flash`.** Model cũ `gemini-2.5-flash` đã bị Google khoá với
> khoá API tạo mới (API trả lỗi 404 "no longer available to new users"), nên đừng đặt nó trong
> `GEMINI_MODEL`.

---

## 2. Điền khoá vào máy chủ

### 2.1. Chạy trên máy của bạn (`npm run dev`)

Tạo file `.env.local` ở thư mục gốc repo (file này đã nằm trong `.gitignore`, **không commit**):

```env
GEMINI_API_KEY=AQ.Ab8...khoá của bạn...
# Tùy chọn — bỏ trống thì mặc định là gemini-3.5-flash
GEMINI_MODEL=
```

Nếu chưa có file, copy từ mẫu:

```powershell
Copy-Item .env.example .env.local
```

Rồi mở `.env.local` sửa dòng `GEMINI_API_KEY=`.

**Khởi động lại** `npm run dev` (biến môi trường chỉ đọc 1 lần lúc khởi động).

### 2.2. Trên VPS (production)

Thêm **GitHub Secret** tại `Settings → Secrets and variables → Actions`:

| Tên secret | Giá trị |
| --- | --- |
| `GEMINI_API_KEY` | khoá vừa lấy (`AIza…` hoặc `AQ.Ab8…`) |
| `GEMINI_MODEL` | *(tùy chọn)* để trống nếu dùng mặc định `gemini-3.5-flash` |

Workflow `.github/workflows/deploy-vps.yml` sẽ tự ghi hai dòng này vào `/www/wwwroot/mewtinhoc/.env.local`
rồi `pm2 restart` ở lần deploy kế tiếp.

Nếu muốn bật ngay không đợi deploy, sửa tay trên VPS:

```bash
cd /www/wwwroot/mewtinhoc
printf 'GEMINI_API_KEY=...khoá...\n' >> .env.local
pm2 restart mewtinhoc --update-env
```

---

## 3. Kiểm tra đã bật chưa

### 3.1. Xem log khởi động

Khi chạy `npm run dev` hoặc `pm2 logs mewtinhoc`, tìm dòng:

```
[ai] Đánh giá AI: bật (model gemini-3.5-flash)
```

Nếu thấy:

```
[ai] ⚠ Chưa có GEMINI_API_KEY — nút "Đánh giá của AI" sẽ báo chưa cấu hình.
```

thì khoá chưa được nạp: kiểm tra tên biến đúng `GEMINI_API_KEY`, file đúng `.env.local` (không phải
`.env.local.txt`), và đã khởi động lại server chưa.

### 3.2. Gọi thẳng endpoint

```bash
curl http://localhost:3001/api/ai/status
```

Kết quả mong đợi:

```json
{ "ok": true, "configured": true, "model": "gemini-3.5-flash", "fallbacks": ["gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"], "hint": "" }
```

Trường `hint` sẽ nói rõ lỗi cấu hình nếu `configured` là `false` — và **không** lộ khoá.

### 3.3. Thử trên giao diện

Vào `/ai-exam` → **Gen đề & bắt đầu làm bài** → làm vài câu (cố tình sai) → **Nộp bài** → ở khối
"Đánh giá của AI" bấm **Phân tích bài làm bằng AI**. Chờ 10–25 giây.

---

## 4. Nếu chưa muốn cấu hình khoá

Giao diện vẫn dùng được, chỉ khác là không tự gọi AI. Ở khối "Đánh giá của AI" sẽ có nút
**Copy prompt**: prompt đã gồm cả chỉ dẫn hệ thống và toàn bộ log, bạn dán vào
<https://aistudio.google.com/> là nhận được đánh giá tương đương.

---

## 5. Bảng lỗi thường gặp

| Mã lỗi | Nghĩa | Cách xử lý |
| --- | --- | --- |
| `AI_NOT_CONFIGURED` | Server chưa có khoá | Làm mục 2, rồi khởi động lại server |
| `AI_BAD_KEY` | Khoá sai/đã thu hồi | Tạo khoá mới ở AI Studio, cập nhật `.env.local` |
| `AI_BAD_MODEL` | Model trong `GEMINI_MODEL` không tồn tại / đã bị Google gỡ | Để trống `GEMINI_MODEL` (dùng `gemini-3.5-flash`) |
| `AI_BUSY` | Google trả 503 cho mọi model dự phòng | Đợi ~30 giây rồi bấm "Đánh giá lại" — **không mất lượt**, log vẫn giữ nguyên |
| `AI_RATE_LIMITED` | Hết hạn mức phút/ngày | Đợi ~1 phút, hoặc đổi model rẻ hơn |
| `AI_TIMEOUT` | Google phản hồi quá 45 giây | Bấm "Đánh giá lại" |
| `AI_BLOCKED` | Bộ lọc an toàn chặn nội dung | Tạo đề khác rồi đánh giá lại |
| `TOO_FAST` | Bấm quá nhanh (chặn 15 giây/lần) | Đợi hết số giây hiện trong thông báo |
| `HOURLY_LIMIT` | Quá 12 lượt/giờ mỗi tài khoản | Đợi sang giờ mới |

---

## 6. Giới hạn đã đặt sẵn (chống đốt hạn mức)

| Lớp bảo vệ | Giá trị |
| --- | --- |
| Kích thước body | 96 KB |
| Độ dài prompt | 120 – 60.000 ký tự |
| Tài khoản đã đăng nhập | 1 lượt / 15 giây · 12 lượt / giờ |
| Khách chưa đăng nhập | 1 lượt / 45 giây · 4 lượt / giờ |
| Timeout mỗi lần gọi Google | 24 giây |
| Tổng thời gian tối đa | ~52 giây |
| Nhiệt độ model | 0.55 |

Riêng endpoint AI có giới hạn chặt hơn API gen đề. Tất cả nằm trong
`server/ai/aiMiddleware.js` (`AI_LIMIT`) và `server/ai/geminiService.js`.

**Lỗi không trừ lượt.** Khi Google trả 503/429, timeout, hay máy chủ thiếu khoá, hệ thống
**hoàn lại lượt** cho bạn — nên bấm "Đánh giá lại" ngay được, không phải đợi 15 giây và không
mất hạn mức trong giờ.

**Model dự phòng.** Google thường xuyên trả 503 theo từng model trong vài chục giây. Server bắn
model chính ngay, sau 6 giây không có phản hồi thì bắn song song model kế tiếp
(`gemini-3.1-flash-lite` → `gemini-3.6-flash` → `gemini-flash-latest`) và lấy phản hồi thành công
đầu tiên. Nhờ vậy một lần đánh giá thường mất 10–20 giây thay vì gần 1 phút.

---

## 7. Luồng dữ liệu (ai xem được gì)

```
Trình duyệt                    Máy chủ MewTinHoc                  Google
───────────                    ─────────────────                  ──────
prompt (log điểm yếu)  ──────► /api/ai/review
                                │ thêm systemInstruction
                                │ + responseSchema
                                └──────────────────────────────►  Gemini
                                                                     │
       review (JSON)   ◄────────────────────────────────────────────┘
```

- Prompt gửi đi **chỉ** gồm log lần làm đó: điểm, các chủ đề sai, nguyên văn câu hỏi đã sai, phương
  án, đáp án đúng, giải thích. Không gửi email, họ tên, hay mã học viên.
- Đánh giá AI được lưu tạm ở `localStorage` của chính học viên
  (`tinhoc_exam_ai_review_<userId>`), xoá khi tạo đề mới.
- Khoá API không có trong bundle: kiểm tra bằng cách tìm `GEMINI` trong `dist/assets/*.js` — sẽ không
  thấy gì.

---

## 8. Các file liên quan

| File | Vai trò |
| --- | --- |
| `server/envLoader.js` | Nạp `.env.local` / `.env`, không ghi đè biến của PM2 |
| `server/ai/geminiService.js` | Gọi Gemini, ép JSON theo schema, chuẩn hoá kết quả, dịch lỗi sang tiếng Việt |
| `server/ai/systemInstruction.js` | Persona gia sư + luật sư phạm (30 phút, bám số liệu, không bịa lỗi) |
| `server/ai/aiMiddleware.js` | `GET /api/ai/status`, `POST /api/ai/review`, rate limit |
| `src/lib/examLog.js` | Dựng log, `buildAiPrompt()`, `AI_SYSTEM_INSTRUCTION` |
| `src/lib/aiReviewApi.js` | Client gọi `/api/ai` (tự gắn Bearer token Supabase) |
| `src/components/exam/AiReviewPanel.jsx` | Khối UI đánh giá: idle / loading / done / error |
| `src/components/exam/ExamRoom.jsx` | Gọi API sau khi nộp, lưu đánh giá theo tài khoản |
