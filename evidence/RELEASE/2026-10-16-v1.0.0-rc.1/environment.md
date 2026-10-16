# Môi trường release candidate

- Phiên bản: `1.0.0-rc.1`.
- Commit runtime được kiểm thử: `37289d852a9e2078490e08528f925d0500781f96`.
- Ngày: `2026-10-16`.
- VPS: Debian GNU/Linux 12 (bookworm), kernel `6.1.0-53-cloud-amd64`, kiến trúc `x86_64`.
- Tài nguyên VPS: 2 vCPU, 4 GB RAM, 40 GB SSD.
- Docker Engine: `29.9.0`.
- Docker Compose: `5.6.0`.
- Node.js: `24.21.0`.
- Nginx: `1.28.3`.
- Prometheus: `3.14.0`.
- Grafana: `13.2.2`.
- k6: `2.3.0`, image ghim digest trong `Makefile`.
- cloudflared: `2026.10.0`, image ghim digest trong cấu hình VPS.
- Dashboard/Control API/Runner: `0.2.0`; dependency đầy đủ nằm trong `package-lock.json`.
- Public origin: `https://paas.ai2p.id.vn`.
- Web Service đã kiểm tra: `https://demo.ai2p.id.vn`, `https://vps-demo.ai2p.id.vn`.

Môi trường phát triển macOS cũng chạy `make test` thành công trước vòng nghiệm thu VPS. Số liệu chính thức của release lấy từ VPS Linux.
