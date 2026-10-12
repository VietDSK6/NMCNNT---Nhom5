# Quy trình kiểm thử

## Mục tiêu

Xác nhận Dashboard có URL riêng cho góc nhìn toàn hệ thống và từng ứng dụng, tải lại trực tiếp qua Gateway được và không làm hỏng các luồng vòng đời/quan sát đã có.

## Điều kiện trước

- File `.env` hợp lệ đã tồn tại và không được đưa vào evidence.
- Docker Engine hoạt động.
- App A và App B thuộc danh mục tin cậy.

## Các bước

1. Chạy typecheck và production build của Dashboard.
2. Dựng lại stack bằng Compose và chờ toàn bộ health check.
3. Gọi trực tiếp 10 URL Dashboard qua Gateway, kiểm tra HTTP 200 và `<div id="root"></div>`.
4. Chạy hồi quy thao tác vòng đời P0.2B; bảo đảm App A về v1 và App B đang chạy.
5. Chạy hồi quy log/tài nguyên P0.2C và observability P1.
6. Đọc trạng thái Compose để xác nhận tám service `healthy`.

Không chạy kiểm tra trình duyệt, chụp ảnh hoặc responsive theo quy tắc chung của dự án.
