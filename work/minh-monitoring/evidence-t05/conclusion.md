# Kết luận kiểm thử T05 & OBS-02 (Ngày 16/11/2026)

- **T05 (`p1_observability.sh`):** **Đạt 15/15 bước** — Runner xuất `/metrics` hữu hạn không chứa `NaN`/`Infinity`, `runner` và `prometheus` không mở cổng ra host, Prometheus sẵn sàng truy vấn, lưu chuỗi thời gian 30s cho App A/B, nạp đủ 3 rules, Grafana yêu cầu xác thực (`401`) và cấp sẵn datasource + dashboard 6 bảng.
- **OBS-02 (`verify-observability-rules.mjs`):** **Đạt** — Target `mini-paas-runner` UP (`scrapeInterval=5s`), cả 3 rule (`MiniPaasApplicationNotHealthy` `30s`, `MiniPaasApplicationMemoryHigh` `120s`, `MiniPaasRunnerScrapeFailed` `30s`) đều `health=ok` và `state=inactive`; toàn bộ 9 nhóm metric cho `app-a` và `app-b` đều trả giá trị thực hữu hạn.
- **Kịch bản sự cố giả lập (`test-alert-app-a-stop.sh`):** **Đạt** — Khi dừng `app-a` lúc `07:41:36Z`, Prometheus ghi nhận `mini_paas_app_healthy=0` lúc `07:41:44Z`, sau ngưỡng `for: 30s` chuyển sang **`FIRING`** lúc `07:42:17Z`; sau khi bật lại `app-a`, container phục hồi `healthy=1` và rule tự quay về **`inactive`** lúc `07:42:31Z`.

## Giới hạn ghi nhận

- Do hệ thống chưa cấu hình `Alertmanager`, cảnh báo dừng ở trạng thái `firing` trên Prometheus API/UI mà chưa gửi thông báo ra email/chat.
- Lần chạy này thực hiện trên môi trường phát triển cá nhân (Windows + Docker Desktop); số liệu hiệu năng nghiệm thu chính thức vẫn lấy từ VPS Debian 12 trong `evidence/T06/2026-10-14-vps-linux/`.
