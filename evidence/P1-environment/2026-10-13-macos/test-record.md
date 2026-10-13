# Bản ghi kiểm thử P1 Environment Variables

| Trường | Nội dung |
|---|---|
| Thời gian | 13/10/2026, UTC+7 |
| Đầu vào | App A; `APP_MESSAGE` là biến thường; `DEMO_SECRET` là biến nhạy cảm giả |
| Thao tác | Đăng nhập; cấu hình biến; đọc API; kiểm tra container/app; cập nhật v1 → v2; xóa biến; đưa về v1 |
| Mong đợi | Biến được áp dụng; secret bị che; biến còn sau đổi image; audit không chứa secret; trạng thái cuối sạch |
| Thực tế | 21 kiểm tra tích hợp đạt; App A nhận đủ biến, giữ biến qua v2, xóa thành công và trở về v1 |
| Kết quả | Đạt |

## Sự cố phát hiện trong lần chạy đầu

Lần chạy đầu nhận HTTP 504 khi chờ tái tạo container vì Gateway dùng `proxy_read_timeout 5s`. Runner vẫn hoàn tất sau health check. Cấu hình Gateway đã được sửa để API được chờ tối đa 50 giây, sau đó chạy lại toàn bộ kịch bản và 21 kiểm tra đều đạt.

## Các điều kiện đã xác nhận

- GET cấu hình yêu cầu đăng nhập.
- `APP_VERSION` bị từ chối vì thuộc nền tảng quản lý.
- Phản hồi cập nhật và phản hồi đọc không chứa giá trị `DEMO_SECRET`.
- SQLite lưu ciphertext, không lưu plaintext trong bản ghi kiểm thử unit.
- Container nhận `APP_MESSAGE` và `DEMO_SECRET`; endpoint mẫu chỉ công khai việc secret tồn tại.
- Biến được bảo toàn sau cập nhật App A lên v2.0.0.
- Xóa danh sách biến làm cấu hình tùy chỉnh biến mất khỏi container.
- Audit ghi hành động và số lượng, không ghi giá trị.
- Sau kiểm thử App A chạy v1.0.0 và không còn biến tùy chỉnh.
