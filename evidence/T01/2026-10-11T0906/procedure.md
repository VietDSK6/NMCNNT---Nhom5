# Quy trình T01 vòng phát triển

## Mục tiêu

Kiểm tra cấu hình Compose có hợp lệ, các ảnh có thể build và ba dịch vụ có thể đạt trạng thái `healthy` từ các lệnh đã ghi trong README.

## Các bước

1. Kiểm tra cú pháp `compose.yaml`.
2. Chạy `docker compose up --build --wait`.
3. Quan sát trạng thái bằng `docker compose ps`.
4. Chạy `./tests/smoke/p0_1.sh`.
5. Build App A v2, chạy lại smoke test, sau đó đưa môi trường về App A v1.
6. Đối chiếu giới hạn CPU/RAM/PID, hệ thống tệp chỉ đọc và capability của container.

## Điều kiện chấp nhận vòng phát triển

- Cả ba dịch vụ `healthy`.
- Smoke test đạt 9/9.
- App A có thể build và chạy ở v1.0.0 lẫn v2.0.0.
- Môi trường cuối cùng trở về v1.0.0.
