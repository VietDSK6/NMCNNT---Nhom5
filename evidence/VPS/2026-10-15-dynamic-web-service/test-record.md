# Bảng kiểm thử

| Mã | Đầu vào | Thao tác | Mong đợi | Thực tế | Kết quả | Bằng chứng |
|---|---|---|---|---|---|---|
| WS01 | Commit `2c8a4af` | Cập nhật VPS, build 4 thành phần, `compose up` | 8 service khỏe | 8/8 service khỏe | Đạt | `result.txt` |
| WS02 | Stack sau cập nhật | Chạy `make smoke` | 9/9 | 9/9 | Đạt | `result.txt` |
| WS03 | Repository allowlist, context `apps/app-a` | `POST /api/v1/services` tạo `vps-demo` | Trả 202 và deployment thành công | HTTP 202; deployment `succeeded` | Đạt | `result.txt` |
| WS04 | Container `vps-demo` | Kiểm tra giới hạn runtime | Không host port; có giới hạn CPU/RAM/PID và rootfs chỉ đọc | 0,35 CPU; 128 MiB; 100 PID; read-only | Đạt | `result.txt` |
| WS05 | `Host: vps-demo.ai2p.id.vn` | Gọi `/health` và `/version` qua Gateway loopback | Hai endpoint trả đúng service/version | Health `ok`, version `git-2c8a4af1ea22` | Đạt | `result.txt` |
| WS06 | Dịch vụ đang chạy | Gọi action restart, chờ hoàn tất | Operation thành công; dịch vụ khỏe lại | `succeeded`; `healthy/running` | Đạt | `result.txt` |
| WS07 | `https://vps-demo.ai2p.id.vn/health` | Gọi qua Internet | Phân giải wildcard và HTTP 200 | DNS chưa phân giải vì chưa tạo wildcard | Chưa đạt | `result.txt`; việc cấu hình ngoài VPS |
