---
name: exam-pipeline
description: Sửa logic tính năng tạo đề thi thử (sinh đề, ma trận, chấm điểm, mã hoá đáp án, kho đề) trong server/exam/ và luồng làm đề ở src/components/exam/. Dùng khi task liên quan tới "gen đề", "sinh đề", "ma trận đề", "chấm điểm", "kho đề", "đáp án", "pool", "claim/submit exam", "POOL_EMPTY", "mã hoá đề".
---

# Tính năng Gen đề thi thử

Skill này **bổ sung** cho `AI_CONTEXT.md` và `docs/code-map.md` — không lặp lại chúng.
Đọc `docs/code-map.md` mục **"2. Tạo đề thi thử ngẫu nhiên"** để có bản đồ đầy đủ.

## Luồng (theo thứ tự thời gian)

```
claim  → server/exam/examService.js:requestExam
          ├─ checkRateLimit        (config.js: RATE_LIMIT)
          ├─ storage.js:claimExam  (rename pool → sessions, chống double-claim)
          └─ nếu pool cạn → examService.js:generateOneExam
                ├─ questionPool.js:loadQuestionPool   (đọc sourcedethi/*.txt|.json)
                ├─ builder.js:planPartI + buildExam   (ma trận, shuffle, xoay vòng)
                └─ crypto.js:sealJson                (AES-256-GCM → pool/*.dat)

submit → examMiddleware.js → storage.js:gradeSubmission
          └─ grading.js:gradeExam + isValidAnswerPayload
```

## Ràng buộc bất di bất dịch

1. **API `claim` không bao giờ trả đáp án.** Response là `publicExam` = `{examId, track, durationMinutes, partI[], partII[]}`. Mỗi câu Phần I chỉ có `{no, topic, stem, options}`; Phần II chỉ có `{no, scenario, statements[{key, text}]}`. Đáp án nằm ở `keyData` — chỉ ở trên server. Kiểm tra lại trước khi sửa `builder.js:publicExam` hoặc `storage.js:claimExam`.
2. **Đáp án trên đĩa luôn mã hoá.** Ghi bằng `crypto.js:sealJson` / `sealJsonToFile`, không ghi JSON thô.
3. **Không bao giờ xoá file đề khi lỗi là do quyền (EACCES/EPERM)** — chỉ cảnh báo. Cách ly nhầm sẽ xoá sạch kho.
4. **`keyHealthCheck() === 'bad-key'` → dừng claim**, không phải xoá đề.
5. **Không đổi `EXAM_KEY_SECRET` trên production** trừ khi chạy `npm run exam:reset`. Đổi khoá ⇒ toàn bộ đề cũ không giải mã được.
6. **Chỉ 1 đề được chấm 1 lần** — cờ `.submitted` ghi bằng `wx` (exclusive) nguyên tử.
7. **Không trả về số lượng đề còn lại** trong response — yêu cầu ẩn tình hình kho.

## Hằng số nghiệp vụ — nơi định nghĩa và nơi dùng

| Hằng | Định nghĩa | Dùng ở |
|---|---|---|
| `PART_I_MATRIX`, `TOPIC_ORDER` | `server/exam/config.js` | `builder.js:planPartI` |
| `PART_I_TOTAL`, `PART_II_TOTAL` | `server/exam/config.js` | `builder.js`, `grading.js` |
| `DURATION_MINUTES` | `server/exam/config.js` | UI đếm ngược (`src/components/exam/useCountdown.js`) |
| `RATE_LIMIT` | `server/exam/config.js` | `examService.js:checkRateLimit` |
| `SCORING` | `server/exam/config.js` | `grading.js:partIIScore` |
| `POOL_TARGET` | `server/exam/config.js` | `worker.js`, `storage.js` |

**Đổi hằng ở `config.js` → kiểm tra cả nơi dùng.** Đây là nguồn sự thật duy nhất.

## Định dạng nguồn câu hỏi

`sourcedethi/*.txt|.json` ngoài repo. Loader (`questionPool.js`) chấp nhận 4 dạng trong một file:
JSON thuần · JSON Lines · Object nối tiếp · Văn bản có nhãn (`Câu hỏi:` / `A.` / `Đáp án: B`).

Đáp án chấp nhận: `"Đáp án A"`, `"A"`, `"1"`, `0..3`, `true/false`, `"Đúng"/"Sai"`, `"TÚNG"`, `"dung"`, `"T"/"F"`.

Khi đổi logic parse → chạy `npm run exam:check` để xem còn đọc được bao nhiêu câu.

## Verification

```bash
npm run exam:check     # đọc kho, in số câu đọc được — KHÔNG ghi đĩa
npm run exam:simulate # dựng thử 1 đề, in cấu trúc
npm run lint
```

`exam:check` là lệnh an toàn để verify. `exam:reset` **xoá kho** — chỉ dùng khi được yêu cầu tường minh.

## Khi sửa `server/exam/*`

Kiểm tra các nơi đang import module bạn sửa:
`examMiddleware.js` → `examService.js` → `storage.js` / `builder.js` / `grading.js` / `crypto.js` → `config.js` / `questionPool.js`.
