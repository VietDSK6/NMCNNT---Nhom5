# Biên bản kiểm thử P1-OBS-01

| Trường | Nội dung |
|---|---|
| Thời gian | 12/10/2026 16:59 +07 |
| Đầu vào/điều kiện | App A/B v1.0.0 đang khỏe; cấu hình Prometheus/Grafana trong Git; `.env` hợp lệ |
| Thao tác | Dựng stack, gọi exporter, truy vấn Prometheus, kiểm tra Grafana API/provisioning và chạy regression |
| Kết quả mong đợi | Hai app có chuỗi metric; target/rule/datasource/dashboard đúng; cổng nội bộ không publish; regression không lỗi |
| Kết quả thực tế | P1 observability 15/15 đạt; có nhiều mẫu trong cửa sổ 30 giây; tám service healthy; Runner unit 16/16; toàn bộ regression và P1 Git 10/10 đạt |
| Kết luận | Đạt vòng phát triển |
| Người thực hiện | Chưa gán tên thành viên; phải bổ sung trước khi nộp |
| Bằng chứng | `result.txt`, `metrics-sample.json`, `image-digests.json`, `environment.md`, mã test và cấu hình trong repository |

Không thực hiện kiểm tra responsive, trình duyệt hoặc chụp ảnh giao diện theo quy tắc dự án.
