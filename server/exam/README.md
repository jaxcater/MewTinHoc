# Gen đề thi thử — triển khai

## Bố cục

```
/www/wwwroot/
├── mewtinhoc/        ← repo (docroot = mewtinhoc/dist)
├── sourcedethi/      ← nguồn câu hỏi (.txt ưu tiên, .json vẫn đọc được)
└── dethicosan/       ← kho đề (tự tạo, ĐỪNG phục vụ qua HTTP)
```

Không cần đặt `EXAM_DATA_ROOT`: server tự nhận 2 thư mục anh em của repo.
Local dev cũng tự nhận (`C:\Users\Jax\Documents`).

## Định dạng `sourcedethi`

Tên file và cấu trúc **giữ nguyên như cũ**, chỉ đổi đuôi `.json` → `.txt`.
Nội dung JSON y nguyên → đọc được ngay, không cần sửa gì.

Loader tự nhận 4 dạng trong cùng một file `.txt`:

1. JSON thuần — `[{...},{...}]`
2. JSON Lines — `{...}\n{...}`
3. Object nối tiếp — `{...}{...}` (không mảng, không dấu phẩy)
4. Văn bản có nhãn — `Câu hỏi: ...` / `A. ...` / `Đáp án: B`

Có cả `C5.txt` và `C5.json` → dùng `.txt`.

Đáp án chấp nhận: `"Đáp án A"`, `"A"`, `"1"`, `0..3`, `true/false`,
`"Đúng"/"Sai"`, `"TÚNG"`, `"dung"`, `"T"/"F"`.

## Sinh kho

```bash
cd /www/wwwroot/mewtinhoc
npm run exam:check      # xem đọc được bao nhiêu câu
npm run exam:reset      # xoá kho cũ, sinh lại 100 đề
```

Cron bù mỗi 10 phút:
```cron
*/10 * * * * cd /www/wwwroot/mewtinhoc && node server/exam/worker.js >> /var/log/mewtinhoc-exam.log 2>&1
```

Kho mục tiêu hiện là **100 đề**: 50 đề ICT + 50 đề CS. Worker chạy mỗi 10 phút,
tự sinh bù các đề đã được học viên rút khỏi kho và dọn session cũ.

Lệnh khác: `npm run exam:refill`, `npm run exam:simulate -- 2`, `npm run exam:loop`.

## Nếu dữ liệu mới ít câu hơn

Ma trận mong muốn: `C5=7 C1=4 C2=4 C3=2 C4=2 C6=2 C7=3` (24 câu).

Thiếu chủ đề nào thì phần thiếu được **chia sang chủ đề còn dư** — vẫn ra đề
đủ 24 câu, không sập. Chỉ báo lỗi khi *tổng* 7 chủ đề không đủ 24 câu.

Nếu thiếu cả file Đúng/Sai chung → tính năng báo `"Xin hãy đợi 10 phút sau rồi
quay lại"`, web vẫn chạy bình thường.

## Nginx (bắt buộc)

```nginx
server {
    root /www/wwwroot/mewtinhoc/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/(sourcedethi|dethicosan)/ { deny all; return 404; }

    location / { try_files $uri $uri/ /index.html; }
}
```

Kiểm tra: `curl -o /dev/null -w "%{http_code}" https://domain/dethicosan/pool/` → phải 404.

## Biến môi trường

```bash
EXAM_KEY_SECRET=<chuỗi-ngẫu-nhiên-dài>   # khuyến nghị: khoá mã hoá đáp án
EXAM_ADMIN_TOKEN=<chuỗi-bí-mật>          # tuỳ chọn: bật /api/exams/health
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
EXAM_DATA_ROOT=                          # để trống nếu giữ bố cục /www/wwwroot
```

Đổi `EXAM_KEY_SECRET` = đề cũ không đọc được → phải `npm run exam:reset`.

## Bảo vệ đáp án

| Tấn công | Phòng thủ |
|---|---|
| F12 tìm đáp án | API `claim` chỉ trả `{no, topic, stem, options}` |
| `curl` file trong `dethicosan/` | Mã hoá AES-256-GCM (magic `MTH1`) + nginx `deny all` |
| Đọc file bằng shell | Cần khoá: `EXAM_KEY_SECRET` hoặc `dethicosan/.key-secret` (chmod 600) |
| Nộp lại sau khi xem đáp án | Cờ `wx` nguyên tử → lần 2 nhận 409 |
| Spam rút đề | 30s/đề, 10 đề/ngày; khách 60s/đề, 3 đề/ngày |
| Path traversal | Regex UUID + kiểm tra `path.resolve().startsWith()` |

Static server chỉ phục vụ `dist/`; URL có đuôi file hoặc dotfile mà không tồn
tại → 404 (không trả `index.html`).

## Ma trận & thang điểm

**Phần I — 24 câu × 0,25đ = 6,0đ**

| C5 | C1 | C2 | C7 | C3 | C4 | C6 |
|---|---|---|---|---|---|---|
| 7 | 4 | 4 | 3 | 2 | 2 | 2 |

**Phần II — 2 câu chung + 2 câu theo hướng = 4,0đ**

Thang lũy tiến mỗi câu: 0 ý → 0đ · 1 → 0,1 · 2 → 0,25 · 3 → 0,5 · 4 → 1,0.

## Sự cố

| Triệu chứng | Xử lý |
|---|---|
| `503 POOL_EMPTY` liên tục | `npm run exam:check` → `npm run exam:refill` |
| `Kho câu hỏi không đủ 24 câu` | Bổ sung câu vào `sourcedethi/*.txt` |
| Mọi bản ghi bị "loại" | Xem cột "loại" trong `exam:check`; kiểm tra nhãn/định dạng |
| `Worker khác đang chạy` mãi | Xoá `dethicosan/.worker.lock` (tự hết hạn sau 5') |
| Đề không đọc được sau khi đổi khoá | `npm run exam:reset` |
| Đề lặp lại nhiều | Xoá `dethicosan/rotation.json` |

Sao lưu: chỉ cần `sourcedethi/` (kho đề sinh lại được).
