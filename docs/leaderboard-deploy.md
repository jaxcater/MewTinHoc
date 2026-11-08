# Triển khai Bảng thành tích

Chức năng nằm ở `/leaderboard`, dùng EXP toàn thời gian đã lưu trong `public.user_progress.xp_total`. UI giữ font MewTinHoc, dùng bề mặt nổi mềm, gradient và ánh cam–nâu–vàng theo yêu cầu thiết kế. Khối “Dấu ấn Mew” đặt hạng 1 ở giữa trên desktop, hạng 2–3 ở hai bên, hạng 4–5 gọn hơn. Giữ kiểu cúp/khiên/kim cương/ngôi sao của bộ cũ, xóa mèo phía trên; không có khối bộ sưu tập. Animation vinh danh chỉ chuyển động transform/opacity, easing và thời lượng từ `src/variants.ts`, hỗ trợ reduced motion. Không thêm dependency.

## Bước bắt buộc trên Supabase

1. Kiểm tra database đang có `public.profiles` (`id`, `username`) và `public.user_progress` (`id`, `xp_total`). `id` là UUID duy nhất của học viên; `xp_total` là số nguyên EXP. Đây là các bảng app đang dùng, không tạo bảng tiến độ mới từ chức năng này.
2. Trong Supabase Dashboard → SQL Editor, duyệt rồi chạy **`docs/leaderboard.sql`**. File chỉ tạo/cập nhật RPC và quyền gọi, không sửa EXP, không đổi RLS hiện có. Có transaction và chạy lại được. Bản giống hệt nằm cuối `docs/supabase-setup.sql` cho lần thiết lập đầy đủ. **Cần chạy lại SQL khi cập nhật bản có avatar Google**: RPC cũ chưa trả `avatar_url`, nên chỉ cập nhật frontend sẽ chưa hiển thị được ảnh của các học viên khác.
3. Đăng nhập hai tài khoản Google có EXP khác nhau. Kiểm tra người nhiều EXP hơn đứng trên, vị trí cá nhân khớp, tài khoản 0 EXP chưa có hạng. Kiểm tra với học viên thường, không chỉ admin.
4. Kiểm tra metadata quyền trong SQL Editor:

```sql
SELECT
  has_function_privilege('anon', 'public.get_exp_leaderboard(integer,integer)', 'EXECUTE') AS anon_must_be_false,
  has_function_privilege('authenticated', 'public.get_exp_leaderboard(integer,integer)', 'EXECUTE') AS authenticated_must_be_true;
```

5. Dùng truy vấn chỉ đọc sau để đối chiếu danh sách toàn cục trong SQL Editor (không đưa email vào ảnh chụp/log chia sẻ):

```sql
SELECT p.id, u.xp_total,
  RANK() OVER (ORDER BY u.xp_total DESC) AS expected_rank
FROM public.profiles p
JOIN public.user_progress u ON u.id = p.id
WHERE u.xp_total > 0
ORDER BY u.xp_total DESC, p.id ASC
LIMIT 50;
```

