# Đấu trường MewTinHoc

## Luật đã triển khai

- Route `/arena`, đăng nhập Google; Demo chỉ xem thông báo mở khoá.
- Hai chế độ: ghép ngẫu nhiên 3 người, hoặc tạo/join phòng riêng 3 người bằng mã 8 ký tự.
- Chủ phòng rời phòng chờ thì mã hết hiệu lực; lần tạo tiếp theo có mã mới. Người chơi rời phòng chờ làm các trạng thái sẵn sàng được đặt lại. Phòng chờ mất heartbeat hơn 2 phút được giải phóng.
- Đủ 3 người và tất cả sẵn sàng mới phát cùng một đề. Có 3 giây chuẩn bị trước đồng hồ 15 phút.
- Đề gồm 18 MCQ + 2 câu đúng/sai chung, mỗi câu đúng/sai có 4 ý. Trộn chung cả 20 câu, không chia phần. Đảo phương án MCQ cùng đáp án; giữ thứ tự ý đúng/sai để bảo toàn tình huống.
- Nguồn chỉ `C1`–`C7` và `dungsaiChung` trong `sourcedethi` (ưu tiên `.txt`, dự phòng `.json`). Không đọc đúng/sai CS/ICT hoặc ngân hàng web. Trên Linux cần giữ đúng tên file `dungsaiChung`.
- Mỗi người tự chuyển câu; tiến độ tính số câu đã trả lời đủ. Đường đua biểu thị tiến độ, không biểu thị điểm/hạng tạm thời.
- MCQ đúng: 100 điểm; đúng/sai: 25 điểm mỗi ý đúng. Điểm tốc độ = `30 × tỷ lệ đúng × max(0, 1 − thời gian / 900000)`.
- Thời gian lấy lúc server nhận lựa chọn cuối cùng trừ thời điểm bắt đầu chung. Đổi lựa chọn tính lại thời gian cho cả câu; retry cùng lựa chọn giữ thời gian. Timestamp client không được dùng để tính điểm.
- Chỉ được tự nộp khi đủ 20 câu và 8 ý đúng/sai. Server tự nộp khi hết 15 phút, kể cả mất kết nối/đóng trình duyệt. Bài trống được 0 điểm.
- Nộp xong hiện màn chúc mừng/chờ. Chỉ công bố điểm, hạng sau khi cả 3 đã nộp. Không gửi đáp án đúng trong API.
- Xếp theo điểm chưa làm tròn, rồi thời điểm nộp, cuối cùng ID tài khoản để quyết định trường hợp bằng nhau tuyệt đối. Thưởng lần lượt 100/50/0 EXP. Không có mùa giải/Elo ở phiên bản này.

## Bố cục và vận hành

| Máy | Nguồn | Kho Đấu trường |
|---|---|---|
| Local | `C:\Users\Jax\Documents\sourcedethi` | `C:\Users\Jax\Documents\battle` |
| VPS | `/www/wwwroot/sourcedethi` | `/www/wwwroot/battle` |

`EXAM_DATA_ROOT=/www/wwwroot` trên VPS. Trong `battle`:

- `pool/*.dat`: mục tiêu 100 đề chờ.
- `rooms/*.dat`: snapshot trận, lựa chọn, thời điểm nhận và trạng thái trả thưởng.
- `.key-secret`: khoá AES-256-GCM riêng, phải backup cùng dữ liệu. Không đổi/xoá khoá; không dùng khoá của `dethicosan`.

Server/dev server tự bù đủ 100 đề khi khởi động và mỗi 5 phút. Khi kho cạn hoàn toàn, lần bắt đầu trận thử bù ngay. Đề đã dùng được lấy khỏi pool; các phút giữa hai lần bù có thể có dưới 100 đề. Không xoá/ghi đè kho `dethicosan`.

Chạy **một** tiến trình Node (PM2 fork, `instances: 1`), không cluster. Không chạy CLI refill đồng thời với runtime server. `npm run battle:refill` dùng để chuẩn bị kho khi server chưa chạy; `npm run battle:check` chỉ đọc nguồn. Runtime kiểm tra deadline mỗi giây và ở mỗi request; không phụ thuộc timer trình duyệt. Client poll 1,2 giây, không cần WebSocket hay cấu hình upgrade nginx.

Mỗi thao tác lưu snapshot mã hoá bằng file tạm + rename. Trận đang chơi được khôi phục sau restart và dùng deadline cũ; phòng chờ bị đóng. Kết quả giữ tối thiểu 24 giờ. Trận chưa đồng bộ EXP được giữ làm outbox và thử lại mỗi 30 giây, không tự xoá.

Nginx chỉ phục vụ `MewTinHoc/dist` và proxy `/api/` tới Node. Bổ sung quy tắc chặn các kho nếu cấu hình hiện tại chưa có:

```nginx
location ~* ^/(battle|sourcedethi|dethicosan)(/|$) {
    return 404;
}
```

Node cũng chặn `/battle`, `/sourcedethi`, `/dethicosan`. Route giao diện là `/arena` nên không xung đột. Kho `battle` phải thuộc user `www`; workflow đã tạo thư mục và cấp mode 700. Nếu copy dữ liệu có sẵn lên VPS, cấp quyền đọc/ghi các file con cho `www` trước khi khởi động.

