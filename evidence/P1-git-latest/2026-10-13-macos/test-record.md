# Bản ghi kiểm thử Deploy latest commit

| Trường | Nội dung |
|---|---|
| Thời gian | 13/10/2026 19:48, UTC+7 |
| Đầu vào | Source `github-app-a`; nhánh allowlist `main`; App A v1 khỏe |
| Thao tác | Đăng nhập; yêu cầu deploy latest; phân giải GitHub ref; build/deploy; kiểm tra API/app/image/release; khôi phục v1 |
| Mong đợi | SHA khớp `origin/main`; source lạ/truy cập trái phép bị từ chối; image và release truy vết đúng commit; trạng thái cuối sạch |
| Thực tế | 15 kiểm tra đạt; SHA `d6297422c3363b1aa728c1df3b88200b8bc0fdf8`; App A chạy bản Git rồi trở về v1 |
| Kết quả | Đạt vòng phát triển |

## Điều kiện đã xác nhận

- Dashboard/API không nhận tên nhánh tùy ý; `main` nằm trong source catalog.
- Endpoint latest yêu cầu phiên đăng nhập và chỉ nhận `sourceId` allowlist.
- Runner phân giải HEAD thành SHA đầy đủ trước khi tạo deployment.
- Docker image có nhãn OCI revision trùng SHA đã phân giải.
- Release lưu đúng commit và App A phản hồi đúng phiên bản `git-<12 ký tự>`.
- App A được đưa về `v1.0.0` sau kiểm thử.

## Giới hạn

Đây là kết quả trên macOS/OrbStack với GitHub repository công khai. Chưa nghiệm thu trên VPS Linux và chưa cấu hình GitHub App/token để tăng giới hạn API. Webhook/auto-deploy không thuộc lát cắt này.
