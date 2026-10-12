# ADR 0007 — Runner xuất metric ứng dụng cho Prometheus

- Trạng thái: Chấp nhận
- Ngày: 12/10/2026

## Bối cảnh

P0.2C đã lấy Docker stats của App A/App B theo yêu cầu nhưng không lưu lịch sử. P1 cần chuỗi thời gian và đồ thị. Phương án ban đầu trong kế hoạch là cAdvisor + Prometheus + Grafana; tuy nhiên cAdvisor cần quan sát rộng host/container và thường cần thêm mount hoặc quyền nhạy cảm.

## Quyết định

1. Tái sử dụng Deployment Runner làm exporter cho đúng App A/App B trong catalog.
2. Cung cấp `GET /metrics` theo định dạng Prometheus trong mạng `control`; không publish cổng host.
3. Endpoint metric chỉ đọc, không nhận app/container ID và không dùng Runner shared secret. Các endpoint điều khiển vẫn giữ xác thực cũ.
4. Prometheus scrape mỗi 5 giây, giữ tối đa 7 ngày và 256 MiB.
5. Grafana được provisioning datasource/dashboard từ repository và chỉ được truy cập qua Gateway tại `/monitoring/`.
6. Không thêm cAdvisor ở mốc này.

## Hệ quả tích cực

- Không phát sinh thêm container có Docker socket hoặc mount filesystem host.
- Metric đúng allowlist, ít series và dễ giải thích.
- Công thức stats đã có unit test được dùng thống nhất cho API snapshot và Prometheus.
- Cấu hình chạy được trên macOS/OrbStack và có đường chuyển sang Linux.

## Hệ quả và giới hạn

- Runner trở thành điểm phụ thuộc của cả control plane và metric ứng dụng.
- Chưa có metric toàn host hoặc các service nền tảng.
- Không thay thế được cAdvisor/node_exporter trong hệ thống lớn.
- Endpoint metric tin cậy tính cô lập của mạng `control`; không được publish ra Internet.
- Quy tắc alert chưa gửi thông báo vì chưa có Alertmanager.

## Phương án bị loại

- **cAdvisor ngay trong P1:** phạm vi quan sát rộng hơn cần thiết, thêm quyền/mount nhạy cảm và tăng sai khác giữa môi trường Mac với Linux.
- **Lưu mẫu vào SQLite:** không phù hợp truy vấn chuỗi thời gian và làm trộn dữ liệu nghiệp vụ với dữ liệu giám sát.
- **Chỉ giữ snapshot P0.2C:** không đáp ứng yêu cầu quan sát xu hướng và đối chiếu với dữ liệu kiểm thử tải.
