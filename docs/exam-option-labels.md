# Lỗi lặp nhãn phương án trong đề thi

## Nguyên nhân

Ảnh cho thấy hai nhãn trên cùng một phương án: huy hiệu `A` của giao diện và
`C:` nằm trong nội dung `C: border-style / color`. Đây là nhãn cũ còn sót lại
sau khi đảo phương án.

Luồng gây lỗi:

1. Nguồn cũ lưu phương án dạng `A: nội dung`, `B: nội dung`…
2. `server/exam/questionPool.js:stripOptionPrefix` trước đây chỉ bỏ `A.` và `A)`,
   nên giữ nguyên các nhãn có dấu hai chấm. Nhánh phương án dạng object còn
   bỏ qua bước làm sạch nhãn.
3. `server/exam/builder.js:shuffleOptions` đảo phương án và tính lại chỉ số đáp
   án, nhưng nhãn nằm trong chuỗi cũng bị mang theo.
4. `src/components/exam/ExamRoom.jsx` gắn huy hiệu A/B/C/D theo vị trí mới.
   Kết quả có thể là `A C: ...`, `B D: ...`, hoặc `A A: ...` như người dùng mô tả.

Không cần đổi thuật toán đảo phương án: chỉ số đáp án phải tiếp tục đi theo
nội dung sau khi đảo. Không được dùng chữ cái còn sót trong chuỗi để chấm bài.

## Dữ liệu đã đối chiếu

| Nguồn | Câu trắc nghiệm | Câu có nhãn `A:`/`B:`… |
|---|---:|---:|
| `C:\Users\Jax\Downloads\sourcedethi-vps\sourcedethi.zip` | 1.750 | 0 |
| Bản cũ tại `C:\Users\Jax\Documents\sourcedethi` | 350 | 350 |

ZIP có 250 câu trong mỗi file C1–C7 và 240 tình huống trong mỗi file
`dungsaiChung.json`, `dungsaiCS.json`, `dungsaiICT.json` (720 tình huống đúng/sai).
Loader đọc được toàn bộ 2.470 bản ghi, không loại bản ghi vì sai định dạng.

Trước khi sửa, nạp bản nguồn cũ cùng ngân hàng của web cho ra 331 câu còn nhãn
dấu hai chấm sau bước loại câu trùng. Bản ZIP đã sạch nhãn nên không cần sửa lại
các file trong ZIP để xử lý lỗi này.

Chưa kiểm tra trực tiếp filesystem/process đang chạy trên VPS. Nếu VPS đã dùng
đúng ZIP này mà ảnh vẫn có nhãn cũ, cần kiểm tra đề đã sinh trong `dethicosan/`,
cache câu hỏi của tiến trình Node và file `.txt` cũ: loader ưu tiên `.txt` hơn
`.json` khi hai file cùng tên tồn tại.

## Bản sửa

- `questionPool.js`: bỏ cả nhãn `A:`, `A：`, `A.`, `A)` cho phương án chuỗi và
  object; hỗ trợ dấu hai chấm trong nguồn văn bản có nhãn. Giữ đường dẫn như
  `C:\Users\file.txt`, `D:/data/file.txt` và nội dung số `0`.
- `storage.js`: làm sạch phương án của đề cũ khi đọc pool/session, bao gồm
  file mã hoá và JSON cũ. Chỉ đổi text trong RAM; không đổi thứ tự phương án
  hay `keyData`. Đề cũ không cần reset để nhận bản sửa này.
- API claim tiếp tục chỉ trả đề công khai, không chứa đáp án.

## Kiểm chứng

- `node --test server/exam/optionLabels.test.js`: 8/8 kiểm thử đạt, bao gồm
  chặn deploy khi nguồn hỏng hoặc `.txt` che `.json`.
- `npm run exam:check`: đạt với bản sao cô lập của cả ZIP mới và nguồn cũ.
- Sinh thử ICT và CS từ cả hai nguồn: mỗi đề đủ 24 câu trắc nghiệm và 4 câu
  đúng/sai; nội dung đáp án đúng vẫn khớp sau khi đảo; bài trả lời đúng toàn bộ
  đạt 10/10. Không còn nhãn phương án thừa trong pool câu hỏi đã nạp.
- `npm run lint`: thành công, có cảnh báo ở các file ngoài bản sửa.
- `npm run build`: thành công; cú pháp Bash của script deploy hợp lệ.

## Áp dụng trên VPS

Giải nén ZIP tại `/www/wwwroot` để có bố cục:

```text
/www/wwwroot/
├── MewTinHoc/          # Code web, nginx phục vụ MewTinHoc/dist/
├── sourcedethi/        # C1.json … C7.json và ba file dungsai*.json
└── dethicosan/         # Kho đề hiện có và khoá mã hoá
```

Nếu upload bằng root, cấp quyền đọc nguồn cho user chạy web:

```bash
chown -R www:www /www/wwwroot/sourcedethi
find /www/wwwroot/sourcedethi -type d -exec chmod 750 {} \;
find /www/wwwroot/sourcedethi -type f -exec chmod 640 {} \;
```

Push code lên `main` kích hoạt workflow: chạy 8 kiểm thử pipeline trước khi
đồng bộ code; cố định `EXAM_DATA_ROOT=/www/wwwroot`; kiểm tra nguồn và quyền
kho đề bằng user `www` trước khi thay `dist` và restart PM2. File nguồn thiếu,
không đọc được, sai định dạng hoặc trùng tên `.txt`/`.json` làm job thất bại.
Thông báo lỗi chỉ rõ file cần sửa. Hai thư mục dữ liệu được exclude khỏi rsync.

`sourcedethi` được upload riêng; Git không mang theo ngân hàng câu hỏi này.
Nếu worker chạy liên tục bằng `exam:loop`, khởi động lại worker đó để nạp code
mới. Với worker chạy cron từng lượt, lượt chạy tiếp theo dùng code mới.

Có thể chạy lại đúng phép kiểm tra của workflow bằng user `www`, từ thư mục repo:

```bash
EXAM_DATA_ROOT=/www/wwwroot npm run exam:check -- --strict
```

Đối chiếu đường dẫn nguồn thực tế cùng số bản ghi nạp được. ZIP đã kiểm tra
phải hiện 250 bản ghi cho mỗi file C1–C7 và 240 cho mỗi file đúng/sai. Sau đó tạo
đề mới trên web để kiểm tra mỗi phương án chỉ có một huy hiệu A/B/C/D.

Không cần đổi `EXAM_KEY_SECRET` hay chạy `exam:reset` cho bản sửa nhãn. Đề đã
mở trong trình duyệt trước lúc deploy giữ bản dữ liệu đã nhận cho tới khi nhận
phản hồi mới từ server.
