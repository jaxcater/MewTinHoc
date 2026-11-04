# Hạn mức chat CamCam

- Mỗi tin nhắn hợp lệ gửi tới /api/botpress/chat tính một lượt, tối đa 5 lượt/ngày. Phản hồi dự phòng cũng tính lượt.
- Tài khoản được xác thực bằng token Supabase; khách chưa đăng nhập dùng hạn mức theo IP. Không tin userId trong body.
- Đặt lại lúc 00:00 theo giờ Việt Nam (UTC+7). Làm mới hội thoại không xóa hạn mức.
- Trạng thái lưu trong var/chat-usage/ (đã gitignore), giữ nguyên qua lần khởi động lại máy chủ. Có thể đặt CHAT_USAGE_DIR sang thư mục dữ liệu bền vững ngoài checkout khi triển khai.
- Cơ chế tệp đồng bộ này dành cho một tiến trình Node, giống cấu hình giới hạn đề thi hiện tại. Nếu chạy nhiều worker hoặc nhiều máy chủ, chuyển bộ đếm sang kho dữ liệu có cập nhật nguyên tử dùng chung.
- Kiểm tra: node --test server/chatQuota.test.js.
