# Kết luận P1 Observability

Mốc giám sát chuỗi thời gian đạt vòng phát triển. Runner chỉ xuất metric của hai ứng dụng trong allowlist; Prometheus thu thập thành công và Grafana được cấp sẵn datasource/dashboard. Không có cổng mới được publish ngoài Gateway.

Lỗi thực tế đã xử lý: Grafana 13.2.2 không khởi động ổn định với giới hạn 100 PID trên môi trường hiện tại. Log cho thấy lỗi tạo tiến trình/namespace trong giai đoạn khởi tạo; giới hạn được nâng lên 300 PID và RAM 384 MiB. Sau khi tạo lại container, Grafana đạt health check và bộ test 15/15 đạt.

Giới hạn: số liệu trong `metrics-sample.json` được lấy khi hệ thống gần như nhàn rỗi trên macOS/OrbStack, chỉ chứng minh đường thu thập hoạt động. Không dùng mẫu này để kết luận hiệu năng. T06 phải tạo tải k6 có điều kiện rõ ràng, lưu dữ liệu gốc và chạy lại trên VPS Linux.
