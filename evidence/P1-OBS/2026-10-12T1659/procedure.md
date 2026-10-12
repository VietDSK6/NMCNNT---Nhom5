# Quy trình kiểm thử P1 Observability

## Mục tiêu

Kiểm chứng đường dữ liệu Docker stats → Runner exporter → Prometheus → Grafana và các ranh giới mạng/xác thực liên quan.

## Điều kiện trước

- `.env` có mật khẩu quản trị và Runner secret hợp lệ.
- App A và App B đang chạy phiên bản `v1.0.0`.
- Docker có thể tải hai image đã ghim của Prometheus và Grafana.

## Thao tác

1. Kiểm tra Compose, build Dashboard và chạy unit test Runner.
2. Dựng lại stack bằng `make up`.
3. Chạy `make test-p1-observability`.
4. Chạy toàn bộ `make test`.
5. Chạy lại `make test-p1-git` với commit tin cậy để kiểm tra hồi quy.
6. Truy vấn Prometheus API lấy mẫu info, CPU, RAM và health.
7. Ghi phiên bản môi trường, trạng thái service và digest image.

## Tiêu chí chấp nhận

- Runner xuất metric hữu hạn cho App A/App B; endpoint không nhận container ID từ request.
- Runner và Prometheus không publish cổng host.
- Prometheus ready, target Runner `up`, có nhiều mẫu theo thời gian, metric tài nguyên và nạp đủ ba rule.
- Grafana khỏe qua Gateway, từ chối API chưa xác thực, có datasource Prometheus và dashboard ít nhất sáu panel.
- Regression P0 và P1 Git deployment tiếp tục đạt.
