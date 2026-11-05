# Chặn DevTools

- Cả localhost (`npm run dev`) và bản production dùng `disable-devtool` qua npm, đóng gói cùng ứng dụng; tham khảo https://gist.github.com/aravindanve/3e13d995fac35e4a07c236b11cc432c7 và tài liệu https://github.com/theajack/disable-devtool.
- Áp dụng cho tài khoản thường và demo sau khi đăng nhập. Trang đăng nhập vẫn truy cập được để admin có thể đăng nhập khi DevTools đang mở.
- Admin theo quyền hồ sơ hiện tại được miễn chặn. Đăng xuất hoặc đổi quyền cập nhật trạng thái chặn; không dùng khóa URL bí mật để miễn chặn.
- Chặn menu chuột phải và phím tắt DevTools. Khi phát hiện DevTools mở qua menu trình duyệt, hiện thông báo yêu cầu đóng; tự trở lại khi phát hiện đã đóng. Không chuyển hướng ra trang ngoài.
- Giữ chức năng chọn/copy/cut/paste. Không dùng detector kích thước cửa sổ hoặc `debugger`. Khi phát triển cần dùng tài khoản admin để mở DevTools.
- Đây là rào cản giao diện có thể bị vượt qua, không thay thế xác thực/phân quyền API. Miễn hạn mức chat được xác minh riêng ở máy chủ bằng token và `profiles.is_admin`, không dùng cờ admin do trình duyệt gửi.
