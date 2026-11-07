# Tối ưu frontend — 07/11/2026

Phạm vi: landing, đăng nhập, dashboard, điều hướng tới lộ trình/kho đề/tạo đề/admin, trình đọc PDF và các primitive chuyển động dùng chung. Giữ nguyên nội dung, ảnh, các animation đang có và quyền học viên/admin.

## Kết quả build

Số byte chưa nén của các tài nguyên JS/CSS được HTML khởi động tham chiếu trực tiếp, gồm module preload. Không phải tổng dung lượng của tất cả màn hình và ảnh.

| Tài nguyên ban đầu | Trước | Sau | Giảm |
|---|---:|---:|---:|
| JavaScript | 1.697.221 byte | 764.852 byte | 54,9% |
| CSS | 395.578 byte | 232.301 byte | 41,3% |

Mã của các màn chưa mở vẫn tồn tại và được tải khi cần. Không xoá tính năng để giảm dung lượng. PDF.js và worker chỉ được yêu cầu khi học viên mở PDF.

## Các thay đổi

- Tách màn hình bằng React.lazy; giữ Suspense bên trong PageTransition. Navbar tải trước khi hover/focus; không tải trước chức năng đang khoá với Demo. Giữ màn hình loading mèo hiện có; trạng thái chờ chunk dùng spinner nhẹ, tránh yêu cầu thêm ảnh loading lớn mỗi lần mở một màn.
- Bổ sung trạng thái tải lại khi tải chunk thất bại, bao gồm chat; không để lỗi một chunk làm biến mất toàn bộ giao diện.
- Parallax landing ghi transform trên từng lớp thay vì ghi biến CSS kế thừa trên cả hero. Giữ hệ số chiều sâu và các animation CSS bổ sung của từng lớp.
- Bốn đốm sáng dashboard giữ quỹ đạo, opacity, độ mờ và thời lượng; chuyển phần chạy lặp từ JS sang CSS. Parallax dashboard dùng chuỗi transform đầy đủ.
- Tạm dừng CSS animation của các vùng dashboard ngoài vùng nhìn thấy hoặc khi tab ẩn. Không unmount/reset timeline; tiếp tục khi trở lại.
- Nhịp thở/nghiêng mèo chạy trên lớp HTML bao ngoài SVG. Tai, mắt và đường nối vẫn giữ cách dựng hiện có.
- Bộ đếm giữ easing/thời lượng, số thập phân, tiền/hậu tố; cập nhật riêng nút số thay vì render React mỗi frame.
- Viewport chỉ ghi --app-vh khi chiều cao thay đổi, vẫn giữ đo visualViewport và cleanup listener.
- Giữ pinch zoom/cuộn; bổ sung touch-action cho điều khiển và cỡ chữ nhập tối thiểu 16px trên thiết bị trỏ thô để tránh Safari tự zoom khi nhập.
- Sửa thuộc tính inert dạng boolean và bỏ handler React onSelectStart không được hỗ trợ; không bỏ hiệu ứng hình ảnh.
- Bật minify CSS; giữ thứ tự stylesheet và nội dung quy tắc.

## Đã kiểm tra

- npm run lint và npm run build thành công. Các cảnh báo đã có của dự án/dependency vẫn còn.
- 77 kiểm tra tương tác trong trình duyệt: câu hỏi mẫu landing, chọn hướng bằng chuột/bàn phím, CTA, parallax, bộ đếm/đổi giá trị, trợ giúp streak, đủ glyph và lớp sáng, pause/resume khi cuộn, reduced motion và viewport cleanup.
- 17 kiểm tra bản production: landing → đăng nhập Demo → Home → Roadmap → Home, mã chưa dùng không được tải sớm, trạng thái thử lại khi cố ý chặn chunk. Bộ dò DevTools vốn có phản ứng với console của trình điều khiển CDP, nên bài thử có cô lập console trong trình duyệt thử; không sửa hay vô hiệu hoá bộ dò trong mã sản phẩm.
- Mở tài liệu qua Roadmap thật với phản hồi PDF giả lập: lazy chunk, worker và canvas render được ở 1440px và 390px. Không tải tài liệu riêng tư hay gọi dịch vụ trả phí để kiểm tra.
- Kiểm tra responsive landing/Home ở 320, 390, 768, 1024, 1440 và 1920px; không thấy tràn ngang trong các trường hợp đã thử.
- Đối chiếu ảnh trước/sau, danh sách ảnh, glyph và tên animation; không loại bỏ các animation có sẵn. Đo thử với CPU throttling 4x để quan sát tải, không dùng kết quả headless để cam kết FPS trên mọi máy.

## Giới hạn xác minh

Chưa đo trên điện thoại vật lý hoặc Safari iOS thật; chưa kiểm thử OAuth Google, phản hồi chatbot/Gemini và dữ liệu Supabase thật trong đợt này. Backend, quota, chấm điểm, auth/RLS và quyền tải tài liệu không thay đổi. Cần kiểm tra thêm trên thiết bị thật để xác nhận cảm giác cuộn, bàn phím, thanh địa chỉ và FPS thực tế.