## Kích hoạt EXP trên Supabase

1. Duyệt và chạy `docs/battle.sql` trong SQL Editor. Bản tương tự đã ghép cuối `docs/supabase-setup.sql` cho cài mới. Yêu cầu bảng `user_progress` hiện tại có `id`, `xp_total`; các trường còn lại cho phép default/NULL như luồng seed của app.
2. Cấu hình `SUPABASE_URL` và **`SUPABASE_SERVICE_ROLE_KEY`** trên server. Không đặt service role key trong biến `VITE_*`, không đưa vào trình duyệt. Workflow nhận GitHub Secret cùng tên, giữ giá trị cũ khi secret mới trống theo `write_env` hiện có.
3. Server gọi RPC `award_battle_rewards` sau khi trận kết thúc. Ledger theo `match_id` và hai lần cộng EXP cùng transaction: retry sau timeout/restart không cộng trùng.
4. Bảng ledger bật RLS, không cấp SELECT/INSERT/UPDATE cho `anon` hoặc `authenticated`. Chỉ `service_role` được gọi RPC cộng thưởng.
5. Trigger bảo vệ tổng EXP không giảm khi client cũ ghi snapshot trước lúc nhận Realtime. Các luồng XP cũ vẫn ghi từ client; đây không phải thay đổi toàn bộ cơ chế tin cậy XP của ứng dụng. Hai thao tác học đồng thời có thể vẫn mất phần tăng từ luồng cũ nếu cùng ghi tổng đã cũ; cần chuyển toàn bộ XP sang sự kiện server nếu muốn giải quyết triệt để.

Nếu chưa cấu hình SQL/secret hoặc Supabase tạm lỗi, vẫn lưu kết quả và khoản thưởng trong outbox, UI hiện **Đang chờ đồng bộ EXP**. Chỉ báo **Đã cộng** sau RPC thành công. Không có fallback cộng EXP từ client.

## API

Mọi endpoint yêu cầu Bearer token Supabase hợp lệ; không nhận `userId` từ client. Áp dụng security headers, `Cache-Control: no-store`, body tối đa 8 KiB và rate limit theo IP/user. Tên/ảnh chỉ là thông tin hiển thị; avatar chỉ nhận HTTPS Google, tên giới hạn 60 ký tự.

| Endpoint | Body | Công dụng |
|---|---|---|
| `GET /api/battle/state` | — | Snapshot phòng hiện tại, chỉ lựa chọn của chính người gọi |
| `POST /api/battle/enter` | `mode: random/private/join`, `code?`, `profile` | Ghép/tạo/join phòng |
| `POST /api/battle/ready` | `roomId`, `ready` | Sẵn sàng hoặc huỷ |
| `POST /api/battle/answer` | `roomId`, `questionId`, `value`, `revision` | Lưu lựa chọn, bỏ request cũ |
| `POST /api/battle/submit` | `roomId` | Nộp đủ bài, idempotent |
| `POST /api/battle/leave` | `roomId` | Rời phòng chờ/kết quả; trận đang chơi vẫn tiếp tục |

## Kiểm tra

```sh
npm run battle:check
npm run battle:test
npm run exam:check
npm run lint
npm run build
```

Kiểm tra thực tế bằng 3 tài khoản trước khi mở rộng: join bằng mã, sẵn sàng đồng thời, bỏ trống ý đúng/sai, mất mạng rồi tải lại, nộp đủ bài, hết hạn, Supabase timeout rồi trả thưởng lại. SQL/RPC cần được xác minh trên Supabase thật sau bước kích hoạt; các kiểm thử local dùng adapter trả thưởng kiểm soát được.

## Thiết kế

Taste: `pastel-consumer`, seed `1459196042`, giữ palette/type hiện có. Hai lựa chọn chế độ, đường đua avatar và 20 nút câu hỏi là các yếu tố nhận diện; mọi số liệu trận đến từ server. Gradient, glow, neumorphism và màn vinh danh là ngoại lệ theo yêu cầu của người dùng đối với quy tắc app-screen mặc định của skill.

Motion dùng token Emil trong `src/variants.ts`: chuyển màn 280ms, thoát 150ms; avatar chuyển bằng transform, không animate left/width. Câu hỏi đổi ngay, không chờ animation. Hiệu ứng phần thưởng chỉ chạy khi mở kết quả, hạng 1/2 có confetti lazy-load; tôn trọng reduced motion.

Kiểm tra giao diện local bằng ba phiên Chrome headless: đủ 20 lựa chọn qua UI, chặn nộp thiếu câu, màn chờ, kết quả và đổi mã phòng. Đã xem ảnh ở 1440/768/390px, không tràn ngang hoặc lỗi JavaScript. Inspector trên bản build production qua với các ngoại lệ `gradient`, `heavy-shadow`, `palette-cream`, `app-title-size` (màu/chất liệu theo brief; tiêu đề lớn chỉ ở sảnh). Ảnh và báo cáo local nằm trong `artifacts/battle/`, không commit. Xác thực/EXP trong bài kiểm tra browser dùng upstream giả lập, không dùng tài khoản Supabase thật.
