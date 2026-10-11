# Nhật ký triển khai và đầu vào cho báo cáo

## 11/10/2026 — Bắt đầu P0.1

### Trạng thái trước thay đổi

- Repository chỉ có tài liệu bối cảnh, kế hoạch và tài liệu học tập.
- Chưa có mã nguồn, Compose, cấu hình Nginx hoặc kết quả kiểm thử sản phẩm.
- Máy phát triển là macOS ARM64, chạy Docker qua OrbStack.

### Quyết định trong ngày

- P0.1 chỉ gồm hai ứng dụng mẫu, Nginx Gateway, mạng Docker, health check, giới hạn tài nguyên, kiểm thử nhanh và hướng dẫn chạy.
- Dashboard, Control API và Deployment Runner được giữ cho P0.2.
- Chỉ Gateway mở cổng trên máy phát triển; cổng ứng dụng không được công khai.
- Hai ứng dụng dùng Node.js không có thư viện ngoài để giảm phụ thuộc và tập trung vào kiến thức nền tảng.

### Nội dung có thể dùng cho báo cáo

- Chương 2: container, ảnh Docker, mạng cầu nối, DNS nội bộ, cổng mạng, Nginx và health check.
- Chương 3: phân tách lưu lượng ứng dụng với mạng điều khiển; ranh giới quyền; điểm lỗi đơn.
- Chương 4: cấu trúc Compose, quy trình build/up/smoke/down.
- Chương 5: kết quả T01/T02 sau khi chạy và lưu minh chứng.

### Quy tắc cập nhật

Chỉ chuyển nội dung từ “dự kiến” sang “đã triển khai” sau khi cấu hình được chạy và kiểm thử thành công. Số liệu trên macOS chỉ dùng cho phát triển, không trộn với kết quả đo chính thức trên VPS Linux.

### Kết quả kiểm chứng P0.1

- `docker compose config --quiet`: đạt.
- Gateway, App A và App B: đều đạt trạng thái `healthy`.
- Smoke test cấu hình App A v1: 9/9 kiểm tra đạt.
- Smoke test cấu hình App A v2: 9/9 kiểm tra đạt.
- Môi trường cuối cùng đã được đưa về App A v1.0.0.
- App A và App B không có ánh xạ cổng ra máy chủ.
- Gateway bind tại `127.0.0.1:8080`.
- Mạng `control` được xác nhận là mạng nội bộ.
- Các container chạy bằng người dùng không phải root, hệ thống tệp gốc chỉ đọc và drop toàn bộ Linux capability.

### Sự cố và cách xử lý

Trong lần chạy đầu, Gateway bị lặp khởi động vì tmpfs gắn tại `/tmp` che mất thư mục `/tmp/nginx` được tạo trong lúc build. Cấu hình Nginx được đổi sang dùng trực tiếp `/tmp/client_temp`, `/tmp/proxy_temp` và các thư mục tương tự. Sau khi rebuild, health check đạt.

Chi tiết dữ liệu thô nằm tại `evidence/T01/2026-10-11T0906/` và `evidence/T02/2026-10-11T0906/`. Đây là kết quả vòng phát triển trên macOS, chưa thay thế nghiệm thu chính thức trên VPS Linux sạch.