RPC chỉ cấp EXECUTE cho `authenticated`, vẫn kiểm tra `auth.uid()` bên trong. `SECURITY DEFINER` chỉ phục vụ phép đọc có kiểm soát qua RLS; khóa `search_path`, không SQL động, không tham số userId, không trả email, `is_admin` hay toàn bộ hồ sơ/metadata Auth. Chỉ lấy thêm URL avatar HTTPS thuộc `googleusercontent.com` từ `auth.users.raw_user_meta_data` (`avatar_url`/`picture`), dự phòng bằng identity Google khi metadata thiếu. Không cấp SELECT bảng Auth hoặc toàn bộ bảng hồ sơ cho học viên chỉ để chạy bảng thành tích. Thiết kế quyền theo [hướng dẫn Database Functions của Supabase](https://supabase.com/docs/guides/database/functions); nguồn metadata theo [hướng dẫn quản lý người dùng](https://supabase.com/docs/guides/auth/managing-user-data).

## Trên VPS

- **Không cần biến môi trường mới**, service-role key, cổng, cron, Redis hoặc cấu hình PM2 mới.
- Giữ cấu hình Supabase client hiện có: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Chúng là URL và khóa công khai; không dùng secret/service-role key ở `VITE_*`.
- Deploy theo workflow hiện có: cài dependency từ lockfile, `npm run build`, restart tiến trình hiện tại. Không đổi `EXAM_KEY_SECRET`.
- Nginx phải có SPA fallback đã dùng bởi các route khác: `try_files $uri $uri/ /index.html;`. Sau deploy kiểm tra mở trực tiếp `/leaderboard` và F5 vẫn vào được app; chưa đăng nhập sẽ về màn đăng nhập chung.
- Trình duyệt gọi RPC Supabase trực tiếp bằng phiên Auth hiện có. Không thêm endpoint `/api` trên Node; CSP đã cho Supabase phục vụ các chức năng hiện tại.
- Ảnh huy hiệu được Vite đóng gói, hash tên trong `dist/assets/`; deploy toàn bộ `dist`, tránh chỉ copy JS/CSS.
- Huy hiệu dùng vùng cắt SVG riêng theo ranh giới từng hình trong atlas; không chia đều ảnh thành 5 cột. Avatar Google hiển thị ở danh sách và thẻ top; chữ cái đầu dự phòng khi thiếu ảnh hoặc tải ảnh lỗi, không thay bằng ảnh từ dịch vụ tạo avatar khác.

Nên chạy SQL trước khi deploy UI. Nếu chưa cài SQL, trang báo đang chuẩn bị và cho thử lại; chức năng học/thi vẫn hoạt động như trước. SQL chưa được áp dụng lên database thật trong lượt triển khai code này.

## Quy tắc và vận hành

- EXP giảm dần; `RANK()` chỉ xét EXP. Đồng EXP cùng hạng (1, 1, 3); UUID tăng dần chỉ ổn định thứ tự trong nhóm. Cách tính theo [PostgreSQL Window Functions](https://www.postgresql.org/docs/current/functions-window.html).
- Chỉ hồ sơ có EXP > 0 được xếp hạng. Top 5 là tối đa 5 học viên đầu theo thứ tự trên; đồng điểm có thể nhận cùng huy hiệu, không ép đủ 5 thứ hạng.
- Danh sách, top 5, tổng học viên, vị trí cá nhân và mức EXP kế tiếp lấy trong cùng một snapshot database. Frontend luôn gửi `p_limit = 10`: mỗi trang tối đa 10 học viên, có nút trước/sau và số trang; nếu số người giảm, trang cuối được tự điều chỉnh về trang hợp lệ. RPC hiện có đã hỗ trợ tham số này, nên bản chỉnh giao diện không cần chạy lại SQL hay đổi cấu hình VPS; giá trị mặc định 20 trong định nghĩa RPC không được dùng bởi frontend.
- Chỉ dùng dữ liệu đã ghi vào Supabase. Demo không gọi RPC; mô phỏng/offline không tự tạo vị trí trên bảng thật. Thời gian cập nhật hiển thị theo giờ VN.
- Poll 60 giây khi trang đang hiển thị; không đăng ký Realtime toàn bộ hồ sơ. Không request nền khi tab ẩn. Người dùng có nút làm mới, request timeout 12 giây, SQL timeout 5 giây. Request cũ bị hủy khi đổi trang/rời màn; dữ liệu của tài khoản trước bị ẩn khi đổi tài khoản.
- Khi mất mạng sau một lần tải thành công, giữ snapshot trong bộ nhớ và báo kết nối gián đoạn. Không hiển thị dữ liệu giả, không lưu bảng người dùng khác vào LocalStorage. Khi refresh lỗi, thời gian vẫn chỉ lần tải thành công cuối.
- Việc xếp hạng tính trên toàn bộ tập học viên trước khi phân trang. Không tính hạng từ một trang tải về. Với cộng đồng rất lớn, cần đo truy vấn thực tế và ngân sách Supabase trước khi tăng tần suất cập nhật.

## Giới hạn nguồn EXP hiện tại

`src/lib/userProgress.js` hiện cộng EXP ở client và ghi `xp_total` qua quyền ghi tiến độ của học viên. Bảng thành tích mới đọc đúng dữ liệu đó, **chưa phải cơ chế chống gian lận EXP**: nếu quyền hiện tại cho phép học viên ghi `xp_total`, người dùng kỹ thuật có thể gửi giá trị khác qua API. Đọc RPC an toàn không thay thế việc xác minh nguồn điểm.

Không tự thay cách chấm quiz/đề thi hoặc khóa quyền ghi EXP trong thay đổi này vì sẽ ảnh hưởng các luồng học hiện có. Trước khi dùng bảng cho giải thưởng có giá trị hoặc thi đua cần chống gian lận, cần một đợt riêng: ledger EXP do server cấp, xác minh kết quả, chống nhận thưởng lặp và migrate điểm cũ có kiểm tra. Đây là giới hạn cần biết khi vận hành, không nên tuyên bố điểm hiện có đã được server xác thực.

## Kiểm chứng và hoàn tác

Chạy `npm run lint`, `npm run build`, `node --test server/leaderboard.test.js`. Kiểm tra UI bằng Chrome tại 1440px, 768px, 390px; bao gồm đồng điểm, tên dài, EXP lớn, 2 học viên, rỗng, đang tải, mất mạng, thiếu RPC, hết phiên, Demo, phân trang, giữ snapshot khi lỗi và reduced motion. Dữ liệu mô phỏng để kiểm tra nằm trong `.taste-skill/` bị gitignore, không nằm trong entry build production.

Kiểm tra SQL thực tế và RLS cần thực hiện trên Supabase sau bước duyệt/chạy SQL; kiểm tra frontend với fixture không chứng minh truy vấn database đã chạy thành công trên production.

Bản sửa avatar/vùng cắt huy hiệu: 10 bài test Node đạt, lint và build thành công (còn cảnh báo sẵn có). Chrome đã kiểm tra 1440px, 768px, 390px và 320px với phản hồi ảnh Google mô phỏng: ảnh tải thành công, ảnh lỗi chuyển về chữ cái đầu, đủ 5 vùng huy hiệu và không tràn ngang. Chưa chạy RPC cập nhật trên Supabase thật; cần áp dụng lại SQL và đối chiếu ảnh bằng tài khoản Google thật.

Trong phiên triển khai: 8 bài test Node đạt; lint và build thành công (repo vẫn có cảnh báo cũ). Trường hợp 29 học viên đã kiểm tra đủ ba trang 10/10/9 hàng, hạng toàn cục và nút sang/lùi trang. Chrome đã kiểm tra desktop/tablet/mobile, trạng thái lỗi, Demo, reduced motion; timeout request treo được kiểm tra đến khi báo lỗi và bật lại nút thử lại. Kiểm tra riêng thứ bậc thẻ: cúp và thẻ hạng 3 lớn hơn hạng 4, giữ huy hiệu hạng 4 đẹp theo phong cách cũ. Inspector cho phép gradient, shadow, heavy-shadow và button-fx đúng yêu cầu neumorphism/glow của người dùng; không còn FAIL về tương phản, tràn khung hay mất nội dung. Giữ nền kem theo thương hiệu, nhãn sẵn có trong navbar và cột cá nhân ngắn hơn danh sách vì chúng có chức năng khác nhau. Tên/EXP trong fixture chỉ dùng để kiểm tra, không được đưa vào production.

Nếu cần hoàn tác, rollback frontend về bản trước và chạy `DROP FUNCTION IF EXISTS public.get_exp_leaderboard(integer, integer);` trong SQL Editor sau khi duyệt. Không xóa/sửa bảng tiến độ hoặc EXP.
