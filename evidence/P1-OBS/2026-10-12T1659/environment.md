# Môi trường kiểm thử P1 Observability

- Thời gian thu thập: `2026-10-12T16:59:00+07:00`.
- Hệ điều hành: macOS 27.0, build 26A428, ARM64.
- Docker Engine: 29.4.0.
- Docker Compose: 5.1.2.
- Node.js: v24.12.0.
- npm: 11.6.2.
- Prometheus: 3.14.0, ghim manifest digest.
- Grafana: 13.2.2, ghim manifest digest.
- Môi trường container: OrbStack/Docker trên máy phát triển; chưa phải VPS Linux nghiệm thu.

Tại thời điểm thu thập, tám service `gateway`, `dashboard`, `control-api`, `runner`, `prometheus`, `grafana`, `app-a`, `app-b` đều ở trạng thái healthy. Chỉ Gateway bind `127.0.0.1:8080`; các service còn lại chỉ có cổng container.
